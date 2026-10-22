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

  return (
    <View style={styles.container}>
      <Header
        title={restaurant?.name || "Partner Kitchen"}
        subtitle={`ID: ${restaurant?.code || 'DD-PARTNER'}`}
        unreadCount={counts?.unreadNotifications || 0}
        onNotificationPress={() => navigation.navigate('Notifications')}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.forest]} />}
      >
        {/* Welcome Greeting Card */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingTextWrap}>
            <Text style={styles.welcomeLabel}>CHEF & OPERATIONS DESK</Text>
            <Text style={styles.greetingTitle}>Hello, {user?.name || 'Partner'}</Text>
            <Text style={styles.greetingSub}>
              Review your meal prep allocations and acknowledge new operations briefs.
            </Text>
          </View>
          <View style={styles.storeIconWrap}>
            <Ionicons name="restaurant" size={26} color={COLORS.forest} />
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.urgent} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Counter Pills */}
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={[styles.counterCard, { backgroundColor: COLORS.orangeLight }]}
            onPress={() => navigation.navigate('Updates', { filter: 'awaiting_response' })}
            activeOpacity={0.7}
          >
            <Text style={[styles.counterNum, { color: COLORS.orange }]}>{counts?.awaitingResponse || 0}</Text>
            <Text style={styles.counterLabel}>Awaiting My Response</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.counterCard, { backgroundColor: COLORS.mintSubtle }]}
            onPress={() => navigation.navigate('Updates', { filter: 'unread' })}
            activeOpacity={0.7}
          >
            <Text style={[styles.counterNum, { color: COLORS.forest }]}>{counts?.newCount || 0}</Text>
            <Text style={styles.counterLabel}>Unread Updates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.counterCard, { backgroundColor: COLORS.blueBg }]}
            onPress={() => navigation.navigate('Updates', { filter: 'completed' })}
            activeOpacity={0.7}
          >
            <Text style={[styles.counterNum, { color: COLORS.blue }]}>{counts?.recentlyCompleted || 0}</Text>
            <Text style={styles.counterLabel}>Completed</Text>
          </TouchableOpacity>
        </View>

        {/* PROMINENT URGENT UPDATES SECTION */}
        {urgentUpdates && urgentUpdates.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <View style={styles.urgentTag}>
                <Ionicons name="flame" size={14} color={COLORS.white} />
                <Text style={styles.urgentTagText}>URGENT ACTION REQUIRED ({urgentUpdates.length})</Text>
              </View>
            </View>

            {urgentUpdates.map((u: any) => (
              <TouchableOpacity
                key={u.id}
                style={styles.urgentCard}
                onPress={() => navigation.navigate('UpdateDetail', { updateId: u.id })}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <View style={styles.badgeUrgent}>
                    <Text style={styles.badgeUrgentText}>URGENT</Text>
                  </View>
                  <Text style={styles.cardCategory}>{u.category}</Text>
                  {u.attachmentCount > 0 && (
                    <View style={styles.attBadge}>
                      <Ionicons name="attach" size={12} color={COLORS.forest} />
                      <Text style={styles.attBadgeText}>{u.attachmentCount}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.urgentTitle}>{u.title}</Text>
                <Text style={styles.urgentDesc} numberOfLines={2}>{u.message}</Text>

                <View style={styles.cardFooter}>
                  {u.deadlineAt ? (
                    <View style={styles.deadlineWrap}>
                      <Ionicons name="time-outline" size={13} color={COLORS.urgent} />
                      <Text style={styles.deadlineText}>
                        Deadline: {new Date(u.deadlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  ) : <View />}

                  <View style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>Confirm Kitchen Status</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.white} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* RECENT OPERATIONAL UPDATES SECTION */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderSimple}>
            <Text style={styles.sectionTitle}>Recent Kitchen Updates</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Updates')}>
              <Text style={styles.seeAll}>See All ({counts?.awaitingResponse || 0})</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.forest} style={{ padding: 20 }} />
          ) : recentUpdates && recentUpdates.length > 0 ? (
            recentUpdates.map((u: any) => {
              const isUnread = u.isUnread;
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.updateCard, isUnread && styles.unreadCard]}
                  onPress={() => navigation.navigate('UpdateDetail', { updateId: u.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.priorityPill, {
                      backgroundColor: u.priority === 'urgent' ? COLORS.urgentBg : u.priority === 'high' ? COLORS.amberBg : COLORS.mintSubtle
                    }]}>
                      <Text style={[styles.priorityPillText, {
                        color: u.priority === 'urgent' ? COLORS.urgent : u.priority === 'high' ? COLORS.amber : COLORS.forest
                      }]}>
                        {u.priority.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.cardCategory}>{u.category}</Text>
                    {isUnread && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.updateTitle}>{u.title}</Text>
                  <Text style={styles.updateDesc} numberOfLines={2}>{u.message}</Text>

                  <View style={styles.cardBottomRow}>
                    <Text style={styles.timeText}>
                      {new Date(u.publishedAt || Date.now()).toLocaleDateString()}
                    </Text>

                    <View style={[styles.statusBadge, {
                      backgroundColor: ['response_submitted', 'response_reviewed'].includes(u.recipientStatus)
                        ? COLORS.mint
                        : u.recipientStatus === 'acknowledged'
                        ? COLORS.blueBg
                        : COLORS.amberBg
                    }]}>
                      <Text style={[styles.statusBadgeText, {
                        color: ['response_submitted', 'response_reviewed'].includes(u.recipientStatus)
                          ? COLORS.forest
                          : u.recipientStatus === 'acknowledged'
                          ? COLORS.blue
                          : COLORS.amber
                      }]}>
                        {u.recipientStatus === 'response_submitted' ? 'Response In' :
                         u.recipientStatus === 'response_reviewed' ? 'Reviewed' :
                         u.recipientStatus === 'acknowledged' ? 'Acknowledged' : 'Needs Response'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={36} color={COLORS.forest} />
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
    backgroundColor: COLORS.cream,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  greetingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    shadowColor: COLORS.forestDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  greetingTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  welcomeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.forest,
    letterSpacing: 0.8,
  },
  greetingTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.dark,
    marginTop: 2,
  },
  greetingSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
    lineHeight: 15,
  },
  storeIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.urgentBg,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.urgent,
  },
  counterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  counterCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    alignItems: 'center',
  },
  counterNum: {
    fontSize: 20,
    fontWeight: '900',
  },
  counterLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  urgentTag: {
    backgroundColor: COLORS.urgent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  urgentTagText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  urgentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.urgentBorder,
    marginBottom: 10,
    shadowColor: COLORS.urgent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  badgeUrgent: {
    backgroundColor: COLORS.urgentBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeUrgentText: {
    color: COLORS.urgent,
    fontSize: 9,
    fontWeight: '900',
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
    flex: 1,
  },
  attBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  attBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.forest,
  },
  urgentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 4,
  },
  urgentDesc: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.mintBorder,
  },
  deadlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.urgent,
  },
  actionBtn: {
    backgroundColor: COLORS.forest,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeaderSimple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
  },
  seeAll: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.forest,
  },
  updateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
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
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.forest,
  },
  updateTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 4,
  },
  updateDesc: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 15,
    marginBottom: 8,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.mintBorder,
  },
  timeText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
    textAlign: 'center',
  },
});
