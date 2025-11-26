import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useContext, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet } from 'react-native';

import LegalDisclaimerModal from '../../components/LegalDisclaimerModal';
import { ThemeContext } from '../../context/ThemeContext';
import type { RootStackParamList } from '../../navigation/types';
import { hapticLight } from '../../utils/haptic';

interface NavProp extends NativeStackNavigationProp<RootStackParamList, 'AgeVerification'> {}

export default function AgeVerificationScreen() {
  const navigation = useNavigation<NavProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('ageVerified')
      .then(val => {
        if (val === 'true') {
          navigation.replace('LoginSignUpDecision');
        }
      })
      .catch(() => {
        // Silently handle AsyncStorage errors - assume not verified
      });
  }, [navigation]);

  const handleConfirm = async () => {
    try {
      await AsyncStorage.setItem('ageVerified', 'true');
    } catch {
      // Silently handle AsyncStorage errors - still proceed with navigation
    }
    hapticLight();
    navigation.replace('LoginSignUpDecision');
  };

  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: brandPrimary }]}>21+ Only</Text>
        <Text style={[styles.subtitle, { color: brandSecondary }]}>
          You must be at least 21 years old to use this app.
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: brandPrimary }]}
          accessibilityRole="button"
          onPress={handleConfirm}
        >
          <Text style={styles.buttonText}>I am 21 or older</Text>
        </Pressable>
        <Pressable onPress={() => setShowDisclaimer(true)}>
          <Text style={[styles.link, { color: brandPrimary }]}>View Disclaimer</Text>
        </Pressable>
      </View>
      <LegalDisclaimerModal visible={showDisclaimer} onClose={() => setShowDisclaimer(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  content: { alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 12 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  button: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, marginBottom: 16 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  link: { textDecorationLine: 'underline', marginTop: 8 },
});
