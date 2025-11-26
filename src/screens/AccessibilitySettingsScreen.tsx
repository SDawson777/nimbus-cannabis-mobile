// src/screens/AccessibilitySettingsScreen.tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import React, { useContext, useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Switch,
  Pressable,
  ActivityIndicator,
  Button,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';

import { getPrefs, updatePrefs } from '../api/phase4Client';
import { ThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight } from '../utils/haptic';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AccessibilityPrefs = {
  reducedMotion: boolean;
  dyslexiaFont: boolean;
  highContrast: boolean;
  personalization: boolean;
};

type AccessibilityNavProp = NativeStackNavigationProp<RootStackParamList, 'AccessibilitySettings'>;

export default function AccessibilitySettingsScreen() {
  const navigation = useNavigation<AccessibilityNavProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);
  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

  const [prefs, setPrefs] = useState<AccessibilityPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await getPrefs();
        setPrefs(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    })();
  }, []);

  // Save preferences
  const handleSave = async () => {
    if (!prefs) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await updatePrefs(prefs);
      setPrefs(updated);
      hapticLight();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle a pref, ensure prefs is non-null
  const handleToggle = (key: keyof AccessibilityPrefs) => {
    if (!prefs) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const handleBack = () => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.goBack();
  };

  // Loading and error states
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: brandPrimary }]}>Error: {error}</Text>
          <Button
            title="Retry"
            onPress={() => {
              setLoading(true);
              setError(null);
              getPrefs()
                .then(setPrefs)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
            }}
            color={brandPrimary}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Now prefs is guaranteed non-null
  if (!prefs) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable onPress={handleBack}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Accessibility Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: brandPrimary }]}>Dyslexia-friendly Font</Text>
          <Switch
            value={prefs.dyslexiaFont}
            onValueChange={() => handleToggle('dyslexiaFont')}
            trackColor={{ true: brandPrimary, false: '#ccc' }}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: brandPrimary }]}>High Contrast</Text>
          <Switch
            value={prefs.highContrast}
            onValueChange={() => handleToggle('highContrast')}
            trackColor={{ true: brandPrimary, false: '#ccc' }}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: brandPrimary }]}>Reduce Motion</Text>
          <Switch
            value={prefs.reducedMotion}
            onValueChange={() => handleToggle('reducedMotion')}
            trackColor={{ true: brandPrimary, false: '#ccc' }}
          />
        </View>

        <Button title="Save" onPress={handleSave} color={brandPrimary} disabled={loading} />
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
  content: { padding: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  label: { fontSize: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, marginBottom: 8 },
});
