// src/screens/SavedAddressesScreen.tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight } from 'lucide-react-native';
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

import { getAddresses } from '../api/phase4Client';
import { ThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight, hapticMedium } from '../utils/haptic';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SavedAddressesNavProp = NativeStackNavigationProp<RootStackParamList, 'SavedAddresses'>;

interface Address {
  id: string;
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string; // backend supplies `state`
  zipCode?: string;
  country?: string;
  isDefault?: boolean;
}

export default function SavedAddressesScreen() {
  const navigation = useNavigation<SavedAddressesNavProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);
  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: getAddresses,
  });

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [addresses]);

  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

  const handleEdit = (addr: Address) => {
    hapticMedium();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('EditAddress', { address: addr });
  };

  const handleAdd = () => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('AddAddress');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <FlatList
        data={addresses}
        keyExtractor={a => a.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, { borderBottomColor: brandSecondary }]}
            android_ripple={{ color: `${brandSecondary}20` }}
            onPress={() => handleEdit(item)}
          >
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.label, { color: brandPrimary }]}>{item.fullName}</Text>
                {item.isDefault ? (
                  <View style={[styles.defaultBadge, { borderColor: brandSecondary }]}>
                    <Text style={[styles.defaultText, { color: brandSecondary }]}>Default</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.subLabel, { color: brandSecondary }]}>
                {item.line1}
                {item.city ? ', ' + item.city : ''}
              </Text>
            </View>
            <ChevronRight color={brandPrimary} size={20} />
          </Pressable>
        )}
        ListFooterComponent={
          <Pressable
            style={[styles.addBtn, { borderColor: brandSecondary }]}
            android_ripple={{ color: `${brandSecondary}20` }}
            onPress={handleAdd}
          >
            <Plus color={brandSecondary} size={20} />
            <Text style={[styles.addText, { color: brandSecondary }]}>Add New Address</Text>
          </Pressable>
        }
      />
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
  label: { fontSize: 16, fontWeight: '600' },
  subLabel: { fontSize: 14, marginTop: 4 },
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
  defaultBadge: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 0,
  },
  defaultText: { fontSize: 12, fontWeight: '600' },
});
