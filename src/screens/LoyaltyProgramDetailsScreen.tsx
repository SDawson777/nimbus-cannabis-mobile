// src/screens/LoyaltyProgramDetailsScreen.tsx
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  ActivityIndicator,
} from 'react-native';

import { phase4Client } from '../api/phase4Client';
import { clientPost } from '../api/http';
import PointsProgressBar from '../components/PointsProgressBar';
import { LoyaltyContext } from '../context/LoyaltyContext';
import { ThemeContext } from '../context/ThemeContext';
import { hapticLight } from '../utils/haptic';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LoyaltyProgramDetailsScreen() {
  const navigation = useNavigation();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);
  const { data: loyalty } = useContext(LoyaltyContext);
  const queryClient = useQueryClient();

  const redeemMutation = useMutation({
    mutationFn: async () => {
      await clientPost<void, any>(phase4Client, '/loyalty/redeem');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyStatus'] });
    },
  });

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;
  const points = loyalty?.points ?? 0;
  const target = 140;
  const pointsAway = Math.max(0, target - points);

  const handleBack = () => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable onPress={handleBack}>
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Loyalty Program</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.points, { color: brandPrimary }]}>{points} points</Text>
        <Text style={[styles.description, { color: brandPrimary }]}>
          You’re only {pointsAway} points away from your next reward!
        </Text>
        <PointsProgressBar current={points} target={target} />
        <Pressable
          style={[styles.button, { backgroundColor: brandSecondary }]}
          onPress={() => {
            hapticLight();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            redeemMutation.reset();
            redeemMutation.mutate();
          }}
          disabled={redeemMutation.isPending}
        >
          {redeemMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Redeem Reward</Text>
          )}
        </Pressable>
        {redeemMutation.isSuccess && <Text style={styles.successText}>Reward redeemed!</Text>}
        {redeemMutation.isError && <Text style={styles.errorText}>Failed to redeem reward.</Text>}
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
  content: {
    padding: 16,
    alignItems: 'center',
  },
  points: {
    fontSize: 32,
    fontWeight: '700',
    marginVertical: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successText: {
    marginTop: 12,
    color: '#0A0',
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    color: '#A00',
    fontSize: 16,
  },
});
