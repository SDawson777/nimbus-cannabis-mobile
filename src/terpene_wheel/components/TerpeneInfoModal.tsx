import React, { useContext } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';

import { ThemeContext } from '../../context/ThemeContext';
import type { TerpeneInfo } from '../data/terpenes';

interface Props {
  terpene: TerpeneInfo | null;
  visible: boolean;
  onClose: () => void;
}

export const TerpeneInfoModal: React.FC<Props> = ({ terpene, visible, onClose }) => {
  const { brandPrimary, brandBackground } = useContext(ThemeContext);

  if (!terpene) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[styles.content, { backgroundColor: brandBackground, borderColor: brandPrimary }]}
        >
          <Text style={[styles.title, { color: brandPrimary }]}>{terpene.name}</Text>
          <Text style={styles.section}>Aromas: {terpene.aromas.join(', ')}</Text>
          <Text style={styles.section}>Effects: {terpene.effects.join(', ')}</Text>
          <Text style={styles.sectionSmall}>Strains: {terpene.strains.join(', ')}</Text>
          <Pressable onPress={onClose} style={[styles.button, { backgroundColor: brandPrimary }]}>
            <Text style={styles.buttonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0009',
  },
  content: {
    width: '80%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  section: { fontSize: 14, marginBottom: 6 },
  sectionSmall: { fontSize: 12, marginTop: 4 },
  button: { marginTop: 16, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
