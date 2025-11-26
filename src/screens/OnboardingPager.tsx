import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AccessibilityInfo } from 'react-native';
import PagerView from 'react-native-pager-view';

import AnimatedBackgroundGradient from '../components/AnimatedBackgroundGradient';
import AudioPlayer from '../components/AudioPlayer';
import OnboardingSlide from '../components/OnboardingSlide';
import PaginationDots from '../components/PaginationDots';
import haptics from '../lib/haptics';
import type { RootStackParamList } from '../navigation/types';

const slides = [
  {
    headline: 'Personalized',
    benefitText: 'Curated products just for you',
  },
  {
    headline: 'Convenient',
    benefitText: 'Easy shopping experience',
  },
  {
    headline: 'Best Value',
    benefitText: 'Great deals every day',
  },
  {
    headline: 'Safe & Seamless Access',
    benefitText: 'Log in securely with Face ID, Touch ID, or a PIN – your privacy, protected.',
    illustration: require('../../assets/illustrations/illustration-biometrics-secure.svg'),
  },
];

export default function OnboardingPager() {
  const [index, setIndex] = useState(0);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  React.useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(enabled => {
      if (enabled) Speech.speak('Welcome to Nimbus');
    });
  }, []);

  return (
    <AnimatedBackgroundGradient>
      <PagerView
        style={styles.pager}
        onPageSelected={(e: any) => {
          haptics.impactLight();
          setIndex(e.nativeEvent.position);
        }}
      >
        {slides.map((s, i) => (
          <View key={i} style={styles.page}>
            <OnboardingSlide
              headline={s.headline}
              benefitText={s.benefitText}
              illustration={s.illustration}
              isActive={i === index}
            />
            {i === slides.length - 1 && (
              <Pressable
                accessibilityRole="button"
                style={styles.button}
                onPress={() => {
                  haptics.impactMedium();
                  navigation.replace('AgeVerification');
                }}
              >
                <Text style={styles.btnText}>Get Started</Text>
              </Pressable>
            )}
          </View>
        ))}
      </PagerView>
      <PaginationDots current={index} total={slides.length} />
      <AudioPlayer
        audioKey="onboarding_ambient"
        source={require('../../assets/audio/onboarding_ambient_loop.mp3')}
        play={true}
        loop={true}
      />
    </AnimatedBackgroundGradient>
  );
}

const styles = StyleSheet.create({
  pager: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  button: { backgroundColor: '#2E5D46', padding: 12, borderRadius: 8, marginTop: 24 },
  btnText: { color: '#fff', fontWeight: '600' },
});
