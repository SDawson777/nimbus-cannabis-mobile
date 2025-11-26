import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import React, { useContext, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import RenderHTML from 'react-native-render-html';

import LegalDisclaimerModal from '../../components/LegalDisclaimerModal';
import { ThemeContext } from '../../context/ThemeContext';
import type { RootStackParamList } from '../../navigation/types';
import { hapticLight } from '../../utils/haptic';
import { useLegal } from '../../hooks/useLegal';
import { usePreferredStore } from '../../state/store';
import { useWindowDimensions } from 'react-native';
import type { LegalContent as BackendLegalContent } from '../../types/cmsExtra';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Legal'>;

const LEGAL_LINKS = [
  { id: 'terms', label: 'Terms of Use' },
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'accessibility', label: 'Accessibility Statement' },
];

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
  list: { paddingHorizontal: 16 },
  row: { paddingVertical: 12, borderBottomWidth: 1 },
  label: { fontSize: 16 },
  disclaimerBtn: { alignItems: 'center', marginTop: 24 },
  disclaimerLink: { fontSize: 14, textDecorationLine: 'underline' },
  modalContainer: { flex: 1 },
  modalContent: { padding: 16 },
});

export default function LegalScreen() {
  const navigation = useNavigation<NavProp>();
  const { colorTemp, brandPrimary, brandSecondary, brandBackground } = useContext(ThemeContext);
  const [selected, setSelected] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { data, isLoading, isError } = useLegal();
  const { width } = useWindowDimensions();
  const preferredStore = usePreferredStore((state: any) => state.preferredStore);
  const userState = preferredStore?.state?.toUpperCase() || null;
  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : brandBackground;

  // Fallback for offline or error
  const offline = isError || !data;
  type LegalContent = BackendLegalContent & {
    terms?: string;
    privacy?: string;
    accessibility?: string;
    stateNotices?: Record<string, string>;
    lastUpdated?: Record<string, string>;
  };
  const legalContent: LegalContent = (data ?? {}) as any;

  // Compose modal content
  const getModalContent = (id: string) => {
    if (!legalContent) return { html: '<p>Content unavailable.</p>', lastUpdated: null };
    let html = '';
    let lastUpdated = null;
    if (id === 'terms') {
      html = legalContent.terms || '<p>Terms unavailable.</p>';
      lastUpdated = legalContent.lastUpdated?.terms;
    } else if (id === 'privacy') {
      html = legalContent.privacy || '<p>Privacy policy unavailable.</p>';
      lastUpdated = legalContent.lastUpdated?.privacy;
    } else if (id === 'accessibility') {
      html = legalContent.accessibility || '<p>Accessibility statement unavailable.</p>';
      lastUpdated = legalContent.lastUpdated?.accessibility;
    }
    return { html, lastUpdated };
  };

  // State-specific notice
  const stateNotice = userState && legalContent.stateNotices?.[userState];
  const stateNoticeLastUpdated = userState && legalContent.lastUpdated?.[`state-${userState}`];

  // Outdated banner logic (if offline and no cache)
  const showOutdatedBanner = offline;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} testID="legal-screen">
      <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
        <Pressable
          onPress={() => {
            hapticLight();
            navigation.goBack();
          }}
        >
          <ChevronLeft color={brandPrimary} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: brandPrimary }]}>Legal</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.list}>
        {LEGAL_LINKS.map(item => (
          <Pressable
            key={item.id}
            testID={`legal-terms-link-${item.id}`}
            style={[styles.row, { borderBottomColor: brandSecondary }]}
            onPress={() => {
              hapticLight();
              setSelected(item.id);
            }}
          >
            <Text style={[styles.label, { color: brandPrimary }]}>{item.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setShowDisclaimer(true)} style={styles.disclaimerBtn}>
          <Text style={[styles.disclaimerLink, { color: brandPrimary }]}>View Disclaimer</Text>
        </Pressable>
      </View>

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bgColor }]}>
          <View style={[styles.header, { borderBottomColor: brandSecondary }]}>
            <Pressable onPress={() => setSelected(null)}>
              <ChevronLeft color={brandPrimary} size={24} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: brandPrimary }]}>
              {LEGAL_LINKS.find(l => l.id === selected)?.label}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {isLoading ? (
              <ActivityIndicator size="large" color={brandPrimary} />
            ) : (
              <>
                <RenderHTML
                  contentWidth={width - 32}
                  source={{ html: getModalContent(selected || '').html }}
                  baseStyle={{ color: brandSecondary, fontSize: 16 }}
                />
                {getModalContent(selected || '').lastUpdated && (
                  <Text style={{ color: brandSecondary, fontSize: 12, marginTop: 12 }}>
                    Last updated:{' '}
                    {new Date(
                      getModalContent(selected || '').lastUpdated as string
                    ).toLocaleDateString()}
                  </Text>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* State-specific notice */}
      {stateNotice && (
        <View
          testID="state-notice-html"
          style={{ margin: 16, padding: 12, backgroundColor: '#FFF8E1', borderRadius: 8 }}
        >
          <RenderHTML
            contentWidth={width - 64}
            source={{ html: stateNotice }}
            baseStyle={{ color: brandSecondary, fontSize: 15 }}
          />
          {stateNoticeLastUpdated && (
            <Text style={{ color: brandSecondary, fontSize: 12, marginTop: 8 }}>
              State notice last updated:{' '}
              {new Date(stateNoticeLastUpdated as string).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}

      {/* Outdated banner if offline or error */}
      {showOutdatedBanner && (
        <View style={{ backgroundColor: '#FFF3E0', padding: 10, alignItems: 'center' }}>
          <Text style={{ color: '#B26A00', fontSize: 13 }}>
            Legal content may be outdated or unavailable (offline mode).
          </Text>
        </View>
      )}

      <LegalDisclaimerModal visible={showDisclaimer} onClose={() => setShowDisclaimer(false)} />
    </SafeAreaView>
  );
}
