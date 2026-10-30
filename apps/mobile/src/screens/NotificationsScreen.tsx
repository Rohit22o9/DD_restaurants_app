import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { Header } from '../components/Header';
import { mobileApi } from '../services/api';

interface NotificationsScreenProps {
  navigation: any;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await mobileApi.getNotifications();
      setNotifications(res.data);
    } catch (err: any) {
      console.warn('Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifs();
  }, []);

  const handlePress = async (notif: any) => {
    if (!notif.isRead) {
      mobileApi.markNotificationRead(notif.id).catch(console.error);
      setNotifications(notifications.map(n => (n.id === notif.id ? { ...n, isRead: true } : n)));
    }
    if (notif.data?.orderId) {
      navigation.navigate('MainTabs', { screen: 'Orders' });
    } else if (notif.data?.updateId) {
      navigation.navigate('UpdateDetail', { updateId: notif.data.updateId });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await mobileApi.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err: any) {
      console.warn(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title="Kitchen Notifications"
        subtitle="Operational alerts & review feedback"
      />

      <View style={styles.topBar}>
        <Text style={styles.countText}>{notifications.length} Alerts</Text>
        {notifications.some(n => !n.isRead) && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markReadText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.forest]} />}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.forest} style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={44} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptySub}>No new operational notifications at this time.</Text>
          </View>
        ) : (
          notifications.map(n => {
            const isUrgent = n.type === 'urgent_update';
            const isOverdue = n.type === 'overdue';
            const isReviewed = n.type === 'response_reviewed';

            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, !n.isRead && styles.unreadCard]}
                onPress={() => handlePress(n)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={
                      isUrgent
                        ? 'flame'
                        : isOverdue
                        ? 'alert-circle'
                        : isReviewed
                        ? 'shield-checkmark'
                        : 'notifications'
                    }
                    size={20}
                    color={
                      isUrgent
                        ? COLORS.urgent
                        : isOverdue
                        ? COLORS.amber
                        : isReviewed
                        ? COLORS.forest
                        : COLORS.forest
                    }
                  />
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.title} numberOfLines={1}>{n.title}</Text>
                    {!n.isRead && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.message} numberOfLines={2}>{n.message}</Text>
                  <Text style={styles.timeText}>{new Date(n.createdAt).toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mintBorder,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.dark,
  },
  markReadText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.forest,
  },
  scroll: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    marginBottom: 10,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.forest,
    backgroundColor: '#FCFFFD',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.mintSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    flex: 1,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.forest,
    marginLeft: 6,
  },
  message: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
});
