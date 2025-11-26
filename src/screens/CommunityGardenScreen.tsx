// src/screens/CommunityGardenScreen.tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useContext, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';

import { phase4Client } from '../api/phase4Client';
import { clientGet } from '../api/http';
import { ThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight } from '../utils/haptic';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type CommunityNavProp = NativeStackNavigationProp<RootStackParamList, 'CommunityGarden'>;

interface Post {
  id: string;
  user: string;
  time: string;
  text: string;
}

export default function CommunityGardenScreen() {
  const navigation = useNavigation<CommunityNavProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await clientGet<{ posts?: Post[] }>(phase4Client, '/community/posts');
      setPosts(data?.posts || (data as unknown as Post[]) || []);
    } catch {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void fetchPosts();
  }, []);

  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

  const handleBack = () => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.goBack();
  };

  const handlePostPress = () => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable onPress={handleBack}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Community Garden</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading && (
          <Text style={[styles.statusText, { color: brandSecondary }]}>Loading posts...</Text>
        )}
        {!loading && error ? (
          <Text style={[styles.statusText, { color: 'red' }]}>{error}</Text>
        ) : (
          posts.map(post => (
            <Pressable
              key={post.id}
              style={[styles.postCard, { backgroundColor: brandBackground }]}
              onPress={handlePostPress}
              android_ripple={{ color: `${brandSecondary}20` }}
            >
              <View style={styles.postHeader}>
                <Image
                  source={{
                    uri: `https://placehold.co/40x40?text=${post.user[0]}`,
                  }}
                  style={styles.avatar}
                />
                <View>
                  <Text style={[styles.username, { color: brandPrimary }]}>{post.user}</Text>
                  <Text style={[styles.time, { color: brandSecondary }]}>{post.time}</Text>
                </View>
              </View>
              <Text style={[styles.postText, { color: brandPrimary }]}>{post.text}</Text>
            </Pressable>
          ))
        )}
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
  postCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: { fontSize: 16, fontWeight: '600' },
  time: { fontSize: 12, marginTop: 2 },
  postText: { fontSize: 15, lineHeight: 22 },
  statusText: { textAlign: 'center', marginTop: 16 },
});
