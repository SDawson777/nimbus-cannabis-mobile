// src/screens/NotificationSettingsScreen.tsx
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Switch,
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

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

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
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.row, { borderBottomColor: brandSecondary }]}>
          <Text style={[styles.label, { color: brandPrimary }]}>Email Notifications</Text>
          <Switch
            value={emailNotifications}
            onValueChange={v => toggle(setEmailNotifications, v)}
            trackColor={{ true: brandPrimary, false: '#EEEEEE' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.row, { borderBottomColor: brandSecondary }]}>
          <Text style={[styles.label, { color: brandPrimary }]}>SMS Notifications</Text>
          <Switch
            value={smsNotifications}
            onValueChange={v => toggle(setSmsNotifications, v)}
            trackColor={{ true: brandPrimary, false: '#EEEEEE' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={[styles.label, { color: brandPrimary }]}>Push Notifications</Text>
          <Switch
            value={pushNotifications}
            onValueChange={v => toggle(setPushNotifications, v)}
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
