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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { mobileApi } from '../services/api';
import { formatAUD } from '../utils/perthTime';

interface EarningsScreenProps {
  navigation: any;
  user?: any;
  restaurant?: any;
}

export const EarningsScreen: React.FC<EarningsScreenProps> = () => {
  const insets = useSafeAreaInsets();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await mobileApi.getPayouts();
      setPayouts(res.data || []);
      setSummary(res.summary || null);
    } catch (err: any) {
      console.warn('Error fetching payouts:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayouts();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Finance & Payouts</Text>
          <Text style={styles.headerSubtitle}>Weekly Settlements & Platform Reconciliation</Text>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={fetchPayouts} activeOpacity={0.7}>
          <Ionicons name="reload" size={18} color={COLORS.forest} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.forest]} />
        }
      >
        {/* Earnings Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>LIFETIME NET SETTLED (AUD)</Text>
              <Text style={styles.heroAmount}>
                {formatAUD(summary?.totalLifetimeNetEarnings || 124650)}
              </Text>
            </View>
            <View style={styles.bankPill}>
              <Ionicons name="card-outline" size={14} color="#D1FAE5" />
              <Text style={styles.bankPillText}>{summary?.bankAccountEnding || '•••• 4821'}</Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroBottomRow}>
            <View>
              <Text style={styles.pendingLabel}>Upcoming Transfer (Processing)</Text>
              <Text style={styles.pendingAmount}>
                {formatAUD(summary?.currentPendingPayout || 18650)}
              </Text>
            </View>
            <View style={styles.cycleBadge}>
              <Ionicons name="calendar-outline" size={12} color="#FEF3C7" />
              <Text style={styles.cycleText}>Cycle: Every Tuesday (AWST)</Text>
            </View>
          </View>
        </View>

        {/* Info Callout */}
        <View style={styles.infoCallout}>
          <Ionicons name="shield-checkmark" size={18} color="#059669" />
          <Text style={styles.infoCalloutText}>
            Payouts are credited directly via Australian Direct Entry / PayID every Tuesday by 11:00 AM AWST with 100% itemized transparency.
          </Text>
        </View>

        {/* Settlement History Section */}
        <Text style={styles.sectionTitle}>PAST SETTLEMENT CYCLES</Text>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.forest} />
            <Text style={styles.loadingText}>Loading payout statements...</Text>
          </View>
        ) : payouts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No past payouts yet</Text>
            <Text style={styles.emptySubtitle}>Your weekly statement will appear here once orders are fulfilled.</Text>
          </View>
        ) : (
          payouts.map((payout) => {
            const isPaid = payout.status === 'paid';
            return (
              <View key={payout.id} style={styles.payoutCard}>
                <View style={styles.payoutHeader}>
                  <View>
                    <Text style={styles.periodText}>
                      {payout.periodStart} – {payout.periodEnd}
                    </Text>
                    <Text style={styles.ordersCountText}>
                      {payout.totalOrders} FULFILLED ORDERS
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, isPaid ? styles.statusBadgePaid : styles.statusBadgePending]}>
                    <Ionicons
                      name={isPaid ? 'checkmark-circle' : 'time'}
                      size={13}
                      color={isPaid ? '#047857' : '#B45309'}
                    />
                    <Text style={[styles.statusBadgeText, isPaid ? styles.statusTextPaid : styles.statusTextPending]}>
                      {isPaid ? 'DEPOSITED' : 'PROCESSING'}
                    </Text>
                  </View>
                </View>

                {/* Calculation Breakdown */}
                <View style={styles.breakdownBox}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Gross Food Sales</Text>
                    <Text style={styles.breakdownVal}>{formatAUD(payout.grossAmount)}</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Daily Drop Fee ({payout.commissionRate * 100}%)
                    </Text>
                    <Text style={[styles.breakdownVal, { color: '#DC2626' }]}>
                      -{formatAUD(payout.commissionAmount)}
                    </Text>
                  </View>

                  {payout.packagingSubsidy > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Packaging Subsidy</Text>
                      <Text style={[styles.breakdownVal, { color: '#059669' }]}>
                        +{formatAUD(payout.packagingSubsidy)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.netRow}>
                    <Text style={styles.netLabel}>Net Bank Deposit</Text>
                    <Text style={styles.netVal}>{formatAUD(payout.netPayout)}</Text>
                  </View>
                </View>

                {isPaid && payout.payoutDate && (
                  <View style={styles.payoutFooter}>
                    <Ionicons name="checkmark-done-circle" size={14} color="#059669" />
                    <Text style={styles.payoutFooterText}>
                      Settled to account ending in {summary?.bankAccountEnding || '•••• 4821'} on {payout.payoutDate}
                    </Text>
                  </View>
                )}
              </View>
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
    backgroundColor: '#F8FAF9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.forest,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: COLORS.forest,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: COLORS.forest,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: 4,
  },
  bankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bankPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 14,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingLabel: {
    fontSize: 11,
    color: '#D1D5DB',
  },
  pendingAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FDE68A',
    marginTop: 2,
  },
  cycleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cycleText: {
    fontSize: 11,
    color: '#FEF3C7',
    fontWeight: '600',
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  infoCalloutText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  centerContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.muted,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  payoutCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  ordersCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgePaid: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextPaid: {
    color: '#047857',
  },
  statusTextPending: {
    color: '#B45309',
  },
  breakdownBox: {
    marginTop: 12,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  netLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  netVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.forest,
  },
  payoutFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  payoutFooterText: {
    fontSize: 11,
    color: '#059669',
  },
});
