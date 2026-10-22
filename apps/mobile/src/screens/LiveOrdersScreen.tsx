import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { mobileApi } from '../services/api';

interface LiveOrdersScreenProps {
  navigation: any;
  user?: any;
  restaurant?: any;
}

export const LiveOrdersScreen: React.FC<LiveOrdersScreenProps> = ({
  navigation,
  user,
  restaurant,
}) => {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<any[]>([]);
  const [counts, setCounts] = useState({ incoming: 0, preparing: 0, ready: 0, dispatched: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<'incoming' | 'preparing' | 'ready' | 'dispatched'>('incoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dispatch PIN Modal state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [selectedOrderForPin, setSelectedOrderForPin] = useState<any | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const prevIncomingCountRef = useRef(0);

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await mobileApi.getOrders(activeTab);
      setOrders(res.data || []);
      if (res.counts) {
        // Trigger kitchen ring if new incoming order appeared
        if (soundAlertEnabled && res.counts.incoming > prevIncomingCountRef.current && prevIncomingCountRef.current !== 0) {
          triggerKitchenAlert();
        }
        prevIncomingCountRef.current = res.counts.incoming;
        setCounts(res.counts);
      }
    } catch (err: any) {
      console.warn('Error fetching orders:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const triggerKitchenAlert = () => {
    // Vibrate phone pattern: [wait, vibrate, wait, vibrate]
    Vibration.vibrate([0, 600, 250, 600, 250, 1000]);
    Alert.alert(
      '🔔 NEW ORDER RECEIVED!',
      'You have an incoming order requiring kitchen preparation. Please accept now.',
      [{ text: 'View Order', onPress: () => setActiveTab('incoming') }]
    );
  };

  useEffect(() => {
    fetchOrders();
    // Auto-poll orders every 10 seconds for live updates
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [activeTab]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      setActionLoading(orderId);
      await mobileApi.updateOrderStatus(orderId, nextStatus);
      await fetchOrders(true);
    } catch (err: any) {
      Alert.alert('Action Failed', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openPinModal = (order: any) => {
    setSelectedOrderForPin(order);
    setEnteredPin('');
    setPinError(null);
    setPinModalVisible(true);
  };

  const submitPinVerification = async () => {
    if (!enteredPin || enteredPin.length < 4) {
      setPinError('Please enter the 4-digit driver PIN.');
      return;
    }
    try {
      setActionLoading(selectedOrderForPin.id);
      await mobileApi.verifyDispatchPin(selectedOrderForPin.id, enteredPin);
      setPinModalVisible(false);
      Alert.alert('Handoff Complete ✅', `Order ${selectedOrderForPin.orderNumber} dispatched to rider!`);
      await fetchOrders(true);
      setActiveTab('dispatched');
    } catch (err: any) {
      setPinError(err.message || 'Incorrect PIN. Check the driver app screen.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'incoming') return o.status === 'incoming';
    if (activeTab === 'preparing') return o.status === 'preparing';
    if (activeTab === 'ready') return o.status === 'ready';
    if (activeTab === 'dispatched') return o.status === 'dispatched' || o.status === 'delivered';
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveIndicatorRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveBadgeText}>LIVE KDS</Text>
          </View>
          <Text style={styles.headerTitle}>Kitchen Orders</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.audioToggleBtn, soundAlertEnabled && styles.audioToggleActive]}
            onPress={() => {
              setSoundAlertEnabled(!soundAlertEnabled);
              if (!soundAlertEnabled) {
                Vibration.vibrate(200);
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={soundAlertEnabled ? 'volume-high' : 'volume-mute'}
              size={18}
              color={soundAlertEnabled ? COLORS.white : COLORS.muted}
            />
            <Text style={[styles.audioToggleText, soundAlertEnabled && styles.audioToggleTextActive]}>
              {soundAlertEnabled ? 'Sound ON' : 'Muted'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Incoming Order Alert Banner (if any unaccepted order) */}
      {counts.incoming > 0 && activeTab !== 'incoming' && (
        <TouchableOpacity
          style={styles.incomingBanner}
          onPress={() => setActiveTab('incoming')}
          activeOpacity={0.9}
        >
          <View style={styles.incomingBannerLeft}>
            <Ionicons name="notifications" size={20} color={COLORS.urgent} />
            <Text style={styles.incomingBannerText}>
              {counts.incoming} NEW {counts.incoming === 1 ? 'ORDER' : 'ORDERS'} AWAITING ACCEPTANCE!
            </Text>
          </View>
          <View style={styles.incomingBannerBadge}>
            <Text style={styles.incomingBannerAction}>VIEW NOW →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Pipeline Status Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'incoming' && styles.tabBtnActive]}
          onPress={() => setActiveTab('incoming')}
        >
          <Text style={[styles.tabLabel, activeTab === 'incoming' && styles.tabLabelActive]}>Incoming</Text>
          {counts.incoming > 0 && (
            <View style={[styles.tabBadge, activeTab === 'incoming' ? styles.tabBadgeActiveUrgent : styles.tabBadgeInactive]}>
              <Text style={styles.tabBadgeText}>{counts.incoming}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'preparing' && styles.tabBtnActive]}
          onPress={() => setActiveTab('preparing')}
        >
          <Text style={[styles.tabLabel, activeTab === 'preparing' && styles.tabLabelActive]}>In Prep</Text>
          {counts.preparing > 0 && (
            <View style={[styles.tabBadge, activeTab === 'preparing' ? styles.tabBadgeActivePrep : styles.tabBadgeInactive]}>
              <Text style={styles.tabBadgeText}>{counts.preparing}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ready' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ready')}
        >
          <Text style={[styles.tabLabel, activeTab === 'ready' && styles.tabLabelActive]}>Ready</Text>
          {counts.ready > 0 && (
            <View style={[styles.tabBadge, activeTab === 'ready' ? styles.tabBadgeActiveReady : styles.tabBadgeInactive]}>
              <Text style={styles.tabBadgeText}>{counts.ready}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'dispatched' && styles.tabBtnActive]}
          onPress={() => setActiveTab('dispatched')}
        >
          <Text style={[styles.tabLabel, activeTab === 'dispatched' && styles.tabLabelActive]}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.forest]} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.forest} />
            <Text style={styles.loadingText}>Loading live kitchen orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name={
                  activeTab === 'incoming'
                    ? 'checkmark-circle-outline'
                    : activeTab === 'preparing'
                    ? 'flame-outline'
                    : activeTab === 'ready'
                    ? 'cube-outline'
                    : 'file-tray-outline'
                }
                size={42}
                color={COLORS.muted}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'incoming'
                ? 'All caught up!'
                : activeTab === 'preparing'
                ? 'No orders cooking right now'
                : activeTab === 'ready'
                ? 'No food waiting for pickup'
                : 'No dispatched orders yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'incoming'
                ? 'New orders will ring continuously when placed by customers.'
                : 'Accept incoming orders to move them to the prep station.'}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const isLoadingThis = actionLoading === order.id;

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* Order Card Header */}
                <View style={styles.orderCardHeader}>
                  <View>
                    <View style={styles.orderIdRow}>
                      <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          order.status === 'incoming'
                            ? styles.statusPillUrgent
                            : order.status === 'preparing'
                            ? styles.statusPillPrep
                            : order.status === 'ready'
                            ? styles.statusPillReady
                            : styles.statusPillDone,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            order.status === 'incoming'
                              ? styles.statusPillTextUrgent
                              : order.status === 'preparing'
                              ? styles.statusPillTextPrep
                              : order.status === 'ready'
                              ? styles.statusPillTextReady
                              : styles.statusPillTextDone,
                          ]}
                        >
                          {order.status === 'incoming'
                            ? 'ACTION REQUIRED'
                            : order.status === 'preparing'
                            ? 'IN KITCHEN'
                            : order.status === 'ready'
                            ? 'WAITING RIDER'
                            : 'DISPATCHED'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.customerName}>
                      {order.customerName} • {order.customerPhone || 'Online'}
                    </Text>
                  </View>

                  <View style={styles.slotBadge}>
                    <Ionicons name="time-outline" size={14} color={COLORS.forest} />
                    <Text style={styles.slotBadgeText}>{order.deliverySlot}</Text>
                  </View>
                </View>

                {/* Ordered Items Breakdown */}
                <View style={styles.itemsBox}>
                  <Text style={styles.itemsBoxTitle}>ITEMS TO PREPARE ({order.items?.length || 0})</Text>
                  {order.items?.map((item: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={styles.itemQuantityBadge}>
                        <Text style={styles.itemQuantityText}>{item.quantity}x</Text>
                      </View>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.portion && <Text style={styles.itemPortion}>{item.portion}</Text>}
                      </View>
                      <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
                    </View>
                  ))}
                </View>

                {/* Special Instructions (if any) */}
                {order.specialInstructions ? (
                  <View style={styles.instructionsBox}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#B45309" />
                    <Text style={styles.instructionsText}>
                      <Text style={{ fontWeight: '700' }}>Customer Note: </Text>
                      {order.specialInstructions}
                    </Text>
                  </View>
                ) : null}

                {/* Rider Dispatch Info */}
                <View style={styles.riderBar}>
                  <View style={styles.riderLeft}>
                    <View style={styles.riderIconCircle}>
                      <Ionicons name="bicycle" size={16} color={COLORS.forest} />
                    </View>
                    <View>
                      <Text style={styles.riderLabel}>ASSIGNED RIDER</Text>
                      <Text style={styles.riderName}>{order.riderName || 'Assigning nearest rider...'}</Text>
                    </View>
                  </View>

                  <View style={styles.riderRight}>
                    {order.riderStatus === 'at_kitchen' ? (
                      <View style={styles.riderArrivedBadge}>
                        <Ionicons name="location" size={13} color="#047857" />
                        <Text style={styles.riderArrivedText}>At Restaurant</Text>
                      </View>
                    ) : order.riderEtaMins ? (
                      <View style={styles.riderEtaBadge}>
                        <Text style={styles.riderEtaText}>ETA: ~{order.riderEtaMins} mins</Text>
                      </View>
                    ) : (
                      <Text style={styles.riderAssignedText}>Driver nearby</Text>
                    )}
                  </View>
                </View>

                {/* Bottom Action Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.amountWrap}>
                    <Text style={styles.amountLabel}>Total Bill</Text>
                    <Text style={styles.amountVal}>₹{order.totalAmount?.toFixed(0)}</Text>
                  </View>

                  {/* Dynamic Action Button based on current status */}
                  {order.status === 'incoming' && (
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, styles.acceptBtn]}
                      onPress={() => handleUpdateStatus(order.id, 'preparing')}
                      disabled={isLoadingThis}
                      activeOpacity={0.85}
                    >
                      {isLoadingThis ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                          <Text style={styles.primaryActionBtnText}>Accept & Start Prep</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {order.status === 'preparing' && (
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, styles.readyBtn]}
                      onPress={() => handleUpdateStatus(order.id, 'ready')}
                      disabled={isLoadingThis}
                      activeOpacity={0.85}
                    >
                      {isLoadingThis ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                      ) : (
                        <>
                          <Ionicons name="cube-outline" size={18} color={COLORS.white} />
                          <Text style={styles.primaryActionBtnText}>Food Ready for Pickup</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {order.status === 'ready' && (
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, styles.dispatchBtn]}
                      onPress={() => openPinModal(order)}
                      disabled={isLoadingThis}
                      activeOpacity={0.85}
                    >
                      {isLoadingThis ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                      ) : (
                        <>
                          <Ionicons name="key-outline" size={18} color={COLORS.white} />
                          <Text style={styles.primaryActionBtnText}>Verify Dispatch PIN</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {order.status === 'dispatched' && (
                    <View style={styles.completedTag}>
                      <Ionicons name="checkmark-done" size={16} color="#047857" />
                      <Text style={styles.completedTagText}>Handed to {order.riderName || 'Rider'}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Driver PIN Handover Verification Modal */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="shield-checkmark" size={28} color={COLORS.forest} />
              </View>
              <Text style={styles.modalTitle}>Driver Handoff Verification</Text>
              <Text style={styles.modalSub}>
                Order {selectedOrderForPin?.orderNumber} • Driver: {selectedOrderForPin?.riderName || 'Rider'}
              </Text>
            </View>

            <Text style={styles.pinPrompt}>
              Ask the delivery driver for their 4-digit Daily Drop dispatch PIN shown on their phone:
            </Text>

            <TextInput
              style={styles.pinInput}
              value={enteredPin}
              onChangeText={(txt) => {
                setEnteredPin(txt.replace(/[^0-9]/g, ''));
                setPinError(null);
              }}
              placeholder="••••"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />

            {/* Test helper badge if in dev/demo */}
            {selectedOrderForPin?.dispatchPin && (
              <View style={styles.demoPinNotice}>
                <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
                <Text style={styles.demoPinNoticeText}>
                  Rider PIN for this test order is: <Text style={{ fontWeight: '700' }}>{selectedOrderForPin.dispatchPin}</Text>
                </Text>
              </View>
            )}

            {pinError && (
              <View style={styles.pinErrorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.urgent} />
                <Text style={styles.pinErrorText}>{pinError}</Text>
              </View>
            )}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPinModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalVerifyBtn, enteredPin.length < 4 && styles.modalVerifyBtnDisabled]}
                onPress={submitPinVerification}
                disabled={enteredPin.length < 4 || Boolean(actionLoading)}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalVerifyBtnText}>Verify & Dispatch</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerLeft: {
    flex: 1,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.forest,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  audioToggleActive: {
    backgroundColor: COLORS.forest,
  },
  audioToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  audioToggleTextActive: {
    color: COLORS.white,
  },
  incomingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  incomingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incomingBannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.urgent,
  },
  incomingBannerBadge: {
    backgroundColor: COLORS.urgent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  incomingBannerAction: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabBtnActive: {
    borderBottomColor: COLORS.forest,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: COLORS.forest,
    fontWeight: '800',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeInactive: {
    backgroundColor: '#E5E7EB',
  },
  tabBadgeActiveUrgent: {
    backgroundColor: COLORS.urgent,
  },
  tabBadgeActivePrep: {
    backgroundColor: '#D97706',
  },
  tabBadgeActiveReady: {
    backgroundColor: '#059669',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
  },
  centerContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.muted,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillUrgent: {
    backgroundColor: '#FEE2E2',
  },
  statusPillPrep: {
    backgroundColor: '#FEF3C7',
  },
  statusPillReady: {
    backgroundColor: '#D1FAE5',
  },
  statusPillDone: {
    backgroundColor: '#F3F4F6',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTextUrgent: {
    color: '#DC2626',
  },
  statusPillTextPrep: {
    color: '#B45309',
  },
  statusPillTextReady: {
    color: '#047857',
  },
  statusPillTextDone: {
    color: '#6B7280',
  },
  customerName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slotBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.forest,
  },
  itemsBox: {
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  itemsBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemQuantityBadge: {
    width: 28,
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemQuantityText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  itemPortion: {
    fontSize: 11,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instructionsText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  riderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  riderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riderIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  riderName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  riderRight: {
    alignItems: 'flex-end',
  },
  riderArrivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riderArrivedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  riderEtaBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riderEtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  riderAssignedText: {
    fontSize: 11,
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  amountWrap: {},
  amountLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  amountVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  acceptBtn: {
    backgroundColor: COLORS.forest,
  },
  readyBtn: {
    backgroundColor: '#D97706',
  },
  dispatchBtn: {
    backgroundColor: '#059669',
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completedTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  pinPrompt: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  pinInput: {
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.forest,
    borderRadius: 12,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 14,
    color: COLORS.forest,
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
  },
  demoPinNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  demoPinNoticeText: {
    fontSize: 11,
    color: '#4B5563',
  },
  pinErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  pinErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  modalVerifyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.forest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalVerifyBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  modalVerifyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
});
