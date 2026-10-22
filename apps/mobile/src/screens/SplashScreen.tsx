import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../theme/colors';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image
          source={require('../../assets/daily_drop_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.pill}>
          <Text style={styles.pillText}>RESTAURANT PARTNER</Text>
        </View>
        <Text style={styles.subtext}>Operational Broadcast & Meal Planning Hub</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.spinner} />
        <Text style={styles.version}>v2.0 • Official Daily Drop Platform</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 60,
    marginBottom: 16,
  },
  pill: {
    backgroundColor: COLORS.forest,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  pillText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtext: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.forest,
    borderTopColor: 'transparent',
    marginBottom: 12,
  },
  version: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },
});
