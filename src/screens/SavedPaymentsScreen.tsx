// src/screens/SavedPaymentsScreen.tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight } from 'lucide-react-native';
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
} from 'react-native';

import { getPaymentMethods } from '../clients/paymentClient';
import { ThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight, hapticMedium } from '../utils/haptic';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SavedPaymentsNavProp = NativeStackNavigationProp<RootStackParamList, 'SavedPayments'>;

interface PaymentMethod {
  id: string;
  cardBrand?: string;
  cardLast4?: string;
  holderName?: string;
  expiry?: string;
  isDefault?: boolean;
}

export default function SavedPaymentsScreen() {
  const navigation = useNavigation<SavedPaymentsNavProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);
  const { data: methods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['paymentMethods'],
    queryFn: getPaymentMethods,
  });

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [methods]);

  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

  const glowStyle =
    colorTemp === 'warm'
      ? {
          shadowColor: brandSecondary,
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

  const handleEdit = (pm: PaymentMethod) => {
    hapticMedium();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('EditPayment', { payment: pm });
  };

  const handleAdd = () => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('AddPayment');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <FlatList
        data={methods}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, { borderBottomColor: brandSecondary }]}
            android_ripple={{ color: `${brandSecondary}20` }}
            onPress={() => handleEdit(item)}
          >
            <Text style={[styles.label, { color: brandPrimary }]}>
              {item.cardBrand ? `${item.cardBrand} ****${item.cardLast4 ?? ''}` : item.holderName}
              {item.isDefault ? ' (Default)' : ''}
            </Text>
            <ChevronRight color={brandPrimary} size={20} />
          </Pressable>
        )}
        ListFooterComponent={
          <Pressable
            style={[styles.addBtn, { borderColor: brandSecondary }, glowStyle]}
            android_ripple={{ color: `${brandSecondary}20` }}
            onPress={handleAdd}
          >
            <Plus color={brandSecondary} size={20} />
            <Text style={[styles.addText, { color: brandSecondary }]}>Add New Payment</Text>
          </Pressable>
        }
      />
      {isLoading && <Text style={{ padding: 16, color: brandSecondary }}>Loading...</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: { fontSize: 16 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
  },
  addText: { marginLeft: 8, fontSize: 16, fontWeight: '600' },
});
