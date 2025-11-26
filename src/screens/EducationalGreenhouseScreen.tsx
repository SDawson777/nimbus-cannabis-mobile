// src/screens/EducationalGreenhouseScreen.tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useContext } from 'react';
import {
  SafeAreaView,
  FlatList,
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';

import ArticlePreviewCard from '../components/ArticlePreviewCard';
import ArticleSkeletonCard from '../components/ArticleSkeletonCard';
import PreviewBadge from '../components/PreviewBadge';
import { useCMSPreview } from '../context/CMSPreviewContext';
import { ThemeContext } from '../context/ThemeContext';
import { useArticlesQuery } from '../hooks/useArticles';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight } from '../utils/haptic';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type EduNavProp = NativeStackNavigationProp<RootStackParamList, 'EducationalGreenhouse'>;

export default function EducationalGreenhouseScreen() {
  const navigation = useNavigation<EduNavProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);
  const { data, isLoading, isError } = useArticlesQuery();
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

  const openArticle = (slug: string) => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('ArticleDetail', { slug });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {preview && <PreviewBadge />}
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable onPress={handleBack}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Greenhouse</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading && (
        <View style={styles.list}>
          <ArticleSkeletonCard />
          <ArticleSkeletonCard />
          <ArticleSkeletonCard />
        </View>
      )}
      {isError && (
        <View style={[styles.list, { alignItems: 'center' }]}>
          \<Text>Unable to load articles.</Text>
        </View>
      )}
      {!isLoading && !isError && data && (
        <FlatList
          data={data}
          keyExtractor={a => a.__id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ArticlePreviewCard article={item} onPress={() => openArticle(item.slug)} />
          )}
        />
      )}
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
  list: { padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 16 },
});
