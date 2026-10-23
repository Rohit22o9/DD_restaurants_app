import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { mobileApi } from '../services/api';

interface LiveAlertBannerProps {
  navigationRef: any;
  onUnreadCountChange?: (count: number) => void;
}

export const LiveAlertBanner: React.FC<LiveAlertBannerProps> = ({
  navigationRef,
  onUnreadCountChange,
}) => {
  const insets = useSafeAreaInsets();
  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const isFirstRunRef = useRef(true);
  const dismissTimerRef = useRef<any>(null);

  const checkLiveNotifications = async () => {
    try {
      const res = await mobileApi.getNotifications();
      const notifs = res.data || [];

      // Calculate unread count
      const unread = notifs.filter((n: any) => !n.isRead);
      if (onUnreadCountChange) {
        onUnreadCountChange(unread.length);
      }

      if (isFirstRunRef.current) {
        // Memorize existing notifications on initial launch
        notifs.forEach((n: any) => knownNotificationIdsRef.current.add(n.id));
        isFirstRunRef.current = false;
        return;
      }

      // Find any newly arrived unread notification
      const newNotif = notifs.find(
        (n: any) => !n.isRead && !knownNotificationIdsRef.current.has(n.id)
      );

      if (newNotif) {
        knownNotificationIdsRef.current.add(newNotif.id);
        triggerLiveBanner(newNotif);
      }
    } catch (err: any) {
      // Background poll - ignore transient network hiccups
    }
  };

  const triggerLiveBanner = (notif: any) => {
    // Vibrate phone for attention
    Vibration.vibrate([0, 400, 200, 400]);

    setActiveAlert(notif);

    // Slide down animation
    Animated.spring(slideAnim, {
      toValue: Math.max(insets.top, 12),
      useNativeDriver: true,
      bounciness: 6,
    }).start();

    // Auto dismiss after 8 seconds
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      dismissBanner();
    }, 8000);
  };

  const dismissBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setActiveAlert(null);
    });
  };

  const handleBannerPress = () => {
    if (!activeAlert) return;
    const targetUpdateId = activeAlert.resourceId || activeAlert.resource_id;
    dismissBanner();

    if (navigationRef?.current) {
      if (targetUpdateId) {
        navigationRef.current.navigate('UpdateDetail', { id: targetUpdateId });
      } else {
        navigationRef.current.navigate('MainTabs', { screen: 'Updates' });
      }
    }
  };

  useEffect(() => {
    checkLiveNotifications();
    // Poll every 5 seconds for real-time live updates
    const interval = setInterval(checkLiveNotifications, 5000);
    return () => {
      clearInterval(interval);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  if (!activeAlert) return null;

  const isUrgent =
    activeAlert.title?.toLowerCase().includes('urgent') ||
    activeAlert.message?.toLowerCase().includes('urgent');

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.bannerCard, isUrgent ? styles.urgentCard : styles.normalCard]}
        onPress={handleBannerPress}
        activeOpacity={0.9}
      >
        <View style={styles.iconCircle}>
          <Ionicons
            name={isUrgent ? 'warning' : 'megaphone'}
            size={20}
            color={isUrgent ? '#DC2626' : COLORS.forest}
          />
        </View>

        <View style={styles.textWrap}>
          <View style={styles.topBadgeRow}>
            <View style={[styles.badge, isUrgent ? styles.badgeUrgent : styles.badgeNormal]}>
              <Text style={styles.badgeText}>
                {isUrgent ? '🚨 URGENT BROADCAST' : '🔔 NEW UPDATE'}
              </Text>
            </View>
            <Text style={styles.timeHint}>Just now</Text>
          </View>

          <Text style={styles.bannerTitle} numberOfLines={1}>
            {activeAlert.title?.replace(/^\[URGENT\]\s*/i, '')}
          </Text>
          <Text style={styles.bannerMessage} numberOfLines={2}>
            {activeAlert.message}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={dismissBanner}>
          <Ionicons name="close" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    zIndex: 9999,
    elevation: 99,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  normalCard: {
    borderColor: COLORS.forest,
  },
  urgentCard: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeNormal: {
    backgroundColor: '#ECFDF5',
  },
  badgeUrgent: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.forest,
    letterSpacing: 0.4,
  },
  timeHint: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 15,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 6,
  },
});
