// src/context/ThemeContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import * as Location from 'expo-location';
import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { Appearance } from 'react-native';

import logger from '../lib/logger';
import { logEvent } from '../utils/analytics';
import { useBrandData } from './BrandContext';
const EXPO_PUBLIC_OPENWEATHER_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_KEY as string;

// Tuned threshold constants
const COOL_THRESHOLD_METRIC = 12; // °C below which we consider it 'cool'
const WARM_THRESHOLD_METRIC = 22; // °C above which we consider it 'warm'
const COOL_THRESHOLD_IMPERIAL = 54; // °F below which we consider it 'cool'
const WARM_THRESHOLD_IMPERIAL = 72; // °F above which we consider it 'warm'

// Cloud-cover adjustment thresholds (percent)
const SUNNY_CLOUD_THRESHOLD = 30; // clouds% below which we boost toward 'warm'
const CLOUDY_CLOUD_THRESHOLD = 70; // clouds% above which we boost toward 'cool'

type ColorTemp = 'warm' | 'neutral' | 'cool';
type WeatherSource = 'openweather' | 'time-of-day';

// Dev simulation options
interface WeatherSimulation {
  enabled: boolean;
  condition: 'rain' | 'sunny' | 'cloudy' | 'snow' | null;
  temperature?: number; // Override temperature
}

interface DebugInfo {
  weatherSource: WeatherSource;
  lastUpdated: Date;
  fallbackReason?: string;
  actualTemperature?: number;
  actualCondition?: string;
  cloudCover?: number;
  location?: { lat: number; lon: number };
  simulation?: WeatherSimulation;
}

interface ThemeContextValue {
  colorTemp: ColorTemp;
  jarsPrimary: string;
  jarsSecondary: string;
  jarsBackground: string;
  loading: boolean;
  debugInfo: DebugInfo;
  // Dev simulation controls
  weatherSimulation: WeatherSimulation;
  setWeatherSimulation: (simulation: WeatherSimulation) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  colorTemp: 'neutral',
  jarsPrimary: '#2E5D46',
  jarsSecondary: '#8CD24C',
  jarsBackground: '#F9F9F9',
  loading: false,
  debugInfo: {
    weatherSource: 'time-of-day',
    lastUpdated: new Date(),
  },
  weatherSimulation: {
    enabled: false,
    condition: null,
  },
  setWeatherSimulation: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Get brand colors from BrandContext
  const brand = useBrandData();

