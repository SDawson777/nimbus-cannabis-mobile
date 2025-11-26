// src/screens/StoreDetailsScreen.tsx
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Phone, Clock } from 'lucide-react-native';
import React, { useEffect, useContext } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
  Linking,
} from 'react-native';

import { ThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight, hapticMedium } from '../utils/haptic';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type StoreDetailsNavProp = NativeStackNavigationProp<RootStackParamList, 'StoreDetails'>;
type StoreDetailsRouteProp = RouteProp<RootStackParamList, 'StoreDetails'>;

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
}

export default function StoreDetailsScreen() {
  const navigation = useNavigation<StoreDetailsNavProp>();
  const route = useRoute<StoreDetailsRouteProp>();
  const store: Store = route.params.store;

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

  const callStore = () => {
    hapticMedium();
    Linking.openURL(`tel:${store.phone.replace(/[^\d]/g, '')}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable onPress={handleBack}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.title, { color: brandPrimary }]}>{store.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoRow}>
          <Clock color={brandSecondary} size={20} style={{ marginRight: 8 }} />
          <Text style={[styles.infoText, { color: brandSecondary }]}>{store.hours}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone color={brandSecondary} size={20} style={{ marginRight: 8 }} />
          <Text style={[styles.infoText, { color: brandSecondary }]}>{store.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.address, { color: brandPrimary }]}>{store.address}</Text>
        </View>

        <Pressable style={[styles.callBtn, { backgroundColor: brandPrimary }]} onPress={callStore}>
          <Text style={styles.callText}>Call Store</Text>
        </Pressable>
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
  title: { fontSize: 20, fontWeight: '600' },
  content: { padding: 16 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: { fontSize: 16 },
  address: { fontSize: 16, marginLeft: 28 },
  callBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  callText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
