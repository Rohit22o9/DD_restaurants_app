import React from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

// Screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { UpdatesScreen } from '../screens/UpdatesScreen';
import { ResponsesScreen } from '../screens/ResponsesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { UpdateDetailScreen } from '../screens/UpdateDetailScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

interface TabProps {
  user: any;
  restaurant: any;
  onLogout: () => void;
}

function MainTabs({ user, restaurant, onLogout }: TabProps) {
  return (
    <Tab.Navigator
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
          let iconName: any = 'home';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Updates') {
            iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
          } else if (route.name === 'Responses') {
            iconName = focused ? 'checkmark-done-circle' : 'checkmark-done-circle-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" options={{ tabBarLabel: 'Home' }}>
        {props => <DashboardScreen {...props} user={user} restaurant={restaurant} />}
      </Tab.Screen>

      <Tab.Screen name="Updates" options={{ tabBarLabel: 'Updates' }}>
        {props => <UpdatesScreen {...props} />}
      </Tab.Screen>

      <Tab.Screen name="Responses" options={{ tabBarLabel: 'Responses' }}>
        {props => <ResponsesScreen {...props} />}
      </Tab.Screen>

      <Tab.Screen name="Profile" options={{ tabBarLabel: 'Profile' }}>
        {props => <ProfileScreen {...props} user={user} restaurant={restaurant} onLogout={onLogout} />}
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
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="MainTabs">
        {props => <MainTabs {...props} user={user} restaurant={restaurant} onLogout={onLogout} />}
      </Stack.Screen>

      <Stack.Screen
        name="UpdateDetail"
        component={UpdateDetailScreen}
        options={{ animation: 'slide_from_bottom' }}
      />

      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
    </Stack.Navigator>
  );
};
