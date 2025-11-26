import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useContext } from 'react';
import {
  SafeAreaView,
  FlatList,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
  ActivityIndicator,
} from 'react-native';

import CMSImage from '../components/CMSImage';
import { ThemeContext } from '../context/ThemeContext';
import { useCMSProducts } from '../hooks/useCMSProducts';
import type { RootStackParamList } from '../navigation/types';
import type { CMSProduct } from '../types/cms';
import { hapticLight } from '../utils/haptic';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavProp = NativeStackNavigationProp<RootStackParamList, 'ProductList'>;

export default function ProductListScreen() {
  const navigation = useNavigation<NavProp>();
  const { colorTemp, brandPrimary, brandBackground } = useContext(ThemeContext);
  const { data, isLoading } = useCMSProducts();

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

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

  const products = data ?? [];

  const openProduct = (slug: string) => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('ProductDetail', { slug });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <FlatList<CMSProduct>
        data={products}
        keyExtractor={item => item.__id}
        numColumns={2}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { borderColor: brandPrimary }]}
            onPress={() => openProduct(item.slug)}
          >
            <CMSImage uri={item.image.url} alt={item.name} style={styles.image} />
            <Text style={[styles.name, { color: brandPrimary }]}>{item.name}</Text>
            <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  card: { flex: 1, margin: 8, padding: 12, borderWidth: 2, borderRadius: 12, alignItems: 'center' },
  image: { width: '100%', aspectRatio: 1, borderRadius: 8, marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 14 },
});
