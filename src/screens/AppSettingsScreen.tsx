import React, { useContext } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  Pressable,
  SafeAreaView,
  StyleSheet,
  LayoutAnimation,
  Alert,
} from 'react-native';
import { useAccessibilityStore } from '../state/accessibilityStore';
import { useTextScaling } from '../hooks/useTextScaling';
import { ThemeContext } from '../context/ThemeContext';

export default function AppSettingsScreen() {
  const {
    brandPrimary,
    brandSecondary,
    brandBackground,
    debugInfo,
    weatherSimulation,
    setWeatherSimulation,
  } = useContext(ThemeContext);
  const { scaleSize } = useTextScaling();
  const { textSize, setTextSize, highContrast, setHighContrast, reduceMotion, setReduceMotion } =
    useAccessibilityStore();

  const handleTextSizeCycle = () => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    const sizes = ['system', 'sm', 'md', 'lg', 'xl'] as const;
    const idx = sizes.indexOf(textSize);
    setTextSize(sizes[(idx + 1) % sizes.length]);
  };

  const handleHighContrastToggle = (value: boolean) => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setHighContrast(value);
  };

  const handleReduceMotionToggle = (value: boolean) => {
    // Don't animate the toggle that disables animations
    setReduceMotion(value);
  };

  const handleWeatherSimulationToggle = (enabled: boolean) => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setWeatherSimulation({
      ...weatherSimulation,
      enabled,
    });
  };

  const handleWeatherConditionChange = () => {
    const conditions: Array<'rain' | 'sunny' | 'cloudy' | 'snow' | null> = [
      null,
      'sunny',
      'cloudy',
      'rain',
      'snow',
    ];
    const currentIndex = conditions.indexOf(weatherSimulation.condition);
    const nextCondition = conditions[(currentIndex + 1) % conditions.length];

    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    setWeatherSimulation({
      ...weatherSimulation,
      condition: nextCondition,
    });
  };

  const showDebugInfoAlert = () => {
    const debugText = `
Weather Source: ${debugInfo.weatherSource}
Last Updated: ${debugInfo.lastUpdated.toLocaleString()}
${debugInfo.fallbackReason ? `Fallback Reason: ${debugInfo.fallbackReason}` : ''}
${debugInfo.actualTemperature ? `Temperature: ${debugInfo.actualTemperature}°` : ''}
${debugInfo.actualCondition ? `Condition: ${debugInfo.actualCondition}` : ''}
${debugInfo.cloudCover !== undefined ? `Cloud Cover: ${debugInfo.cloudCover}%` : ''}
${
  debugInfo.location
    ? `Location: ${debugInfo.location.lat.toFixed(4)}, ${debugInfo.location.lon.toFixed(4)}`
    : ''
}
${
  debugInfo.simulation?.enabled
    ? `Simulation: ${debugInfo.simulation?.condition ?? 'unknown'} (enabled)`
    : 'Simulation: disabled'
}
    `.trim();

    Alert.alert('Weather Debug Info', debugText, [{ text: 'OK' }]);
  };

  const showDemoBackendHelper = () => {
    const demoText = `
🔧 Demo Backend Options:

📱 Local Docker (Recommended):
http://localhost:3000

🌐 Production Demo:
https://jars-cannabis-mobile-app-production.up.railway.app

📧 Demo Credentials:
• buyer@demo.com / password123
• admin@demo.com / admin123  
• manager@demo.com / manager123

💡 To switch backends:
1. Stop the app (Cmd+C in terminal)
2. Set EXPO_PUBLIC_API_BASE_URL=<url>
3. Restart with: npm start

Docker Quick Start:
docker-compose up -d
npm run seed:demo
    `.trim();

    Alert.alert('Demo Backend Helper', demoText, [{ text: 'OK' }]);
  };

  const getConditionDisplayName = (condition: 'rain' | 'sunny' | 'cloudy' | 'snow' | null) => {
    if (!condition) return 'None';
    return condition.charAt(0).toUpperCase() + condition.slice(1);
  };

  const getConditionEmoji = (condition: 'rain' | 'sunny' | 'cloudy' | 'snow' | null) => {
    switch (condition) {
      case 'sunny':
        return '☀️';
      case 'cloudy':
        return '☁️';
      case 'rain':
        return '🌧️';
      case 'snow':
        return '❄️';
      default:
        return '🌤️';
    }
  };

  const textColor = highContrast ? '#000000' : brandPrimary;
  const backgroundColor = highContrast ? '#FFFFFF' : brandBackground;
  const accentColor = highContrast ? '#0000FF' : brandSecondary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          style={[
            styles.section,
            {
              color: textColor,
              fontSize: scaleSize(18),
            },
          ]}
        >
          Accessibility
        </Text>

        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color: textColor,
                fontSize: scaleSize(16),
              },
            ]}
          >
            Text Size
          </Text>
          <Pressable
            style={[
              styles.textSizeButton,
              {
                backgroundColor: highContrast ? '#E0E0E0' : '#F0F0F0',
              },
            ]}
            onPress={handleTextSizeCycle}
          >
            <Text
              style={[
                styles.textSizeText,
                {
                  color: textColor,
                  fontSize: scaleSize(14),
                },
              ]}
            >
              {textSize.toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color: textColor,
                fontSize: scaleSize(16),
              },
            ]}
          >
            High Contrast
          </Text>
          <Switch
            value={highContrast}
            onValueChange={handleHighContrastToggle}
            trackColor={{ false: '#E0E0E0', true: accentColor }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color: textColor,
                fontSize: scaleSize(16),
              },
            ]}
          >
            Reduce Motion
          </Text>
          <Switch
            value={reduceMotion}
            onValueChange={handleReduceMotionToggle}
            trackColor={{ false: '#E0E0E0', true: accentColor }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Text
          style={[
            styles.section,
            {
              color: textColor,
              fontSize: scaleSize(18),
            },
          ]}
        >
          Weather Theme (Dev)
        </Text>

        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color: textColor,
                fontSize: scaleSize(16),
              },
            ]}
          >
            Simulate Weather
          </Text>
          <Switch
            value={!!weatherSimulation?.enabled}
            onValueChange={handleWeatherSimulationToggle}
            trackColor={{ false: '#E0E0E0', true: accentColor }}
            thumbColor="#FFFFFF"
          />
        </View>

        {weatherSimulation?.enabled && (
          <View style={styles.row}>
            <Text
              style={[
                styles.label,
                {
                  color: textColor,
                  fontSize: scaleSize(16),
                },
              ]}
            >
              Weather Condition
            </Text>
            <Pressable
              style={[
                styles.conditionButton,
                {
                  backgroundColor: highContrast ? '#E0E0E0' : '#F0F0F0',
                },
              ]}
              onPress={handleWeatherConditionChange}
            >
              <Text style={styles.conditionEmoji}>
                {getConditionEmoji(weatherSimulation?.condition ?? null)}
              </Text>
              <Text
                style={[
                  styles.conditionText,
                  {
                    color: textColor,
                    fontSize: scaleSize(14),
                  },
                ]}
              >
                {getConditionDisplayName(weatherSimulation?.condition ?? null)}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color: textColor,
                fontSize: scaleSize(16),
              },
            ]}
          >
            Weather Debug Info
          </Text>
          <Pressable
            style={[
              styles.debugButton,
              {
                backgroundColor: highContrast ? '#E0E0E0' : '#F0F0F0',
              },
            ]}
            onPress={showDebugInfoAlert}
          >
            <Text
              style={[
                styles.debugButtonText,
                {
                  color: textColor,
                  fontSize: scaleSize(14),
                },
              ]}
            >
              View
            </Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color: textColor,
                fontSize: scaleSize(16),
              },
            ]}
          >
            Demo Backend Helper
          </Text>
          <Pressable
            style={[
              styles.debugButton,
              {
                backgroundColor: highContrast ? '#E0E0E0' : '#F0F0F0',
              },
            ]}
            onPress={showDemoBackendHelper}
          >
            <Text
              style={[
                styles.debugButtonText,
                {
                  color: textColor,
                  fontSize: scaleSize(14),
                },
              ]}
            >
              Info
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  section: { fontWeight: 'bold', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  label: { flex: 1 },
  textSizeButton: {
    padding: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  textSizeText: { fontWeight: '500' },
  conditionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    minWidth: 100,
    justifyContent: 'center',
    gap: 6,
  },
  conditionEmoji: {
    fontSize: 16,
  },
  conditionText: {
    fontWeight: '500',
  },
  debugButton: {
    padding: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  debugButtonText: {
    fontWeight: '500',
  },
});
