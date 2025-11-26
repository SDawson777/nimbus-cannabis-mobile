// src/screens/EditProfileScreen.tsx
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useContext, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';

import { useUpdateUserProfile } from '../api/hooks/useUpdateUserProfile';
import { ThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight, hapticMedium } from '../utils/haptic';
import { toast } from '../utils/toast';

import { profileSchema, ProfileFormValues } from './account/profileSchema';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type EditProfileNavProp = NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;
type EditProfileRouteProp = RouteProp<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileNavProp>();
  const route = useRoute<EditProfileRouteProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);

  const profile = route.params?.profile ?? {};
  const { control, handleSubmit } = useForm<ProfileFormValues>({
    resolver: yupResolver(profileSchema as any),
    defaultValues: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
    },
  });
  const updateProfile = useUpdateUserProfile();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

  const glowStyle =
    colorTemp === 'warm'
      ? {
          shadowColor: brandPrimary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }
      : colorTemp === 'cool'
        ? {
            shadowColor: '#00A4FF',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }
        : {};

  const handleBack = () => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.goBack();
  };

  const onSave = async (_values: ProfileFormValues) => {
    hapticMedium();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    try {
      setLoading(true);
      await updateProfile.mutateAsync(_values);
      toast('Profile updated');
      navigation.goBack();
    } catch (e: any) {
      toast(e.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable onPress={handleBack} style={styles.iconBtn}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Edit Profile</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.form}>
        {[
          { name: 'name', placeholder: 'Full Name', keyboard: 'default' },
          { name: 'email', placeholder: 'Email Address', keyboard: 'email-address' },
          { name: 'phone', placeholder: 'Phone Number', keyboard: 'phone-pad' },
        ].map(({ name, placeholder, keyboard }) => (
          <View key={name}>
            <Text style={[styles.label, { color: brandSecondary }]}>{placeholder}</Text>
            <Controller
              control={control}
              name={name as keyof ProfileFormValues}
              render={({
                field: { onChange, onBlur, value },
                fieldState: { error },
              }: {
                field: { onChange: (value: string) => void; onBlur: () => void; value: string };
                fieldState: { error?: { message: string } };
              }) => (
                <>
                  <TextInput
                    style={[styles.input, { borderColor: brandSecondary, color: brandPrimary }]}
                    placeholder={placeholder}
                    placeholderTextColor={brandSecondary}
                    keyboardType={keyboard as any}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(t: string) => {
                      hapticLight();
                      onChange(t);
                    }}
                    accessibilityLabel={placeholder}
                    accessibilityHint={`Enter ${placeholder.toLowerCase()}`}
                  />
                  {error && <Text style={styles.error}>{error.message}</Text>}
                </>
              )}
            />
          </View>
        ))}

        <Pressable
          style={[styles.saveBtn, { backgroundColor: brandPrimary }, glowStyle]}
          onPress={handleSubmit(onSave as any)}
          accessibilityLabel="Save profile"
          accessibilityHint="Saves profile information"
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveText}>Save Profile</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 24, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  form: { padding: 16 },
  label: {
    fontSize: 14,
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  saveBtn: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: 'red',
    marginTop: 4,
  },
});