  const [colorTemp, setColorTemp] = useState<ColorTemp>('neutral');
  const [loading, setLoading] = useState<boolean>(true);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    weatherSource: 'time-of-day',
    lastUpdated: new Date(),
  });
  const [weatherSimulation, setWeatherSimulation] = useState<WeatherSimulation>({
    enabled: false,
    condition: null,
  });

  // Load weather simulation settings from storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('weatherSimulation');
        if (stored) {
          const simulation = JSON.parse(stored) as WeatherSimulation;
          setWeatherSimulation(simulation);
        }
      } catch (_error) {
        // Ignore storage errors, use defaults
      }
    })();
  }, []);

  // Save weather simulation settings to storage
  const updateWeatherSimulation = async (simulation: WeatherSimulation) => {
    setWeatherSimulation(simulation);
    try {
      await AsyncStorage.setItem('weatherSimulation', JSON.stringify(simulation));
    } catch (error) {
      logger.warn('Failed to save weather simulation settings', { error });
    }
  };

  // Helper to apply weather simulation
  const applyWeatherSimulation = (
    baseTemp: ColorTemp,
    baseInfo: DebugInfo
  ): { temp: ColorTemp; info: DebugInfo } => {
    if (!weatherSimulation?.enabled || !weatherSimulation.condition) {
      return { temp: baseTemp, info: baseInfo };
    }

    let simulatedTemp: ColorTemp = baseTemp;
    const condition = weatherSimulation.condition;

    // Apply simulation logic
    switch (condition) {
      case 'rain':
      case 'snow':
        simulatedTemp = 'cool';
        break;
      case 'sunny':
        simulatedTemp = 'warm';
        break;
      case 'cloudy':
        simulatedTemp = 'neutral';
        break;
    }

    // Log simulation event
    logEvent('weather_theme_simulation', {
      condition,
      originalTemp: baseTemp,
      simulatedTemp,
      weatherSource: baseInfo.weatherSource,
    });

    return {
      temp: simulatedTemp,
      info: {
        ...baseInfo,
        simulation: weatherSimulation,
        actualCondition: condition,
      },
    };
  };

  // 1. Time-of-day fallback
  const computeTimeTemp = (): ColorTemp => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'warm'; // morning
    if (hour >= 17 && hour < 20) return 'warm'; // golden hour
    if (hour >= 12 && hour < 17) return 'neutral'; // midday
    return 'cool'; // evening/night
  };

  useEffect(() => {
    (async () => {
      try {
        // start with time-based
        let temp: ColorTemp = computeTimeTemp();
        let currentDebugInfo: DebugInfo = {
          weatherSource: 'time-of-day',
          lastUpdated: new Date(),
        };

        // Abort early if no API key provided
        if (!EXPO_PUBLIC_OPENWEATHER_KEY) {
          const reason = 'OpenWeather API key missing or invalid; using time-based theme.';
          logger.warn(reason);

          // Log fallback event
          logEvent('weather_theme_fallback', {
            reason: 'missing_api_key',
            fallbackSource: 'time-of-day',
            colorTemp: temp,
          });

          currentDebugInfo = {
            ...currentDebugInfo,
            fallbackReason: reason,
          };

          setDebugInfo(currentDebugInfo);

          // Apply simulation if enabled
          const { temp: finalTemp, info: finalInfo } = applyWeatherSimulation(
            temp,
            currentDebugInfo
          );
          setColorTemp(finalTemp);
          setDebugInfo(finalInfo);
          return;
        }

        // 2. Pull measurementSystem from first locale entry
        const { measurementSystem } = getLocales()[0];
        // measurementSystem is 'metric' | 'us' | 'uk' | null
        const usesImperial = measurementSystem === 'us';
        const units = usesImperial ? 'imperial' : 'metric';

        // 3. Request permission & fetch location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const { coords } = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = coords;

          // 4. Fetch weather with proper units
          const url =
            `https://api.openweathermap.org/data/2.5/weather` +
            `?lat=${latitude}&lon=${longitude}` +
            `&appid=${EXPO_PUBLIC_OPENWEATHER_KEY}` +
            `&units=${units}`;
          const resp = await fetch(url);
          if (!resp.ok) {
            const reason = `OpenWeather request failed with status ${resp.status}; using time-based theme.`;
            logger.warn(reason);

            // Log fallback event
            logEvent('weather_theme_fallback', {
              reason: 'api_error',
              statusCode: resp.status,
              fallbackSource: 'time-of-day',
              colorTemp: temp,
            });

            currentDebugInfo = {
              ...currentDebugInfo,
              fallbackReason: reason,
            };

            setDebugInfo(currentDebugInfo);

            // Apply simulation if enabled
            const { temp: finalTemp, info: finalInfo } = applyWeatherSimulation(
              temp,
              currentDebugInfo
            );
            setColorTemp(finalTemp);
            setDebugInfo(finalInfo);
            return;
          }

          const data = await resp.json();
          const current = data.main?.temp as number | undefined;
          const clouds = data.clouds?.all as number | undefined; // percent
          const weatherCondition = data.weather?.[0]?.main?.toLowerCase() || 'unknown';

          // Update debug info with successful OpenWeather data
          currentDebugInfo = {
            weatherSource: 'openweather',
            lastUpdated: new Date(),
            actualTemperature: current,
            actualCondition: weatherCondition,
            cloudCover: clouds,
            location: { lat: latitude, lon: longitude },
          };

          if (current !== undefined) {
            // 5a. Apply temperature thresholds
            if (usesImperial) {
              if (current < COOL_THRESHOLD_IMPERIAL) temp = 'cool';
              else if (current > WARM_THRESHOLD_IMPERIAL) temp = 'warm';
              else temp = 'neutral';
            } else {
              if (current < COOL_THRESHOLD_METRIC) temp = 'cool';
              else if (current > WARM_THRESHOLD_METRIC) temp = 'warm';
              else temp = 'neutral';
            }
          }

          if (clouds !== undefined) {
            // 5b. Adjust based on cloudiness
            if (clouds > CLOUDY_CLOUD_THRESHOLD) {
              temp = temp === 'warm' ? 'neutral' : 'cool';
            } else if (clouds < SUNNY_CLOUD_THRESHOLD) {
              temp = temp === 'cool' ? 'neutral' : 'warm';
            }
          }

          // Log successful OpenWeather usage
          logEvent('weather_theme_success', {
            weatherSource: 'openweather',
            colorTemp: temp,
            temperature: current,
            condition: weatherCondition,
            cloudCover: clouds,
            units,
          });
        } else {
          const reason = 'Location permission denied; using time-based theme.';
          logger.warn(reason);

          // Log fallback event
          logEvent('weather_theme_fallback', {
            reason: 'location_permission_denied',
            fallbackSource: 'time-of-day',
            colorTemp: temp,
          });

          currentDebugInfo = {
            ...currentDebugInfo,
            fallbackReason: reason,
          };
        }

        setDebugInfo(currentDebugInfo);

        // Apply simulation if enabled
        const { temp: finalTemp, info: finalInfo } = applyWeatherSimulation(temp, currentDebugInfo);
        setColorTemp(finalTemp);
        setDebugInfo(finalInfo);
      } catch (error) {
        const reason = 'ThemeContext weather failed, falling back to time-based';
        logger.warn(reason, { error });

        // Log fallback event
        logEvent('weather_theme_fallback', {
          reason: 'exception',
          error: error instanceof Error ? error.message : 'unknown',
          fallbackSource: 'time-of-day',
          colorTemp: computeTimeTemp(),
        });

        const fallbackInfo: DebugInfo = {
          weatherSource: 'time-of-day',
          lastUpdated: new Date(),
          fallbackReason: reason,
        };

        setDebugInfo(fallbackInfo);

        // Apply simulation if enabled
        const { temp: finalTemp, info: finalInfo } = applyWeatherSimulation(
          computeTimeTemp(),
          fallbackInfo
        );
        setColorTemp(finalTemp);
        setDebugInfo(finalInfo);
      } finally {
        setLoading(false);
      }
    })();
  }, [weatherSimulation]); // Re-run when simulation changes

  // 6. Dark-mode interplay with brand colors
  const isDark = Appearance.getColorScheme() === 'dark';

  // Helper function to darken colors for dark mode
  const adjustColorForDarkMode = (color: string) => {
    // Simple approach: if in dark mode, darken the color by reducing the brightness
    // For production, you might want a more sophisticated color manipulation
    if (!isDark) return color;

    // Extract RGB values and darken them
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 40);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 40);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 40);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const value: ThemeContextValue = {
    colorTemp,
    jarsPrimary: adjustColorForDarkMode(brand.primaryColor),
    jarsSecondary: adjustColorForDarkMode(brand.secondaryColor),
    jarsBackground: isDark ? '#121212' : '#F9F9F9',
    loading,
    debugInfo,
    weatherSimulation,
    setWeatherSimulation: updateWeatherSimulation,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
