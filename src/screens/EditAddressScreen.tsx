// src/screens/EditAddressScreen.tsx
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
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

import { phase4Client, AddressShape } from '../api/phase4Client';
import { clientPut } from '../api/http';
import { ThemeContext } from '../context/ThemeContext';
import { hapticLight, hapticMedium } from '../utils/haptic';
import { toast } from '../utils/toast';

import { addressSchema, AddressFormValues } from './account/addressSchema';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function EditAddressScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);

  // Existing address passed via params
  const addr = (route.params as any)?.address || {};
  // Address object is expected to already use `state`.
  const normalizedAddr = addr;
  const { control, handleSubmit } = useForm<AddressFormValues>({
    // cast to any to avoid missing type declarations if @types/react-hook-form not installed
    resolver: yupResolver(addressSchema) as any,
    defaultValues: {
      fullName: normalizedAddr.fullName,
      phone: normalizedAddr.phone,
      line1: normalizedAddr.line1,
      city: normalizedAddr.city,
      state: normalizedAddr.state,
      zipCode: normalizedAddr.zipCode,
      country: normalizedAddr.country || 'US',
    },
  });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

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
      const data = await clientPut<Partial<AddressShape>, AddressShape>(
        phase4Client,
        `/addresses/${addr.id}`,
        _values as any
      );
      if (data && (data as any).error) throw new Error((data as any).error);
      toast('Address saved');
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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable onPress={handleBack} style={styles.iconBtn}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Edit Address</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Form */}
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
            <Text style={[styles.label, { color: brandPrimary }]}>{placeholder}</Text>
            <Controller
              control={control}
              name={name as keyof AddressFormValues}
              render={({
                field,
                fieldState,
              }: {
                field: { onChange: (value: string) => void; onBlur: () => void; value: string };
                fieldState: { error?: { message?: string } };
              }) => {
                const { onChange, onBlur, value } = field; // keeps type inference intact
                const { error } = fieldState;
                return (
                  <>
                    <TextInput
                      style={[styles.input, { borderColor: brandSecondary }]}
                      value={(value ?? '') as string}
                      onBlur={onBlur}
                      onChangeText={t => {
                        hapticLight();
                        onChange(t);
                      }}
                      placeholder={placeholder}
                      placeholderTextColor={brandSecondary}
                      keyboardType={keyboard as any}
                      accessibilityLabel={placeholder}
                      accessibilityHint={`Enter ${placeholder.toLowerCase()}`}
                    />
                    {error && <Text style={styles.error}>{error.message}</Text>}
                  </>
                );
              }}
            />
          </View>
        ))}

        <Pressable
          style={[styles.saveBtn, { backgroundColor: brandPrimary }]}
          onPress={handleSubmit(onSave)}
          accessibilityLabel="Save address"
          accessibilityHint="Saves this address"
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  saveBtn: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: 'red',
    marginTop: 4,
  },
});
