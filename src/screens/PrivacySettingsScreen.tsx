// src/screens/PrivacySettingsScreen.tsx
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Switch,
  ScrollView,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';

import { ThemeContext } from '../context/ThemeContext';
import { hapticLight } from '../utils/haptic';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PrivacySettingsScreen() {
  const navigation = useNavigation();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);

  const [analytics, setAnalytics] = useState(true);
  const [personalization, setPersonalization] = useState(true);
  const [ads, setAds] = useState(false);

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

  const toggle = (setter: React.Dispatch<React.SetStateAction<boolean>>, val: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter(val);
    hapticLight();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable onPress={handleBack}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Privacy Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.row, { borderBottomColor: brandSecondary }]}>
          <Text style={[styles.label, { color: brandPrimary }]}>Analytics Sharing</Text>
          <Switch
            value={analytics}
            onValueChange={v => toggle(setAnalytics, v)}
            trackColor={{ true: brandPrimary, false: '#EEEEEE' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.row, { borderBottomColor: brandSecondary }]}>
          <Text style={[styles.label, { color: brandPrimary }]}>Personalization</Text>
          <Switch
            value={personalization}
            onValueChange={v => toggle(setPersonalization, v)}
            trackColor={{ true: brandPrimary, false: '#EEEEEE' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={[styles.label, { color: brandPrimary }]}>Targeted Ads</Text>
          <Switch
            value={ads}
            onValueChange={v => toggle(setAds, v)}
            trackColor={{ true: brandPrimary, false: '#EEEEEE' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ScrollView>
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
  headerTitle: { fontSize: 20, fontWeight: '600' },
  content: { padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: { fontSize: 16 },
});
