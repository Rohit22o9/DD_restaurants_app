import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { COLORS } from './src/theme/colors';
import { storage } from './src/services/storage';
import { mobileApi } from './src/services/api';

// Screens & Navigator
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [restaurant, setRestaurant] = useState<any | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = await storage.getToken();
        if (storedToken) {
          const res = await mobileApi.getMe();
          if (res.user.role === 'restaurant_partner') {
            setToken(storedToken);
            setUser(res.user);
            setRestaurant(res.restaurant);
          } else {
            await storage.clearAuth();
          }
        }
      } catch (err) {
        await storage.clearAuth();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (newToken: string, newUser: any, newRestaurant: any) => {
    setToken(newToken);
    setUser(newUser);
    setRestaurant(newRestaurant);
  };

  const handleLogout = async () => {
    await storage.clearAuth();
    setToken(null);
    setUser(null);
    setRestaurant(null);
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.forest} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!token || !user ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <NavigationContainer>
          <RootNavigator user={user} restaurant={restaurant} onLogout={handleLogout} />
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
