// src/screens/HomeScreen.tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  MapPin,
  ChevronDown,
  Search,
  Heart,
  ShoppingCart,
  User,
  Home,
  Menu,
} from 'lucide-react-native';
import React, { useEffect, useContext, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { phase4Client } from '../api/phase4Client';
import ForYouTodayCard from '../components/ForYouTodayCard';
import ForYouTodaySkeleton from '../components/ForYouTodaySkeleton';
import WeatherForYouRail from '../components/WeatherForYouRail';
import { mapWeatherCondition } from '../hooks/useWeatherRecommendations';
import { useWeatherRecommendationsPreference } from '../hooks/useWeatherRecommendationsPreference';
import OfflineNotice from '../components/OfflineNotice';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { useStore } from '../context/StoreContext';
import { useForYouToday } from '../hooks/useForYouToday';
import { usePulseCTA } from '../hooks/usePulse';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight } from '../utils/haptic';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, 'HomeScreen'>;

type Category = { id: string; label: string; emoji: string };
type FeaturedProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
};
type Way = { id: string; label: string };

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { colorTemp, jarsPrimary, jarsSecondary, jarsBackground } = useContext(ThemeContext);
  const { data: user } = useContext(AuthContext);
  const { preferredStore } = useStore();
  const { data: forYou, isLoading } = useForYouToday(user?.id, preferredStore?.id);

  // Pulse animations for key CTAs
  const terpeneWheelPulse = usePulseCTA(() => navigation.navigate('TerpeneWheel'), {
    maxScale: 1.02,
    duration: 200,
  });

  const shopCTAPulse = usePulseCTA(() => navigation.navigate('ShopScreen'), {
    maxScale: 1.02,
    duration: 200,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [ways, setWays] = useState<Way[]>([]);
  const [waysLoading, setWaysLoading] = useState(true);
  // Basic lightweight weather condition placeholder. In future, integrate real weather API.
  const [weatherCondition, setWeatherCondition] = useState<string | null>(null);
  const [weatherPrefEnabled, _setWeatherPrefEnabled, weatherPrefHydrated] =
    useWeatherRecommendationsPreference();

  // Derive a pseudo-condition from time of day to avoid external dependencies and keep clutter low.
  useEffect(() => {
    if (!weatherPrefEnabled) {
      setWeatherCondition(null);
      return;
    }
    const hour = new Date().getHours();
    let derived = 'clear';
    if (hour >= 6 && hour < 11) derived = 'partly cloudy';
    else if (hour >= 11 && hour < 16) derived = 'sunny';
    else if (hour >= 16 && hour < 20) derived = 'cloudy';
    else if (hour >= 20 || hour < 6) derived = 'overcast';
    setWeatherCondition(mapWeatherCondition(derived));
  }, [weatherPrefEnabled]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  useEffect(() => {
    let mounted = true;
    phase4Client
      .get<Category[]>('/home/categories')
      .then((res: { data: Category[] }) => {
        if (mounted) setCategories(res.data || []);
      })
      .catch(() => {
        if (mounted) setCategories([]);
      })
      .finally(() => {
        if (mounted) setCategoriesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    phase4Client
      .get<FeaturedProduct[]>('/home/featured')
      .then((res: { data: FeaturedProduct[] }) => {
        if (mounted) setFeatured(res.data || []);
      })
      .catch(() => {
        if (mounted) setFeatured([]);
      })
      .finally(() => {
        if (mounted) setFeaturedLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    phase4Client
      .get<Way[]>('/home/ways')
      .then((res: { data: Way[] }) => {
        if (mounted) setWays(res.data || []);
      })
      .catch(() => {
        if (mounted) setWays([]);
      })
      .finally(() => {
        if (mounted) setWaysLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const bgColor =
    colorTemp === 'warm' ? '#FAF8F4' : colorTemp === 'cool' ? '#F7F9FA' : jarsBackground;

  const openCart = () => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('CartScreen');
  };

  const openProfile = () => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('Profile');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} testID="home-screen">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <View style={styles.actions}>
            <Pressable onPress={() => navigation.navigate('Favorites')} style={styles.iconBtn}>
              <Heart color="#333" size={24} />
            </Pressable>
            <Pressable onPress={openCart} style={styles.iconBtn}>
              <ShoppingCart color="#333" size={24} />
            </Pressable>
            <Pressable onPress={openProfile} style={styles.iconBtn}>
              <User color="#333" size={24} />
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.locationRow}>
          <MapPin color={jarsPrimary} size={16} />
          <Text style={styles.pickupText}>Pickup from:</Text>
          <Text style={styles.locationText}>Downtown</Text>
          <ChevronDown color="#777" size={16} />
        </Pressable>

        <View style={styles.searchRow}>
          <Search color="#777" size={20} style={styles.searchIcon} />
          <TextInput
            placeholder="Search Products"
            placeholderTextColor="#777"
            style={styles.searchInput}
          />
          <Pressable style={[styles.searchBtn, { backgroundColor: jarsPrimary }]}>
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
        </View>
      </View>

      <OfflineNotice />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Price Drop</Text>
          <Text style={styles.heroSub}>New Everyday Low Pricing</Text>
          <Pressable style={styles.heroBtn}>
            <Text style={[styles.heroBtnText, { color: jarsPrimary }]}>Shop Deli</Text>
          </Pressable>
        </View>

        {/* AI Strain Finder CTA */}
        <Pressable
          style={[styles.strainFinderCTA, { backgroundColor: jarsSecondary }]}
          onPress={() => {
            hapticLight();
            navigation.navigate('StrainFinder');
          }}
        >
          <View style={styles.strainFinderContent}>
            <Text style={styles.strainFinderTitle}>🧠 Find My Perfect Strain</Text>
            <Text style={styles.strainFinderSubtitle}>
              Let AI help you discover products tailored to your needs
            </Text>
          </View>
          <Text style={styles.strainFinderArrow}>→</Text>
        </Pressable>

        {isLoading && <ForYouTodaySkeleton />}
        {forYou && !isLoading && (
          <ForYouTodayCard
            data={forYou}
            onSelectProduct={id => navigation.navigate('ProductDetail', { slug: id })}
            onSeeAll={() => navigation.navigate('ShopScreen')}
          />
        )}

        {/* Weather-aware recommendations (minimal footprint) */}
        {weatherPrefHydrated && weatherPrefEnabled && weatherCondition && (
          <WeatherForYouRail
            condition={weatherCondition}
            limit={8}
            onSelectProduct={id => navigation.navigate('ProductDetail', { slug: id })}
            onSeeAll={() => navigation.navigate('ShopScreen', { weatherFilter: weatherCondition })}
          />
        )}

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: jarsPrimary }]}>Shop By Categories</Text>
          <Pressable onPress={() => navigation.navigate('ShopScreen')}>
            <Text style={[styles.seeMore, { color: jarsPrimary }]}>See More</Text>
          </Pressable>
        </View>
        {categoriesLoading ? (
          <View style={styles.categoryGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: '#E0E0E0' }]} />
                <View
                  style={{ width: 40, height: 10, backgroundColor: '#E0E0E0', borderRadius: 4 }}
                />
              </View>
            ))}
          </View>
        ) : categories.length > 0 ? (
          <View style={styles.categoryGrid}>
            {categories.map(cat => (
              <Pressable
                key={cat.id}
                onPress={() => navigation.navigate('ShopScreen')}
                style={styles.categoryCard}
              >
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                </View>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No categories available.</Text>
        )}

        {/* Featured Products */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: jarsPrimary }]}>Featured Products</Text>
          <Pressable onPress={shopCTAPulse.onPress}>
            <Animated.Text
              style={[styles.seeMore, { color: jarsPrimary }, shopCTAPulse.pulseStyle]}
            >
              Shop All
            </Animated.Text>
          </Pressable>
        </View>
        {featuredLoading ? (
          <View style={styles.productGrid}>
            {Array.from({ length: 2 }).map((_, i) => (
              <View key={i} style={[styles.productCard, { backgroundColor: '#E0E0E0' }]} />
            ))}
          </View>
        ) : featured.length > 0 ? (
          <View style={styles.productGrid}>
            {featured.map(item => (
              <Pressable
                key={item.id}
                style={[styles.productCard, { borderColor: jarsPrimary }]}
                onPress={() => navigation.navigate('ProductDetail', { slug: item.id })}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, { backgroundColor: '#E0E0E0' }]} />
                )}
                <Text style={[styles.productName, { color: jarsPrimary }]}>{item.name}</Text>
                <Text style={[styles.productPrice, { color: jarsSecondary }]}>
                  ${item.price.toFixed(2)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No featured products.</Text>
        )}

        {/* Your Weed Your Way */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: jarsPrimary }]}>Your Weed Your Way</Text>
          <Pressable onPress={() => navigation.navigate('ShopScreen')}>
            <Text style={[styles.seeMore, { color: jarsPrimary }]}>See More</Text>
          </Pressable>
        </View>
        {waysLoading ? (
          <View style={styles.waysGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.wayCard}>
                <View style={[styles.wayImage, { backgroundColor: '#E0E0E0' }]} />
                <View
                  style={{ width: 80, height: 12, backgroundColor: '#E0E0E0', borderRadius: 4 }}
                />
              </View>
            ))}
          </View>
        ) : ways.length > 0 ? (
          <View style={styles.waysGrid}>
            {ways.map(w => (
              <Pressable
                key={w.id}
                onPress={() => navigation.navigate('ShopScreen')}
                style={styles.wayCard}
              >
                <View style={styles.wayImage} />
                <Text style={styles.wayLabel}>{w.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No ways to shop.</Text>
        )}

        {/* Educational Content CTA */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: jarsPrimary }]}>Educational Resources</Text>
        </View>
        <Pressable
          testID="terpene-wheel-cta"
          onPress={terpeneWheelPulse.onPress}
          style={styles.terpeneWheelCard}
        >
          <Animated.View style={[styles.terpeneWheelContent, terpeneWheelPulse.pulseStyle]}>
            <Text style={styles.terpeneWheelTitle}>🌿 Explore Terpenes</Text>
            <Text style={styles.terpeneWheelDescription}>
              Discover the aromatic compounds that give cannabis its unique scents and effects
            </Text>
          </Animated.View>
        </Pressable>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable
          onPress={() => navigation.navigate('HomeScreen')}
          style={styles.navItem}
          testID="home-tab"
        >
          <Home color={jarsPrimary} size={24} />
          <Text style={[styles.navLabel, { color: jarsPrimary }]}>Home</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('ShopScreen')}
          style={styles.navItem}
          testID="shop-tab"
        >
          <Menu color="#666" size={24} />
          <Text style={styles.navLabel}>Shop</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('Favorites')}
          style={styles.navItem}
          testID="deals-tab"
        >
          <Heart color="#666" size={24} />
          <Text style={styles.navLabel}>Deals</Text>
        </Pressable>
        <Pressable onPress={openCart} style={styles.navItem} testID="cart-tab">
          <ShoppingCart color="#666" size={24} />
          <Text style={styles.navLabel}>Cart</Text>
        </Pressable>
        <Pressable onPress={openProfile} style={styles.navItem} testID="profile-tab">
          <User color="#666" size={24} />
          <Text style={styles.navLabel}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 32, height: 32 },
  actions: { flexDirection: 'row' },
  iconBtn: { marginLeft: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  pickupText: { marginLeft: 4, fontSize: 14 },
  locationText: { marginLeft: 4, fontSize: 14, color: '#333' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  searchIcon: { marginLeft: 8, position: 'absolute' },
  searchInput: {
    flex: 1,
    backgroundColor: '#EEEEEE',
    borderRadius: 12,
    paddingVertical: 8,
    paddingLeft: 36,
    fontSize: 15,
  },
  searchBtn: { marginLeft: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  scroll: { paddingBottom: 80 },
  hero: {
    height: 180,
    borderRadius: 16,
    backgroundColor: '#2E5D46',
    marginHorizontal: 16,
    marginTop: 16,
    justifyContent: 'center',
    paddingLeft: 16,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
  heroSub: { color: '#FFFFFF', fontSize: 18, marginBottom: 12 },
  heroBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 16,
  },
  heroBtnText: { fontSize: 16, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  seeMore: { fontSize: 14, fontWeight: '500' },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  categoryCard: { width: '30%', alignItems: 'center', marginBottom: 16 },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryEmoji: { fontSize: 28 },
  categoryLabel: { fontSize: 14 },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderRadius: 16,
    padding: 8,
    marginBottom: 16,
  },
  productImage: { width: '100%', height: 120, borderRadius: 12, marginBottom: 8 },
  productName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: '700' },
  waysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  wayCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  wayImage: { width: 96, height: 96, backgroundColor: '#EEE', borderRadius: 12, marginBottom: 8 },
  wayLabel: { fontSize: 14, fontWeight: '500' },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 12 },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#DDD',
    paddingVertical: 8,
  },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  terpeneWheelCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  terpeneWheelContent: {
    flexDirection: 'column',
  },
  terpeneWheelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2E7D32',
  },
  terpeneWheelDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  strainFinderCTA: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  strainFinderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  strainFinderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  strainFinderSubtitle: {
    fontSize: 14,
    color: '#E8F5E8',
    flex: 1,
  },
  strainFinderArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    marginLeft: 12,
  },
});
