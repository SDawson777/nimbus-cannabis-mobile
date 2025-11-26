import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { getJournal } from '../api/phase4Client';
import { ThemeContext } from '../context/ThemeContext';

export default function MyJarsInsightsScreen() {
  const { brandPrimary } = React.useContext(ThemeContext);
  const { data, isLoading } = useQuery({
    queryKey: ['journal'],
    // Always return a defined value, even if the API/mocks return undefined
    queryFn: async () => (await getJournal()) ?? [],
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  const entries = data ?? [];

  if (entries.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: brandPrimary }]}>Insights</Text>
        <Text style={styles.placeholder}>No journal data yet.</Text>
      </View>
    );
  }

  const counts = Array.from({ length: 11 }, (_, r) => ({
    rating: r,
    count: entries.filter((e: any) => Math.round(e.rating || 0) === r).length,
  }));
  const maxCount = Math.max(...counts.map(c => c.count), 1);
  const chartWidth = 300;
  const chartHeight = 160;
  const barWidth = chartWidth / counts.length;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: brandPrimary }]}>Insights</Text>
      <Svg width={chartWidth} height={chartHeight} style={styles.chart}>
        {counts.map((d, i) => (
          <Rect
            key={d.rating}
            x={i * barWidth}
            y={chartHeight - (d.count / maxCount) * chartHeight}
            width={barWidth - 4}
            height={(d.count / maxCount) * chartHeight}
            fill={brandPrimary}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  placeholder: { color: '#666' },
  chart: { marginTop: 16 },
});
