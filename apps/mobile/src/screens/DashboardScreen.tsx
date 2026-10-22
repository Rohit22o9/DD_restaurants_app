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

interface DashboardScreenProps {
  navigation: any;
  user: any;
  restaurant: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  navigation,
  user,
  restaurant,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      const res = await mobileApi.getDashboard();
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, []);

  const { counts, urgentUpdates, recentUpdates } = data || {};
  const awaitingCount = counts?.awaitingResponse || 0;
  const unreadCount = counts?.newCount || 0;
  const completedCount = counts?.recentlyCompleted || 0;

  return (
    <View style={styles.container}>
      <Header
        title={restaurant?.name || "Kitchen Partner"}
        subtitle={`ID: ${restaurant?.code || 'DD-PARTNER'} • Live Partner`}
        unreadCount={counts?.unreadNotifications || 0}
        onNotificationPress={() => navigation.navigate('Notifications')}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.forest]} />
        }
      >
        {/* Simple Welcome Greeting */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.greetingTitle}>Hi, {user?.name ? user.name.split(' ')[0] : 'Chef'} 👋</Text>
            <Text style={styles.greetingSub}>Daily Drop Kitchen Operations</Text>
          </View>
          <View style={styles.liveStatusPill}>
            <View style={styles.greenPulse} />
            <Text style={styles.liveStatusText}>Active</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.urgent} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Primary Action Hero Card (Clean & Focused) */}
        {awaitingCount > 0 ? (
          <TouchableOpacity
            style={styles.heroActionCard}
            onPress={() => navigation.navigate('Updates', { filter: 'awaiting_response' })}
            activeOpacity={0.85}
          >
            <View style={styles.heroLeft}>
              <View style={styles.heroBadge}>
                <Ionicons name="time" size={14} color="#C05621" />
                <Text style={styles.heroBadgeText}>ACTION REQUIRED</Text>
              </View>
              <Text style={styles.heroCountText}>
                {awaitingCount} {awaitingCount === 1 ? 'Update' : 'Updates'} Pending
              </Text>
              <Text style={styles.heroDesc}>
                Requires confirmation or meal batch response
              </Text>
            </View>
            <View style={styles.heroArrowBtn}>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.heroAllCaughtUpCard}>
            <View style={styles.caughtUpIconWrap}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.forest} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.caughtUpTitle}>All Caught Up!</Text>
              <Text style={styles.caughtUpDesc}>No pending confirmations required from your kitchen.</Text>
            </View>
          </View>
        )}

        {/* 2-Column Simple Quick Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statBox}
            onPress={() => navigation.navigate('Updates', { filter: 'unread' })}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="mail-unread-outline" size={18} color={COLORS.forest} />
            </View>
            <View>
              <Text style={styles.statNumber}>{unreadCount}</Text>
              <Text style={styles.statLabel}>Unread Notices</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statBox}
            onPress={() => navigation.navigate('Responses')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: '#EBF3FE' }]}>
              <Ionicons name="checkmark-done" size={18} color="#2B6CB0" />
            </View>
            <View>
              <Text style={styles.statNumber}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* URGENT PRIORITY SECTION (If Any) */}
        {urgentUpdates && urgentUpdates.length > 0 && (
          <View style={styles.urgentSection}>
            <View style={styles.urgentHeaderRow}>
              <Ionicons name="flame" size={16} color={COLORS.urgent} />
              <Text style={styles.urgentSectionTitle}>Urgent Announcements</Text>
            </View>

            {urgentUpdates.map((u: any) => (
              <TouchableOpacity
                key={u.id}
                style={styles.urgentItemCard}
                onPress={() => navigation.navigate('UpdateDetail', { updateId: u.id })}
                activeOpacity={0.8}
              >
                <View style={styles.urgentCardTop}>
                  <Text style={styles.urgentCategory}>{u.category}</Text>
                  {u.attachmentCount > 0 && (
                    <View style={styles.attachmentTag}>
                      <Ionicons name="attach" size={12} color={COLORS.forest} />
                      <Text style={styles.attachmentText}>{u.attachmentCount}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.urgentItemTitle}>{u.title}</Text>
                <Text style={styles.urgentItemMsg} numberOfLines={2}>{u.message}</Text>

                <View style={styles.urgentCardBottom}>
                  <Text style={styles.urgentDeadline}>
                    {u.deadlineAt ? `Deadline: ${new Date(u.deadlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Immediate Attention'}
                  </Text>
                  <View style={styles.urgentActionBtn}>
                    <Text style={styles.urgentActionText}>Respond</Text>
                    <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* RECENT UPDATES FEED */}
        <View style={styles.feedSection}>
          <View style={styles.feedHeaderRow}>
            <Text style={styles.feedTitle}>Kitchen Updates</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Updates')}>
              <Text style={styles.seeAllText}>View All ({recentUpdates?.length || 0})</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.forest} style={{ padding: 30 }} />
          ) : recentUpdates && recentUpdates.length > 0 ? (
            recentUpdates.map((u: any) => {
              const isUrgent = u.priority === 'urgent';
              const isHigh = u.priority === 'high';
              const isSubmitted = ['response_submitted', 'response_reviewed'].includes(u.recipientStatus);

              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.cleanCard, u.isUnread && styles.unreadCard]}
                  onPress={() => navigation.navigate('UpdateDetail', { updateId: u.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.tagRow}>
                      <View style={[
                        styles.priorityPill,
                        isUrgent ? styles.pillUrgent : isHigh ? styles.pillHigh : styles.pillNormal
                      ]}>
                        <Text style={[
                          styles.priorityText,
                          isUrgent ? styles.textUrgent : isHigh ? styles.textHigh : styles.textNormal
                        ]}>
                          {u.priority.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.categoryText}>{u.category}</Text>
                    </View>

                    {u.isUnread && <View style={styles.unreadIndicator} />}
                  </View>

                  <Text style={styles.cardTitle}>{u.title}</Text>
                  <Text style={styles.cardExcerpt} numberOfLines={2}>{u.message}</Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>
                      {new Date(u.publishedAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>

                    <View style={[
                      styles.statusPill,
                      isSubmitted ? styles.statusGreen : styles.statusAmber
                    ]}>
                      <Text style={[
                        styles.statusText,
                        isSubmitted ? styles.statusTextGreen : styles.statusTextAmber
                      ]}>
                        {isSubmitted ? 'Responded' : 'Awaiting Response'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-done-circle" size={40} color={COLORS.forest} />
              <Text style={styles.emptyTitle}>Kitchen Briefings Up to Date</Text>
              <Text style={styles.emptySub}>No active operational notices pending for your kitchen.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAF8',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
    marginTop: 2,
  },
  liveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  greenPulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
  },
  liveStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  errorText: {
    fontSize: 12,
    color: '#E53E3E',
  },
  heroActionCard: {
    backgroundColor: '#FFFAF0',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#FEEBC8',
    marginBottom: 14,
    shadowColor: '#C05621',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  heroLeft: {
    flex: 1,
    marginRight: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C05621',
    letterSpacing: 0.5,
  },
  heroCountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7B341E',
  },
  heroDesc: {
    fontSize: 11,
    color: '#9C4221',
    marginTop: 2,
  },
  heroArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DD6B20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAllCaughtUpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 12,
  },
  caughtUpIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caughtUpTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A202C',
  },
  caughtUpDesc: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#EBF1ED',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
  },
  statLabel: {
    fontSize: 10,
    color: '#718096',
    fontWeight: '600',
  },
  urgentSection: {
    marginBottom: 20,
  },
  urgentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  urgentSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.urgent,
    letterSpacing: 0.2,
  },
  urgentItemCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FEB2B2',
    marginBottom: 10,
  },
  urgentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  urgentCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C53030',
  },
  attachmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FED7D7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  attachmentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9B2C2C',
  },
  urgentItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#742A2A',
    marginBottom: 4,
  },
  urgentItemMsg: {
    fontSize: 11,
    color: '#9B2C2C',
    lineHeight: 16,
    marginBottom: 10,
  },
  urgentCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FED7D7',
  },
  urgentDeadline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C53030',
  },
  urgentActionBtn: {
    backgroundColor: '#E53E3E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  urgentActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  feedSection: {
    marginBottom: 20,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A202C',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.forest,
  },
  cleanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EBF1ED',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadCard: {
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.forest,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillUrgent: { backgroundColor: '#FFF5F5' },
  pillHigh: { backgroundColor: '#FFFAF0' },
  pillNormal: { backgroundColor: '#E8F5E9' },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textUrgent: { color: '#E53E3E' },
  textHigh: { color: '#DD6B20' },
  textNormal: { color: '#2E7D32' },
  categoryText: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '600',
  },
  unreadIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.forest,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
    lineHeight: 18,
  },
  cardExcerpt: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 16,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
  },
  dateText: {
    fontSize: 11,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusGreen: { backgroundColor: '#E8F5E9' },
  statusAmber: { backgroundColor: '#FFFAF0' },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusTextGreen: { color: '#2E7D32' },
  statusTextAmber: { color: '#DD6B20' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBF1ED',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A202C',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
    textAlign: 'center',
  },
});

