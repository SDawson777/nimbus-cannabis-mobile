import { Buffer } from 'buffer';

import auth from '@react-native-firebase/auth';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';

import { useUserProfile, UserProfile } from '../api/hooks/useUserProfile';
import logger from '../lib/logger';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptic';
import { saveSecure, getSecure, deleteSecure } from '../utils/secureStorage';
import { authClient } from '../clients/authClient';

export interface User extends UserProfile {}

export interface AuthContextType {
  token: string | null;
  setToken: (__token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  data: UserProfile | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: async () => {},
  clearAuth: async () => {},
  data: undefined,
  isLoading: false,
  isError: false,
  error: undefined,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [token, setTokenState] = useState<string | null>(null);

  const setToken = async (newToken: string) => {
    setTokenState(newToken);
    await saveSecure('jwtToken', newToken);
    const user = auth().currentUser;
    if (user?.displayName) await saveSecure('userName', user.displayName);
    if (user?.email) await saveSecure('userEmail', user.email);
  };

  const clearAuth = async () => {
    setTokenState(null);
    await Promise.all([
      deleteSecure('jwtToken'),
      deleteSecure('userName'),
      deleteSecure('userEmail'),
    ]);
  };

  const isExpired = (t: string) => {
    try {
      const [, payload] = t.split('.');
      const { exp } = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
      return exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadAuth = async () => {
      try {
        const storedToken = await getSecure('jwtToken');
        if (storedToken) {
          if (isExpired(storedToken)) {
            await clearAuth();
            Alert.alert('Session expired', 'Please log in again.');
          } else {
            const pref = await getSecure('useBiometricAuth');
            if (pref !== 'false') {
              try {
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const enrolled = await LocalAuthentication.isEnrolledAsync();
                if (hasHardware && enrolled) {
                  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
                  const useFace = types.includes(
                    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
                  );
                  const usePrint = types.includes(
                    LocalAuthentication.AuthenticationType.FINGERPRINT
                  );
                  const promptMessage = useFace
                    ? 'Unlock Nimbus with Face ID'
                    : usePrint
                      ? 'Unlock Nimbus with Touch ID'
                      : 'Unlock Nimbus';
                  hapticLight();
                  const authPromise = LocalAuthentication.authenticateAsync({
                    promptMessage,
                    disableDeviceFallback: true,
                    cancelLabel: 'Cancel',
                  });
                  const result = await Promise.race([
                    authPromise,
                    new Promise<LocalAuthentication.LocalAuthenticationResult>(res =>
                      setTimeout(() => res({ success: false } as any), 10000)
                    ),
                  ]);
                  if (result.success) {
                    if (!cancelled) {
                      hapticMedium();
                      setTokenState(storedToken);
                    }
                    return;
                  }
                  hapticHeavy();
                } else if (!hasHardware) {
                  Alert.alert('Biometric unlock not available on this device.');
                }
              } catch (bioErr) {
                logger.warn('Biometric prompt failed / skipped', { error: bioErr });
              }
            }
            if (!cancelled) setTokenState(storedToken);
          }
          return; // done handling stored token path
        }

        // Normalization: if no stored server token but a Firebase user exists, exchange its ID token
        const fbUser = auth()?.currentUser;
        if (fbUser) {
          try {
            const idToken = await fbUser.getIdToken();
            const resp = await authClient.post('/auth/login', { idToken });
            const serverToken = (resp?.data as { token?: string })?.token;
            if (serverToken && !isExpired(serverToken)) {
              if (!cancelled) await setToken(serverToken); // setToken persists to secure storage
              return;
            }
          } catch (ex) {
            logger.warn('Firebase ID token exchange failed', { error: ex });
          }
        }
      } catch (e) {
        logger.warn('Failed to load auth from storage', { error: e });
      }
    };
    loadAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const { data, isLoading, isError, error } = useUserProfile();

  return (
    <AuthContext.Provider value={{ token, setToken, clearAuth, data, isLoading, isError, error }}>
      {children}
    </AuthContext.Provider>
  );
};
