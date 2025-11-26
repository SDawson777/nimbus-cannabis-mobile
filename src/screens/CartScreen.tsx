// src/screens/CartScreen.tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Trash2, HelpCircle } from 'lucide-react-native';
import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
  ActivityIndicator,
} from 'react-native';

import { ThemeContext } from '../context/ThemeContext';
import { useCart } from '../hooks/useCart';
import { useCartValidation } from '../hooks/useCartValidation';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight, hapticMedium, hapticHeavy, hapticError } from '../utils/haptic';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type CartNavProp = NativeStackNavigationProp<RootStackParamList, 'CartScreen'>;

const IMAGE_SIZE = 80;

export default function CartScreen() {
  const navigation = useNavigation<CartNavProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);

  // Use cart from useCart hook instead of Zustand directly
  const { cart, updateCart, applyPromo, isLoading } = useCart();
  const items = cart?.items ?? [];

  const [promo, setPromo] = useState('');

  const { validating } = useCartValidation();

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [items]);

  // Dynamic background
  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

  // Glow for Checkout button
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

  if (isLoading || validating) {
    return (
      <SafeAreaView
        style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}
        accessibilityLabel="Loading cart"
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const subtotal =
    items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0
    ) || 0;
  const discount = 0;
  const taxes = (subtotal - discount) * 0.07;
  const total = subtotal - discount + taxes;

  const updateQty = async (id: string, delta: number) => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const item = items.find((i: { id: string }) => i.id === id);
    if (item) {
      const newQuantity = Math.max(1, item.quantity + delta);
      const updatedItems = items.map((i: { id: string }) =>
        i.id === id ? { ...i, quantity: newQuantity } : i
      );
      try {
        await updateCart({ items: updatedItems });
      } catch (error) {
        // Error handling - could show toast or retry
        console.error('Failed to update cart:', error);
      }
    }
  };

  const removeItem = (id: string) => {
    hapticHeavy();
    Alert.alert('Remove Item', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          const updatedItems = items.filter((i: { id: string }) => i.id !== id);
          try {
            await updateCart({ items: updatedItems });
          } catch (error) {
            console.error('Failed to remove item:', error);
          }
        },
      },
    ]);
  };

  const applyPromoCode = async () => {
    if (!promo.trim()) {
      hapticError();
      Alert.alert('Please enter a promo code');
      return;
    }

    try {
      hapticMedium();
      await applyPromo(promo.trim());
      setPromo(''); // Clear the input on success
      Alert.alert('Success', 'Promo code applied!');
    } catch (error) {
      hapticError();
      const message = error instanceof Error ? error.message : 'Failed to apply promo code';
      Alert.alert('Error', message);
    }
  };

  const goToHelp = () => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('HelpFAQ');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} testID="cart-screen">
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            hapticLight();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            navigation.goBack();
          }}
        >
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.title, { color: brandPrimary }]}>Your Cart</Text>
        <Pressable onPress={goToHelp}>
          <HelpCircle color={brandPrimary} size={24} />
        </Pressable>
      </View>

      {/* Cart Items */}
      <FlatList
        testID="cart-items"
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card} testID={`cart-item-${item.id}`}>
            <Image
              source={{ uri: (item as any).image ?? (item as any).imageUrl }}
              style={styles.image}
            />
            <View style={styles.info}>
              <Text style={[styles.name, { color: brandPrimary }]}>{item.name}</Text>
              <Text style={[styles.price, { color: brandSecondary }]}>
                ${item.price.toFixed(2)}
              </Text>
              <View style={styles.qtyRow}>
                <Pressable
                  onPress={() => updateQty(item.id, -1)}
                  style={[styles.qtyBtn, { backgroundColor: brandSecondary + '20' }]}
                  testID={`decrease-quantity-${item.id}`}
                  accessibilityLabel={`Decrease quantity of ${item.name}`}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </Pressable>
                <Text style={[styles.qty, { color: brandPrimary }]}>{item.quantity}</Text>
                <Pressable
                  onPress={() => updateQty(item.id, 1)}
                  style={[styles.qtyBtn, { backgroundColor: brandSecondary + '20' }]}
                  testID={`increase-quantity-${item.id}`}
                  accessibilityLabel={`Increase quantity of ${item.name}`}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </Pressable>
                <Pressable
                  onPress={() => removeItem(item.id)}
                  style={styles.remove}
                  testID={`remove-item-${item.id}`}
                  accessibilityLabel={`Remove ${item.name} from cart`}
                >
                  <Trash2 color={brandPrimary} size={20} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {/* Promo Code */}
      <View style={styles.promoSection}>
        <TextInput
          style={[styles.promoInput, { borderColor: brandSecondary, color: brandPrimary }]}
          placeholder="Enter Promo Code"
          placeholderTextColor={brandSecondary}
          value={promo}
          testID="coupon-input"
          onChangeText={setPromo}
        />
        <Pressable
          style={[styles.promoBtn, { backgroundColor: brandPrimary }, glowStyle]}
          onPress={applyPromoCode}
        >
          <Text style={styles.promoBtnText}>Apply</Text>
        </Pressable>
      </View>

      {/* Order Summary */}
      <View style={[styles.summary, { backgroundColor: '#FFF' }]} testID="cart-total">
        <Text style={[styles.summaryTitle, { color: brandPrimary }]}>Order Summary</Text>
        <View style={styles.line}>
          <Text style={styles.lineLabel}>Subtotal</Text>
          <Text style={styles.lineValue}>${subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.lineLabel}>Discounts</Text>
          <Text style={styles.lineValue}>−${discount.toFixed(2)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.lineLabel}>Estimated Taxes</Text>
          <Text style={styles.lineValue}>${taxes.toFixed(2)}</Text>
        </View>
        <View style={styles.lineTotal}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalValue, { color: brandPrimary }]}>${total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Proceed to Checkout */}
      <Pressable
        testID="checkout-button"
        style={[styles.checkoutBtn, { backgroundColor: brandPrimary }, glowStyle]}
        onPress={() => {
          hapticMedium();
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          navigation.navigate('Checkout');
        }}
      >
        <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
      </Pressable>
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
  },
  title: { fontSize: 20, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: IMAGE_SIZE + 20,
    marginBottom: 12,
    padding: 10,
  },
  image: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 12 },
  info: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 16, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 20 },
  qty: { marginHorizontal: 8, fontSize: 16, fontWeight: '500' },
  remove: { marginLeft: 'auto' },
  promoSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  promoInput: {
    flex: 1,
    backgroundColor: '#EEEEEE',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
  },
  promoBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  promoBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  summary: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  summaryTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lineLabel: { fontSize: 14 },
  lineValue: { fontSize: 14 },
  lineTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 16, fontWeight: '700' },
  checkoutBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
