// src/screens/AddAddressScreen.tsx
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState, useContext, useEffect } from 'react';
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

import { phase4Client, AddressShape } from '../api/phase4Client';
import { clientPost } from '../api/http';
import { ThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight, hapticMedium } from '../utils/haptic';
import { toast } from '../utils/toast';

import { addressSchema, AddressFormValues } from './account/addressSchema';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AddAddressNavProp = NativeStackNavigationProp<RootStackParamList, 'AddAddress'>;

export default function AddAddressScreen() {
  const navigation = useNavigation<AddAddressNavProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);

  const { control, handleSubmit } = useForm<AddressFormValues>({
    resolver: yupResolver(addressSchema) as any,
  });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

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

  const onSave = async (_values: AddressFormValues) => {
    hapticMedium();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    try {
      setLoading(true);
      // map form _values straight through - names match server schema
      const data = await clientPost<AddressFormValues, AddressShape>(
        phase4Client,
        '/addresses',
        _values
      );
      // surface server error body if present (server sometimes returns { error })
      if (data && (data as any).error) {
        throw new Error((data as any).error);
      }
      toast('Address saved');
      // invalidate addresses list so saved screen refreshes
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      navigation.goBack();
    } catch (e: any) {
      toast(e.message || 'Failed to save address');
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
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Add Address</Text>
        <View style={styles.iconBtn} />
      </View>
      <View style={styles.form}>
        {[
          { name: 'fullName', placeholder: 'Full name' },
          { name: 'phone', placeholder: 'Phone' },
          { name: 'line1', placeholder: 'Street Address' },
          { name: 'city', placeholder: 'City' },
          { name: 'state', placeholder: 'State' },
          { name: 'zipCode', placeholder: 'ZIP Code', keyboard: 'numeric' },
          { name: 'country', placeholder: 'Country' },
        ].map(({ name, placeholder, keyboard }) => (
          <View key={name}>
            <Text style={[styles.label, { color: brandSecondary }]}>{placeholder}</Text>
            <Controller
              control={control}
              name={name as keyof AddressFormValues}
              render={({
                field: { onChange, onBlur, value },
                fieldState: { error },
              }: {
                field: {
                  onChange: (value: string) => void;
                  onBlur: () => void;
                  value: string;
                };
                fieldState: {
                  error?: { message?: string };
                };
              }) => (
                <>
                  <TextInput
                    style={[styles.input, { borderColor: brandSecondary, color: brandPrimary }]}
                    placeholder={placeholder}
                    placeholderTextColor={brandSecondary}
                    keyboardType={keyboard as any}
                    accessibilityLabel={placeholder}
                    accessibilityHint={`Enter ${placeholder.toLowerCase()}`}
                    value={(value ?? '') as string}
                    onBlur={onBlur}
                    onChangeText={text => {
                      hapticLight();
                      onChange(text);
                    }}
                  />
                  {error && <Text style={styles.error}>{error.message}</Text>}
                </>
              )}
            />
          </View>
        ))}

        <Pressable
          style={[styles.saveBtn, { backgroundColor: brandPrimary }, glowStyle]}
          onPress={handleSubmit(onSave)}
          accessibilityLabel="Save address"
          accessibilityHint="Saves this address"
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveText}>Save Address</Text>
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
