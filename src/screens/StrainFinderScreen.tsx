import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  useAiRecommendations,
  RecommendProductsRequest,
  ProductRecommendation,
} from '../hooks/useAI';
import { useBrandData } from '../context/BrandContext';

const EFFECTS_OPTIONS = [
  'Relaxed',
  'Energetic',
  'Creative',
  'Focused',
  'Happy',
  'Sleepy',
  'Uplifted',
  'Euphoric',
  'Calm',
  'Social',
];

const CATEGORIES = ['Flower', 'Edibles', 'Vape', 'PreRoll', 'Concentrate', 'Tincture'];

interface ProductCardProps {
  recommendation: ProductRecommendation;
}

function ProductRecommendationCard({ recommendation }: ProductCardProps) {
  const brand = useBrandData();

  return (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{recommendation.name}</Text>
        <View style={[styles.scoreChip, { backgroundColor: brand.primaryColor }]}>
          <Text style={styles.scoreText}>{Math.round(recommendation.score)}%</Text>
        </View>
      </View>

      <Text style={styles.productBrand}>{recommendation.brand}</Text>
      <Text style={styles.productCategory}>{recommendation.category}</Text>

      <View style={styles.productDetails}>
        {recommendation.thcPercent && (
          <Text style={styles.potencyText}>THC: {recommendation.thcPercent}%</Text>
        )}
        {recommendation.cbdPercent && (
          <Text style={styles.potencyText}>CBD: {recommendation.cbdPercent}%</Text>
        )}
        <Text style={styles.priceText}>${recommendation.price.toFixed(2)}</Text>
      </View>

      <Text style={styles.reasoningText}>{recommendation.reasoning}</Text>
    </View>
  );
}

export default function StrainFinderScreen() {
  const navigation = useNavigation();
  const brand = useBrandData();
  const aiRecommendations = useAiRecommendations();

  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<'new' | 'regular' | 'heavy'>('regular');
  const [budgetLevel, setBudgetLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleEffect = (effect: string) => {
    setSelectedEffects(prev =>
      prev.includes(effect) ? prev.filter(e => e !== effect) : [...prev, effect]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleFindStrains = () => {
    if (selectedEffects.length === 0) {
      Alert.alert(
        'Select Effects',
        'Please select at least one desired effect to get recommendations.'
      );
      return;
    }

    const request: RecommendProductsRequest = {
      desiredEffects: selectedEffects,
      experienceLevel,
      budgetLevel,
      preferredCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
    };

    aiRecommendations.mutate(request);
  };

  const isLoading = aiRecommendations.isPending;
  const recommendations = aiRecommendations.data?.recommendations || [];
  const hasResults = aiRecommendations.isSuccess;
  const hasError = aiRecommendations.isError;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={brand.primaryColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find My Strain</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {!hasResults && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>What effects are you looking for?</Text>
            <View style={styles.optionsGrid}>
              {EFFECTS_OPTIONS.map(effect => (
                <TouchableOpacity
                  key={effect}
                  onPress={() => toggleEffect(effect)}
                  style={[
                    styles.optionChip,
                    selectedEffects.includes(effect) && {
                      backgroundColor: brand.primaryColor,
                      borderColor: brand.primaryColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedEffects.includes(effect) && styles.selectedOptionText,
                    ]}
                  >
                    {effect}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Experience Level</Text>
            <View style={styles.segmentedControl}>
              {(['new', 'regular', 'heavy'] as const).map(level => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setExperienceLevel(level)}
                  style={[
                    styles.segmentButton,
                    experienceLevel === level && {
                      backgroundColor: brand.primaryColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      experienceLevel === level && styles.selectedSegmentText,
                    ]}
                  >
                    {level === 'new' ? 'New' : level === 'regular' ? 'Regular' : 'Heavy User'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Budget</Text>
            <View style={styles.segmentedControl}>
              {(['low', 'medium', 'high'] as const).map(budget => (
                <TouchableOpacity
                  key={budget}
                  onPress={() => setBudgetLevel(budget)}
                  style={[
                    styles.segmentButton,
                    budgetLevel === budget && {
                      backgroundColor: brand.primaryColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      budgetLevel === budget && styles.selectedSegmentText,
                    ]}
                  >
                    {budget === 'low' ? '$' : budget === 'medium' ? '$$' : '$$$'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Product Categories (Optional)</Text>
            <View style={styles.optionsGrid}>
              {CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category}
                  onPress={() => toggleCategory(category)}
                  style={[
                    styles.optionChip,
                    selectedCategories.includes(category) && {
                      backgroundColor: brand.secondaryColor,
                      borderColor: brand.secondaryColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedCategories.includes(category) && styles.selectedOptionText,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleFindStrains}
              style={[styles.findButton, { backgroundColor: brand.primaryColor }]}
              disabled={isLoading || selectedEffects.length === 0}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.findButtonText}>Find My Perfect Strain</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {hasError && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color="#FF6B6B" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>
              {aiRecommendations.error?.message || 'Unable to get recommendations right now'}
            </Text>
            <TouchableOpacity onPress={handleFindStrains} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasResults && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {recommendations.length} Recommendations Found
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedEffects([]);
                  setExperienceLevel('regular');
                  setBudgetLevel('medium');
                  setSelectedCategories([]);
                  aiRecommendations.reset();
                }}
                style={styles.newSearchButton}
              >
                <Text style={[styles.newSearchText, { color: brand.primaryColor }]}>
                  New Search
                </Text>
              </TouchableOpacity>
            </View>

            {recommendations.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color="#999" />
                <Text style={styles.noResultsTitle}>No matches found</Text>
                <Text style={styles.noResultsMessage}>
                  Try adjusting your preferences or selecting different effects.
                </Text>
              </View>
            ) : (
              recommendations.map((rec: ProductRecommendation, index: number) => (
                <ProductRecommendationCard key={rec.id || index} recommendation={rec} />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    marginTop: 24,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: 'white',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  selectedOptionText: {
    color: 'white',
    fontWeight: '500',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 14,
    color: '#666',
  },
  selectedSegmentText: {
    color: 'white',
    fontWeight: '500',
  },
  findButton: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  findButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  resultsSection: {
    padding: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  newSearchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  newSearchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 12,
  },
  scoreChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  productBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  potencyText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  reasoningText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
