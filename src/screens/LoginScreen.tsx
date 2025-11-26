// src/screens/LoginScreen.tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState, useContext, useEffect } from 'react';
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

import AnimatedShimmerOverlay from '../components/AnimatedShimmerOverlay';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/types';
import { logEvent } from '../utils/analytics';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptic';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type LoginNavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginNavProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

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

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      hapticLight();
      return;
    }
    try {
      setLoading(true);
      setError(null);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      await signIn(email, password);
      logEvent('login_success', {});
      hapticMedium();
      navigation.replace('HomeScreen');
    } catch (err: any) {
      logEvent('login_failure', { message: err.message });
      hapticHeavy();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go Back"
          onPress={() => {
            hapticLight();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            navigation.goBack();
          }}
          style={({ pressed }) => pressed && { transform: [{ scale: 0.95 }] }}
        >
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.title, { color: brandPrimary }]}>Log In</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
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
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused(null)}
          accessibilityLabel="Email"
          accessibilityRole="text"
          accessibilityHint="Enter your email address"
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
            accessibilityHint="Enter your password"
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
            accessibilityRole="button"
            accessibilityLabel="Toggle password visibility"
          >
            {showPassword ? (
              <EyeOff color={brandSecondary} size={20} />
            ) : (
              <Eye color={brandSecondary} size={20} />
            )}
          </Pressable>
          <AnimatedShimmerOverlay />
        </View>
        {error && <Text style={[styles.error, { color: 'red' }]}>{error}</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forgot your password"
          accessibilityHint="Navigates to password recovery"
          onPress={() => {
            hapticLight();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            navigation.push('ForgotPassword');
          }}
          style={({ pressed }) => pressed && { transform: [{ scale: 0.95 }] }}
        >
          <Text style={[styles.link, { color: brandPrimary }]}>Forgot your password?</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log In"
          accessibilityHint="Submits your credentials"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: brandPrimary },
            glowStyle,
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text allowFontScaling style={styles.buttonText}>
              Log In
            </Text>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={[styles.disclaimer, { color: brandSecondary }]}>
            By logging in you agree to our
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  title: { fontSize: 24, fontWeight: '700' },
  form: { flex: 1 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { padding: 8 },
  link: { textAlign: 'right', marginBottom: 24, fontWeight: '500' },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  error: { marginBottom: 12, textAlign: 'center' },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  disclaimer: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
  linkText: { fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
  legalRow: { flexDirection: 'row', alignItems: 'center' },
});
