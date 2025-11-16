// src/navigation/types.ts

// Navigation stack type definitions for the modular navigation structure
export type RootNavigatorParamList = {
  OnboardingFlow: undefined;
  AuthFlow: undefined;
  HomeScreen: undefined;
  ShopFlow: undefined;
  CheckoutFlow: undefined;
  AccountFlow: undefined;
  ContentFlow: undefined;
};

// Legacy type maintained for backward compatibility
export type RootStackParamList = {
  SplashScreen: undefined;
  Onboarding: undefined;
  AgeVerification: undefined;
  LoginSignUpDecision: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  OTPScreen: undefined;
  StoreSelection: undefined;
  HomeScreen: undefined;
  // Allow optional weather-based filtering when navigating from Weather rail
  ShopScreen: { weatherFilter?: string } | undefined;
  ProductList: undefined;
  ProductDetail: { slug: string };
  CartScreen: undefined;
  Checkout: undefined;
  OrderConfirmation: undefined;
  OrderTracking: { status?: string };
  OrderHistory: undefined;
  OrderDetails: { order: any };
  StoreLocator: undefined;
  StoreLocatorMap: undefined;
  StoreLocatorList: undefined;
  StoreDetails: { store: any };
  Profile: undefined;
  EditProfile: { profile?: any };
  Favorites: undefined;
  SavedAddresses: undefined;
  AddAddress: undefined;
  EditAddress: { address: any };
  SavedPayments: undefined;
  AddPayment: undefined;
  EditPayment: { payment: any };
  LoyaltyProgram: undefined;
  Notifications: undefined;
  PrivacySettings: undefined;
  AppSettings: undefined;
  HelpFAQ: undefined;
  ContactUs: undefined;
  EducationalGreenhouse: undefined;
  ArticleList: undefined;
  /** Now requires a slug param */
  ArticleDetail: { slug: string };
  TerpeneWheel: undefined;
  CommunityGarden: undefined;
  ConciergeChat: undefined;
  DataTransparency: undefined;
  PrivacyIntelligence: undefined; // no param change, just for completeness
  AccessibilitySettings: undefined;
  Awards: undefined;
  /** New Legal route */
  Legal: undefined;
  MyJars: undefined;
  JournalEntry: { item: import('../@types/jars').StashItem; journalEntry?: any };
  MyJarsInsights: undefined;
  EthicalAIDashboard: undefined;
  LanguageSelection: undefined;
  StrainFinder: undefined;
};
