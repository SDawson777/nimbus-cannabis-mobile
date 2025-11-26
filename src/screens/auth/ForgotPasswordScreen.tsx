import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useContext } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { SafeAreaView, View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';

import { requestPasswordReset } from '../../clients/authClient';
import { ThemeContext } from '../../context/ThemeContext';
import type { RootStackParamList } from '../../navigation/types';
import { toast } from '../../utils/toast';

import { forgotPasswordSchema } from './forgotPasswordSchema';

type ForgotPasswordFormData = { email: string };

type ForgotPasswordNavProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordNavProp>();
  const { brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);

  const form = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
    mode: 'onChange',
  });

  const { control, handleSubmit } = form;
  const { errors, isValid, isSubmitting } = (form as any).formState;

  const onSubmit = async ({ email }: ForgotPasswordFormData) => {
    try {
      await requestPasswordReset(email);
      toast('Check your email for reset instructions.');
      navigation.goBack();
    } catch {
      toast('Unable to send reset email. Please try again.');
    }
  };

  return (
    <SafeAreaView
      className="flex-1 p-4"
      style={{ backgroundColor: brandBackground }}
      accessibilityViewIsModal
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityHint="Return to the previous screen"
        onPress={() => navigation.goBack()}
        className="mb-6 w-20"
      >
        <Text style={{ color: brandPrimary }}>{'<'} Back</Text>
      </Pressable>
      <View className="flex-1">
        <Controller
          control={control}
          name="email"
          render={({
            field: { onChange, onBlur, value },
          }: {
            field: { onChange: (value: string) => void; onBlur: () => void; value: string };
          }) => (
            <TextInput
              className="border rounded-lg p-3 mb-2"
              style={{
                borderColor: errors.email ? 'red' : brandSecondary,
                color: brandPrimary,
                backgroundColor: '#FFF',
              }}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              accessibilityLabel="Email address"
              accessibilityHint="Enter the email associated with your account"
            />
          )}
        />
        {errors.email && <Text className="text-red-500 mb-4">{errors.email.message}</Text>}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send reset link"
          accessibilityHint="Sends a password reset email"
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || isSubmitting}
          className={`rounded-lg py-3 items-center ${isValid ? '' : 'opacity-50'}`}
          style={{ backgroundColor: brandPrimary }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Send Reset Link</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
