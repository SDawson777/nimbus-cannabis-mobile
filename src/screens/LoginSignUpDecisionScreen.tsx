import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useContext } from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import AnimatedPulseGlow from '../components/AnimatedPulseGlow';
import Button from '../components/Button';
import { ThemeContext } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { hapticMedium } from '../utils/haptic';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'LoginSignUpDecision'>;

export default function LoginSignUpDecisionScreen() {
  const navigation = useNavigation<NavProp>();
  const { brandPrimary, brandBackground } = useContext(ThemeContext);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandBackground }]}>
      <Animated.View entering={FadeInUp.duration(400)} style={styles.inner}>
        <Text style={[styles.title, { color: brandPrimary }]}>Welcome</Text>
        <Button
          title="Login"
          onPress={() => {
            hapticMedium();
            navigation.navigate('Login');
          }}
          style={[styles.btn, { backgroundColor: brandPrimary }]}
        />
        <Button
          title="Create Account"
          onPress={() => {
            hapticMedium();
            navigation.navigate('SignUp');
          }}
          style={[styles.btn, { backgroundColor: brandPrimary }]}
        />
        <Button
          title="Browse as Guest"
          onPress={() => {
            hapticMedium();
            navigation.replace('HomeScreen');
          }}
          style={[styles.btn, { backgroundColor: brandPrimary }]}
        />
        <AnimatedPulseGlow />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner: { width: '80%', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  btn: { alignSelf: 'stretch', marginBottom: 12 },
});
