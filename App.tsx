// src/App.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Sentry from '@sentry/react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Preload cart hook early to hydrate store & cache
import { useCart } from './src/hooks/useCart';
import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineNotice from './src/components/OfflineNotice';
import { CMSPreviewProvider } from './src/context/CMSPreviewContext';
import { AuthProvider } from './src/context/AuthContext';
import { BrandProvider } from './src/context/BrandContext';
import { LoyaltyProvider } from './src/context/LoyaltyContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { StoreProvider } from './src/context/StoreContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { RootStackParamList } from './src/navigation/types';
import AccessibilitySettingsScreen from './src/screens/AccessibilitySettingsScreen';
import AddAddressScreen from './src/screens/AddAddressScreen';
import AddPaymentScreen from './src/screens/AddPaymentScreen';
import AppSettingsScreen from './src/screens/AppSettingsScreen';
import ArticleDetailScreen from './src/screens/ArticleDetailScreen';
import ArticleListScreen from './src/screens/ArticleListScreen';
import AwardsScreen from './src/screens/AwardsScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import CommunityGardenScreen from './src/screens/CommunityGardenScreen';
import ConciergeChatScreen from './src/screens/ConciergeChatScreen';
import ContactUsScreen from './src/screens/ContactUsScreen';
import DataTransparencyScreen from './src/screens/DataTransparencyScreen';
import EditAddressScreen from './src/screens/EditAddressScreen';
import EditPaymentScreen from './src/screens/EditPaymentScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import EducationalGreenhouseScreen from './src/screens/EducationalGreenhouseScreen';
import EthicalAIDashboardScreen from './src/screens/EthicalAIDashboardScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import HelpFAQScreen from './src/screens/HelpFAQScreen';
import HomeScreen from './src/screens/HomeScreen';
import JournalEntryScreen from './src/screens/JournalEntryScreen';
import LanguageSelectionScreen from './src/screens/LanguageSelectionScreen';
import LoginScreen from './src/screens/LoginScreen';
import LoginSignUpDecisionScreen from './src/screens/LoginSignUpDecisionScreen';
import LoyaltyProgramDetailsScreen from './src/screens/LoyaltyProgramDetailsScreen';
import MyJarsInsightsScreen from './src/screens/MyJarsInsightsScreen';
import MyJarsScreen from './src/screens/MyJarsScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import OTPScreen from './src/screens/OTPScreen';
import OnboardingPager from './src/screens/OnboardingPager';
import OrderConfirmationScreen from './src/screens/OrderConfirmationScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';
import PrivacyIntelligenceScreen from './src/screens/PrivacyIntelligenceScreen';
import PrivacySettingsScreen from './src/screens/PrivacySettingsScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import ProductListScreen from './src/screens/ProductListScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SavedAddressesScreen from './src/screens/SavedAddressesScreen';
import SavedPaymentsScreen from './src/screens/SavedPaymentsScreen';
import ShopScreen from './src/screens/ShopScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import SplashScreenWrapper from './src/screens/SplashScreenWrapper';
import StoreDetailsScreen from './src/screens/StoreDetailsScreen';
import StoreLocatorListScreen from './src/screens/StoreLocatorListScreen';
import StoreLocatorMapScreen from './src/screens/StoreLocatorMapScreen';
import StoreLocatorScreen from './src/screens/StoreLocatorScreen';
import StoreSelectionScreen from './src/screens/StoreSelectionScreen';
import StrainFinderScreen from './src/screens/StrainFinderScreen';
import TerpeneWheelScreen from './src/screens/TerpeneWheelScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import AgeVerificationScreen from './src/screens/onboarding/AgeVerificationScreen';
import OrderHistoryScreen from './src/screens/orders/OrderHistoryScreen';
import LegalScreen from './src/screens/profile/LegalScreen';
import { API_BASE_URL } from './src/utils/apiConfig';
import { getAuthToken } from './src/utils/auth';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enableAutoSessionTracking: true,
  enableNative: true,
  tracesSampleRate: 1.0,
  environment: __DEV__ ? 'development' : 'production',
});

const DEBUG = process.env.EXPO_PUBLIC_DEBUG === 'true';
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.debug(...args);
  }
};

