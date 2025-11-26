import Slider from '@react-native-community/slider';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';

import { addJournal, updateJournal } from '../api/phase4Client';
import { ThemeContext } from '../context/ThemeContext';
import { useOfflineJournalQueue } from '../hooks/useOfflineJournalQueue';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight } from '../utils/haptic';

const LABELS = ['Relaxation', 'Focus', 'Pain Relief', 'Creativity', 'Sleep'];

type RouteProps = RouteProp<RootStackParamList, 'JournalEntry'>;
type NavProp = NativeStackNavigationProp<RootStackParamList, 'JournalEntry'>;

export default function JournalEntryScreen() {
  const { params } = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { brandPrimary } = React.useContext(ThemeContext);
  const { queueJournalAction } = useOfflineJournalQueue();

  const isEditMode = !!params.journalEntry;
  const existingEntry = params.journalEntry;

  const [_values, setValues] = React.useState(() => {
    if (isEditMode && existingEntry?.tags) {
      return LABELS.reduce<Record<string, number>>(
        (acc, label) => ({
          ...acc,
          [label]: existingEntry.tags.includes(label) ? 5 : 0, // Default to 5 for existing tags
        }),
        {}
      );
    }
    return LABELS.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l]: 0 }), {});
  });

  const [notes, setNotes] = React.useState(existingEntry?.notes || '');

  const handleChange = (label: string, val: number) => {
    setValues(v => ({ ...v, [label]: val }));
  };

  const saveEntry = async () => {
    hapticLight();

    const rating = Object.values(_values).reduce((a, b) => a + b, 0) / LABELS.length;
    const payload = {
      productId: params.item.id,
      rating,
      notes,
      tags: LABELS.filter(l => _values[l] > 0),
    };

    try {
      if (isEditMode) {
        // Try direct API update first
        await updateJournal(existingEntry.id, payload);
      } else {
        // Try direct API create first
        await addJournal(payload);
      }
    } catch (__e) {
      // If online call fails, queue for offline processing
      await queueJournalAction({
        type: isEditMode ? 'update' : 'create',
        id: isEditMode ? existingEntry.id : undefined,
        payload,
      });
    }

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: brandPrimary }]}>
        {isEditMode ? 'Edit Journal Entry' : 'Journal Entry'}
      </Text>
      <Text style={styles.meta}>{params.item.name}</Text>
      {LABELS.map(label => (
        <View key={label} style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>{label}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={10}
            step={1}
            value={_values[label]}
            minimumTrackTintColor={brandPrimary}
            onValueChange={v => handleChange(label, v)}
          />
          <Text style={styles.sliderValue}>{_values[label]}</Text>
        </View>
      ))}
      <TextInput
        placeholder="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={styles.notes}
      />
      <Text onPress={saveEntry} style={[styles.save, { color: brandPrimary }]}>
        Save
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  meta: { fontSize: 16, marginBottom: 16 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  sliderLabel: { width: 100 },
  slider: { flex: 1, marginHorizontal: 8 },
  sliderValue: { width: 24, textAlign: 'right' },
  notes: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    height: 80,
    textAlignVertical: 'top',
    marginTop: 16,
  },
  save: { marginTop: 24, textAlign: 'right', fontSize: 16 },
});
