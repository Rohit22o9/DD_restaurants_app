import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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

interface UpdatesScreenProps {
  navigation: any;
  route: any;
}

export const UpdatesScreen: React.FC<UpdatesScreenProps> = ({ navigation, route }) => {
  const initialFilter = route.params?.filter || 'all';
  const [filter, setFilter] = useState(initialFilter);
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'urgent', label: 'Urgent' },
    { id: 'awaiting_response', label: 'Awaiting Response' },
    { id: 'acknowledged', label: 'Acknowledged' },
    { id: 'completed', label: 'Completed' },
    { id: 'overdue', label: 'Overdue' },
  ];

  const fetchUpdates = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await mobileApi.getUpdates({ filter, sort, search });
      setUpdates(res.data);
    } catch (err: any) {
      console.warn('Error fetching updates:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUpdates(false);
    // Auto-poll every 5 seconds for real-time live updates
    const interval = setInterval(() => {
      fetchUpdates(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [filter, sort, search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUpdates(false);
  }, [filter, sort, search]);

  return (
    <View style={styles.container}>
      <Header
        title="Kitchen Briefings"
        subtitle="Operational instructions & quota notices"
        onNotificationPress={() => navigation.navigate('Notifications')}
      />

      {/* Search Input */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={16} color={COLORS.muted} style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search updates by keyword..."
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabScrollWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {filterTabs.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabBtn, filter === t.id && styles.tabBtnActive]}
              onPress={() => setFilter(t.id)}
            >
              <Text style={[styles.tabBtnText, filter === t.id && styles.tabBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Updates List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.forest]} />}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.forest} style={{ marginTop: 40 }} />
        ) : updates.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="documents-outline" size={44} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No Updates Found</Text>
            <Text style={styles.emptyDesc}>No operational updates match your selected filter.</Text>
          </View>
        ) : (
          updates.map((u: any) => (
            <TouchableOpacity
              key={u.id}
              style={[
                styles.card,
                u.isUnread && styles.unreadCard,
                u.priority === 'urgent' && styles.urgentCardBorder,
              ]}
              onPress={() => navigation.navigate('UpdateDetail', { updateId: u.id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badges}>
                  <View style={[styles.priorityBadge, {
                    backgroundColor: u.priority === 'urgent' ? COLORS.urgentBg : u.priority === 'high' ? COLORS.amberBg : COLORS.mintSubtle
                  }]}>
                    <Text style={[styles.priorityBadgeText, {
                      color: u.priority === 'urgent' ? COLORS.urgent : u.priority === 'high' ? COLORS.amber : COLORS.forest
                    }]}>
                      {u.priority.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.categoryText}>{u.category}</Text>
                </View>

                {u.isUnread && <View style={styles.unreadDot} />}
              </View>

              <Text style={styles.titleText}>{u.title}</Text>
              <Text style={styles.descText} numberOfLines={2}>{u.message}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.timeInfo}>
                  <Text style={styles.dateText}>
                    {new Date(u.publishedAt || Date.now()).toLocaleDateString()}
                  </Text>
                  {u.deadlineAt && (
                    <Text style={[styles.deadlineText, u.isOverdue && { color: COLORS.urgent }]}>
                      • {u.isOverdue ? 'Overdue' : `Due: ${new Date(u.deadlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </Text>
                  )}
                </View>

                {/* Status Indicator */}
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
                    {u.recipientStatus === 'response_submitted' ? 'Responded' :
                     u.recipientStatus === 'response_reviewed' ? 'Reviewed' :
                     u.recipientStatus === 'acknowledged' ? 'Acknowledged' : 'Action Required'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
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
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.dark,
  },
  tabScrollWrap: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mintBorder,
    backgroundColor: COLORS.white,
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.mintSubtle,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
  },
  tabBtnActive: {
    backgroundColor: COLORS.forest,
    borderColor: COLORS.forest,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  tabBtnTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.forest,
    backgroundColor: '#FCFFFD',
  },
  urgentCardBorder: {
    borderWidth: 1.5,
    borderColor: COLORS.urgentBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  categoryText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.forest,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 4,
  },
  descText: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.mintBorder,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  deadlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.amber,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyWrap: {
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
  emptyDesc: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
});