messaging().setBackgroundMessageHandler(async remoteMessage => {
  debugLog('Message handled in the background!', remoteMessage);
});

const TOKEN_SYNC_KEY = 'pendingFcmToken';

const syncTokenToBackend = async (token: string, attempt = 0): Promise<void> => {
  const baseUrl = API_BASE_URL;
  try {
    const authToken = await getAuthToken();
    const res = await fetch(`${baseUrl}/profile/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    await AsyncStorage.removeItem(TOKEN_SYNC_KEY);
  } catch (err) {
    console.error('Sync token to backend failed:', err);
    await AsyncStorage.setItem(TOKEN_SYNC_KEY, token);
    const delay = Math.min(2 ** attempt * 1000, 60000);
    setTimeout(() => {
      syncTokenToBackend(token, attempt + 1);
    }, delay);
  }
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | undefined>(undefined);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  // Invoke cart hook once at the top-level so cart cache & store hydrate ASAP.
  // Safe: hook internally uses react-query and side effects only.
  try {
    useCart();
  } catch (_e) {
    // If hook throws during edge initialization (e.g., environment mismatch), ignore.
  }

  useEffect(() => {
    const checkFlag = async () => {
      const verified = await AsyncStorage.getItem('ageVerified');
      setInitialRoute(verified === 'true' ? 'SplashScreen' : 'AgeVerification');
    };
    checkFlag();
  }, []);

  useEffect(() => {
    const resendPending = async () => {
      const pending = await AsyncStorage.getItem(TOKEN_SYNC_KEY);
      if (pending) {
        await syncTokenToBackend(pending);
      }
    };
    resendPending();
  }, []);

  useEffect(() => {
    const initMessaging = async () => {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const token = await messaging().getToken();
        debugLog('FCM Token:', token);
        await syncTokenToBackend(token);
      } else {
        setNotificationsEnabled(false);
        Alert.alert('Notifications Disabled', 'Push notifications are turned off.', [
          { text: 'OK' },
        ]);
      }

      const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
        const { title, body } = remoteMessage.notification || {};
        Alert.alert(title || 'Notification', body, [{ text: 'OK' }]);
      });

      const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(remoteMessage => {
        debugLog('Notification opened app:', remoteMessage.notification);
      });

      const initialMessage = await messaging().getInitialNotification();
      if (initialMessage) {
        debugLog('App opened from quit state:', initialMessage.notification);
      }

      return () => {
        unsubscribeOnMessage();
        unsubscribeOnNotificationOpened();
      };
    };

    initMessaging();
  }, []);

  if (!initialRoute) return null;

  return (
    <ErrorBoundary>
      <StripeProvider
        publishableKey={process.env.STRIPE_PUBLISHABLE_KEY || ''}
        merchantIdentifier={process.env.STRIPE_MERCHANT_ID || 'merchant.com.placeholder'}
      >
        <StoreProvider>
          <LoyaltyProvider>
            <BrandProvider>
              <ThemeProvider>
                <SettingsProvider>
                  <CMSPreviewProvider>
                    <AuthProvider>
                      <QueryClientProvider client={queryClient}>
                        <OfflineNotice />
                        {!notificationsEnabled && (
                          <View
                            accessible
                            accessibilityLabel="notifications-disabled"
                            style={{ padding: 8 }}
                          >
                            <Text>Push notifications are disabled.</Text>
                          </View>
                        )}
                        <NavigationContainer>
                          <View testID="app-root" style={{ flex: 1 }}>
                            <Stack.Navigator
                              initialRouteName={initialRoute}
                              screenOptions={{ headerShown: false }}
                            >
                              <Stack.Screen name="SplashScreen" component={SplashScreenWrapper} />
                              <Stack.Screen name="Onboarding" component={OnboardingPager} />
                              <Stack.Screen
                                name="AgeVerification"
                                component={AgeVerificationScreen}
                              />
                              <Stack.Screen
                                name="LoginSignUpDecision"
                                component={LoginSignUpDecisionScreen}
                              />
                              <Stack.Screen name="Login" component={LoginScreen} />
                              <Stack.Screen name="SignUp" component={SignUpScreen} />
                              <Stack.Screen
                                name="ForgotPassword"
                                component={ForgotPasswordScreen}
                              />
                              <Stack.Screen name="OTPScreen" component={OTPScreen} />
                              <Stack.Screen
                                name="StoreSelection"
                                component={StoreSelectionScreen}
                              />
                              <Stack.Screen name="HomeScreen" component={HomeScreen} />
                              <Stack.Screen name="ShopScreen" component={ShopScreen} />
                              <Stack.Screen name="StrainFinder" component={StrainFinderScreen} />
                              <Stack.Screen name="ProductList" component={ProductListScreen} />
                              <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
                              <Stack.Screen name="CartScreen" component={CartScreen} />
                              <Stack.Screen name="Checkout" component={CheckoutScreen} />
                              <Stack.Screen
                                name="OrderConfirmation"
                                component={OrderConfirmationScreen}
                              />
                              <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
                              <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
                              <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
                              <Stack.Screen name="StoreLocator" component={StoreLocatorScreen} />
                              <Stack.Screen
                                name="StoreLocatorMap"
                                component={StoreLocatorMapScreen}
                              />
                              <Stack.Screen
                                name="StoreLocatorList"
                                component={StoreLocatorListScreen}
                              />
                              <Stack.Screen name="StoreDetails" component={StoreDetailsScreen} />
                              <Stack.Screen name="Profile" component={ProfileScreen} />
                              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                              <Stack.Screen name="Favorites" component={FavoritesScreen} />
                              <Stack.Screen
                                name="SavedAddresses"
                                component={SavedAddressesScreen}
                              />
                              <Stack.Screen name="AddAddress" component={AddAddressScreen} />
                              <Stack.Screen name="EditAddress" component={EditAddressScreen} />
                              <Stack.Screen name="SavedPayments" component={SavedPaymentsScreen} />
                              <Stack.Screen name="AddPayment" component={AddPaymentScreen} />
                              <Stack.Screen name="EditPayment" component={EditPaymentScreen} />
                              <Stack.Screen
                                name="LoyaltyProgram"
                                component={LoyaltyProgramDetailsScreen}
                              />
                              <Stack.Screen
                                name="Notifications"
                                component={NotificationSettingsScreen}
                              />
                              <Stack.Screen
                                name="PrivacySettings"
                                component={PrivacySettingsScreen}
                              />
                              <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
                              <Stack.Screen
                                name="LanguageSelection"
                                component={LanguageSelectionScreen}
                              />
                              <Stack.Screen name="HelpFAQ" component={HelpFAQScreen} />
                              <Stack.Screen name="ContactUs" component={ContactUsScreen} />
                              <Stack.Screen
                                name="EducationalGreenhouse"
                                component={EducationalGreenhouseScreen}
                              />
                              <Stack.Screen name="ArticleList" component={ArticleListScreen} />
                              <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
                              <Stack.Screen name="TerpeneWheel" component={TerpeneWheelScreen} />
                              <Stack.Screen
                                name="CommunityGarden"
                                component={CommunityGardenScreen}
                              />
                              <Stack.Screen name="ConciergeChat" component={ConciergeChatScreen} />
                              <Stack.Screen
                                name="DataTransparency"
                                component={DataTransparencyScreen}
                              />
                              <Stack.Screen
                                name="PrivacyIntelligence"
                                component={PrivacyIntelligenceScreen}
                              />
                              <Stack.Screen
                                name="AccessibilitySettings"
                                component={AccessibilitySettingsScreen}
                              />
                              <Stack.Screen name="Awards" component={AwardsScreen} />
                              <Stack.Screen name="Legal" component={LegalScreen} />
                              <Stack.Screen name="MyJars" component={MyJarsScreen} />
                              <Stack.Screen name="JournalEntry" component={JournalEntryScreen} />
                              <Stack.Screen
                                name="MyJarsInsights"
                                component={MyJarsInsightsScreen}
                              />
                              <Stack.Screen
                                name="EthicalAIDashboard"
                                component={EthicalAIDashboardScreen}
                              />
                            </Stack.Navigator>
                          </View>
                        </NavigationContainer>
                      </QueryClientProvider>
                    </AuthProvider>
                  </CMSPreviewProvider>
                </SettingsProvider>
              </ThemeProvider>
            </BrandProvider>
          </LoyaltyProvider>
        </StoreProvider>
      </StripeProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(App);
