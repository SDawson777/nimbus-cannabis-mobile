// src/screens/OrderDetailsScreen.tsx
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
} from 'react-native';

import { ThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight, hapticMedium } from '../utils/haptic';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type OrderDetailsNavProp = NativeStackNavigationProp<RootStackParamList, 'OrderDetails'>;
type OrderDetailsRouteProp = RouteProp<RootStackParamList, 'OrderDetails'>;

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  status: string;
  items: OrderItem[];
}

export default function OrderDetailsScreen() {
  const navigation = useNavigation<OrderDetailsNavProp>();
  const route = useRoute<OrderDetailsRouteProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);

  // fallback order if none provided
  const order: Order = route.params?.order || {
    id: '12345',
    date: '2025-07-14',
    status: 'Processing',
    items: [
      { id: '1', name: 'Rainbow Rozay', qty: 1, price: 79.0 },
      { id: '2', name: 'Moonwalker OG', qty: 2, price: 65.0 },
    ],
  };

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  // dynamic background
  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

  // glow for reorder button
  const glowStyle =
    colorTemp === 'warm'
      ? {
          shadowColor: brandPrimary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }
      : colorTemp === 'cool'
        ? {
            shadowColor: '#00A4FF',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }
        : {};

  const handleBack = () => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.goBack();
  };

  const handleReorder = () => {
    hapticMedium();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('CartScreen');
  };

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxes = subtotal * 0.07;
  const total = subtotal + taxes;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: '#EEEEEE' }]}>
        <Pressable onPress={handleBack}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Order #{order.id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.meta, { color: brandSecondary }]}>Date: {order.date}</Text>
        <Text style={[styles.meta, { color: brandSecondary }]}>Status: {order.status}</Text>

        {order.items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={[styles.itemName, { color: brandPrimary }]}>
              {item.qty}× {item.name}
            </Text>
            <Text style={[styles.itemPrice, { color: brandPrimary }]}>
              ${(item.price * item.qty).toFixed(2)}
            </Text>
          </View>
        ))}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxes</Text>
            <Text style={styles.summaryValue}>${taxes.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryTotal}>
            <Text style={[styles.totalLabel, { color: brandPrimary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: brandPrimary }]}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <Pressable
          style={[styles.reorderBtn, { backgroundColor: brandPrimary }, glowStyle]}
          onPress={handleReorder}
        >
          <Text style={styles.reorderText}>Reorder</Text>
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
  headerTitle: { fontSize: 20, fontWeight: '600' },
  content: { padding: 16 },
  meta: { fontSize: 14, marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  itemName: { fontSize: 16 },
  itemPrice: { fontSize: 16, fontWeight: '600' },
  summary: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14 },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  totalLabel: { fontSize: 18, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  reorderBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  reorderText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
