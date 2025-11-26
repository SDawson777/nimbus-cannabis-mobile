// src/screens/HelpFAQScreen.tsx
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';

import FAQSkeleton from '../components/FAQSkeleton';
import PreviewBadge from '../components/PreviewBadge';
import { useCMSPreview } from '../context/CMSPreviewContext';
import { ThemeContext } from '../context/ThemeContext';
import { useFAQQuery } from '../hooks/useFAQ';
import { hapticLight } from '../utils/haptic';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HelpFAQScreen() {
  const navigation = useNavigation();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const { data, isLoading, isError } = useFAQQuery();
  const { preview } = useCMSPreview();

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

  const toggleFAQ = (id: string) => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor },
        ]}
      >
        <FAQSkeleton />
        <FAQSkeleton />
        <FAQSkeleton />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor },
        ]}
      >
        <Text>Unable to load FAQ.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {preview && <PreviewBadge />}
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable onPress={handleBack}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Help & FAQ</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {data.map((item: { id: string; question: string; answer: string }) => (
          <View key={item.id} style={styles.faqItem}>
            <Pressable onPress={() => toggleFAQ(item.id)}>
              <Text style={[styles.question, { color: brandPrimary }]}>{item.question}</Text>
            </Pressable>
            {openIds.includes(item.id) && (
              <Text style={[styles.answer, { color: brandSecondary }]}>{item.answer}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  content: { padding: 16 },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 12,
  },
  question: { fontSize: 16, fontWeight: '500' },
  answer: { fontSize: 14, marginTop: 8, lineHeight: 20 },
});
