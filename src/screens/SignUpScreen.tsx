// src/screens/SignUpScreen.tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';

import PasswordStrengthBar from '../components/PasswordStrengthBar';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import logger from '../lib/logger';
import type { RootStackParamList } from '../navigation/types';
import { logEvent } from '../utils/analytics';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptic';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SignUpNavProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

export default function SignUpScreen() {
  const navigation = useNavigation<SignUpNavProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  // Background based on time/weather
  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

  // Glow effect for the sign-up button
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

  const handleSignUp = async () => {
    if (!email || !password || password !== confirm) {
      hapticLight();
      return;
    }
    try {
      await signUp({ name, email, phone, password });
      logEvent('signup_success', {});
      hapticMedium();
      navigation.navigate('OTPScreen');
    } catch (err: any) {
      hapticHeavy();
      logger.warn('Sign up failed', { error: err });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.title, { color: brandPrimary }]}>Create Account</Text>

      <TextInput
        style={[
          styles.input,
          {
            borderColor: focused === 'name' ? brandPrimary : brandSecondary,
            color: brandPrimary,
          },
        ]}
        placeholder="Full Name"
        placeholderTextColor="#9CA3AF"
        value={name}
        onChangeText={setName}
        onFocus={() => setFocused('name')}
        onBlur={() => setFocused(null)}
        accessibilityLabel="Full Name"
        accessibilityRole="text"
      />

      <TextInput
        style={[
          styles.input,
          {
            borderColor: focused === 'email' ? brandPrimary : brandSecondary,
            color: brandPrimary,
          },
        ]}
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onFocus={() => setFocused('email')}
        onBlur={() => setFocused(null)}
        accessibilityLabel="Email"
        accessibilityRole="text"
      />

      <TextInput
        style={[
          styles.input,
          {
            borderColor: focused === 'phone' ? brandPrimary : brandSecondary,
            color: brandPrimary,
          },
        ]}
        placeholder="Phone"
        placeholderTextColor="#9CA3AF"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        onFocus={() => setFocused('phone')}
        onBlur={() => setFocused(null)}
        accessibilityLabel="Phone"
      />

      <View style={styles.passwordRow}>
        <TextInput
          style={[
            styles.input,
            {
              flex: 1,
              borderColor: focused === 'password' ? brandPrimary : brandSecondary,
              color: brandPrimary,
            },
          ]}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          onFocus={() => setFocused('password')}
          onBlur={() => setFocused(null)}
          accessibilityLabel="Password"
          accessibilityRole="text"
        />
        <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
          {showPassword ? (
            <EyeOff color={brandSecondary} size={20} />
          ) : (
            <Eye color={brandSecondary} size={20} />
          )}
        </Pressable>
      </View>
      <PasswordStrengthBar password={password} />

      <View style={styles.passwordRow}>
        <TextInput
          style={[
            styles.input,
            {
              flex: 1,
              borderColor: focused === 'confirm' ? brandPrimary : brandSecondary,
              color: brandPrimary,
            },
          ]}
          placeholder="Confirm Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showPassword}
          value={confirm}
          onChangeText={setConfirm}
          onFocus={() => setFocused('confirm')}
          onBlur={() => setFocused(null)}
          accessibilityLabel="Confirm Password"
          accessibilityRole="text"
        />
        <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
          {showPassword ? (
            <EyeOff color={brandSecondary} size={20} />
          ) : (
            <Eye color={brandSecondary} size={20} />
          )}
        </Pressable>
      </View>

      <Pressable style={styles.checkboxRow} onPress={() => setOptIn(!optIn)}>
        <View style={[styles.checkbox, optIn && { backgroundColor: brandPrimary }]} />
        <Text style={[styles.optText, { color: brandPrimary }]}>Email me about deals</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign Up"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: brandPrimary },
          glowStyle,
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
        onPress={handleSignUp}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
      </Pressable>

      <View style={styles.policy}>
        <Text style={[styles.disclaimer, { color: brandSecondary }]}>
          By creating an account you agree to our
        </Text>
        <View style={styles.legalRow}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Terms and Conditions"
            onPress={() => {
              hapticLight();
              navigation.navigate('Legal');
            }}
          >
            <Text style={[styles.linkText, { color: brandPrimary }]}>Terms &amp; Conditions</Text>
          </Pressable>
          <Text style={[styles.disclaimer, { color: brandSecondary }]}> and </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
            onPress={() => {
              hapticLight();
              navigation.navigate('Legal');
            }}
          >
            <Text style={[styles.linkText, { color: brandPrimary }]}>Privacy Policy</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: brandSecondary }]}>Already have an account?</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log In"
          onPress={() => {
            hapticLight();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            navigation.replace('Login');
          }}
          style={({ pressed }) => pressed && { transform: [{ scale: 0.95 }] }}
        >
          <Text style={[styles.linkText, { color: brandPrimary }]}>Log In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { padding: 8 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    marginRight: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
  },
  optText: { fontSize: 14 },
  policy: {
    alignItems: 'center',
    marginTop: 16,
  },
  legalRow: { flexDirection: 'row', alignItems: 'center' },
  disclaimer: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
});
