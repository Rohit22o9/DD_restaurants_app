import React, { useState, useRef } from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

// Screens
import { LiveOrdersScreen } from '../screens/LiveOrdersScreen';
import { MenuAvailabilityScreen } from '../screens/MenuAvailabilityScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { UpdatesScreen } from '../screens/UpdatesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ResponsesScreen } from '../screens/ResponsesScreen';
import { UpdateDetailScreen } from '../screens/UpdateDetailScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { LiveAlertBanner } from '../components/LiveAlertBanner';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

interface TabProps {
  user: any;
  restaurant: any;
  unreadCount: number;
  onLogout: () => void;
}

function MainTabs({ user, restaurant, unreadCount, onLogout }: TabProps) {
  return (
    <Tab.Navigator
      initialRouteName="Orders"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.forest,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.mintBorder,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'restaurant';
          if (route.name === 'Orders') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'Menu') {
            iconName = focused ? 'fast-food' : 'fast-food-outline';
          } else if (route.name === 'Updates') {
            iconName = focused ? 'megaphone' : 'megaphone-outline';
          } else if (route.name === 'Payouts') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Orders" options={{ tabBarLabel: 'Orders' }}>
        {(props) => <LiveOrdersScreen {...props} user={user} restaurant={restaurant} />}
      </Tab.Screen>

      <Tab.Screen name="Menu" options={{ tabBarLabel: 'Menu' }}>
        {(props) => <MenuAvailabilityScreen {...props} user={user} restaurant={restaurant} />}
      </Tab.Screen>

      <Tab.Screen
        name="Updates"
        options={{
          tabBarLabel: 'Updates',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800',
          },
        }}
      >
        {(props) => <UpdatesScreen {...props} />}
      </Tab.Screen>

      <Tab.Screen name="Payouts" options={{ tabBarLabel: 'Payouts' }}>
        {(props) => <EarningsScreen {...props} user={user} restaurant={restaurant} />}
      </Tab.Screen>

      <Tab.Screen name="Profile" options={{ tabBarLabel: 'Profile' }}>
        {(props) => <ProfileScreen {...props} user={user} restaurant={restaurant} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

interface RootNavigatorProps {
  user: any;
  restaurant: any;
  onLogout: () => void;
}

export const RootNavigator: React.FC<RootNavigatorProps> = ({ user, restaurant, onLogout }) => {
  const navigation = useNavigation<any>();
  const [unreadCount, setUnreadCount] = useState(0);
  const navRef = useRef(navigation);
  navRef.current = navigation;

  return (
    <View style={{ flex: 1 }}>
      {/* Global Real-Time Alert Banner (Pops down immediately on any screen when new update arrives) */}
      <LiveAlertBanner navigationRef={navRef} onUnreadCountChange={setUnreadCount} />

      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="MainTabs">
          {(props) => (
            <MainTabs
              {...props}
              user={user}
              restaurant={restaurant}
              unreadCount={unreadCount}
              onLogout={onLogout}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Dashboard">
          {(props) => <DashboardScreen {...props} user={user} restaurant={restaurant} />}
        </Stack.Screen>

        <Stack.Screen name="Responses" component={ResponsesScreen} />

        <Stack.Screen
          name="UpdateDetail"
          component={UpdateDetailScreen}
          options={{ animation: 'slide_from_bottom' }}
        />

        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    </View>
  );
};
