// src/screens/ArticleDetailScreen.tsx
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import React, { useContext, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
  ActivityIndicator,
} from 'react-native';

import CMSImage from '../components/CMSImage';
import { ThemeContext } from '../context/ThemeContext';
import { useArticleBySlug } from '../hooks/useArticleBySlug';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight } from '../utils/haptic';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ArticleNavProp = NativeStackNavigationProp<RootStackParamList, 'ArticleDetail'>;
type ArticleRouteProp = RouteProp<RootStackParamList, 'ArticleDetail'>;

export default function ArticleDetailScreen() {
  const navigation = useNavigation<ArticleNavProp>();
  const route = useRoute<ArticleRouteProp>();
  const { slug } = route.params;
  const { data, isLoading, isError } = useArticleBySlug(slug);

  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);

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

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text>Unable to load article.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable onPress={handleBack} style={styles.iconBtn}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>{data.title}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {data.mainImage && (
          <CMSImage uri={data.mainImage.url} alt={data.mainImage.alt} style={styles.hero} />
        )}
        <Text style={styles.date}>{new Date(data.publishedAt).toLocaleDateString()}</Text>
        <Text style={[styles.articleText, { color: brandSecondary }]}>{String(data.body)}</Text>
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
  iconBtn: { width: 24, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  content: { padding: 16 },
  hero: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },
  date: { fontSize: 12, color: '#777', marginBottom: 8 },
  articleText: {
    fontSize: 15,
    lineHeight: 24,
  },
});
