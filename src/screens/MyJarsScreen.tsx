import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarChart } from 'lucide-react-native';
import React, { useContext } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { ThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight } from '../utils/haptic';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'MyJars'>;

export default function MyJarsScreen() {
  const navigation = useNavigation<NavProp>();
  const { brandPrimary } = useContext(ThemeContext);

  const openInsights = () => {
    hapticLight();
    navigation.navigate('MyJarsInsights');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: brandPrimary }]}>My Stash</Text>
        <Pressable onPress={openInsights} hitSlop={8}>
          <BarChart color={brandPrimary} />
        </Pressable>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Your Stash Box is empty!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: { fontSize: 20, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#666' },
});
