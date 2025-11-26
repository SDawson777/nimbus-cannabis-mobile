// src/screens/StoreLocatorScreen.tsx
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

import { ThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight, hapticMedium } from '../utils/haptic';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type LocatorNavProp = NativeStackNavigationProp<RootStackParamList, 'StoreLocator'>;

const STORES = [
  { id: '1', name: 'Jars Downtown', address: '123 Main St, Detroit, MI' },
  { id: '2', name: 'Jars Midtown', address: '456 Elm St, Detroit, MI' },
  { id: '3', name: 'Jars Eastside', address: '789 Pine Ave, Detroit, MI' },
];

export default function StoreLocatorScreen() {
  const navigation = useNavigation<LocatorNavProp>();
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

  const handleSelectStore = (store: (typeof STORES)[0]) => {
    hapticMedium();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('StoreDetails', { store });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable onPress={handleBack}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.title, { color: brandPrimary }]}>Store Locator</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* List */}
      <FlatList
        data={STORES}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            android_ripple={{ color: `${brandSecondary}20` }}
            onPress={() => handleSelectStore(item)}
          >
            <View>
              <Text style={[styles.storeName, { color: brandPrimary }]}>{item.name}</Text>
              <Text style={[styles.storeAddress, { color: brandSecondary }]}>{item.address}</Text>
            </View>
          </Pressable>
        )}
      />
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
  title: { fontSize: 20, fontWeight: '600' },
  list: { padding: 16 },
  row: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  storeName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  storeAddress: { fontSize: 14 },
});
