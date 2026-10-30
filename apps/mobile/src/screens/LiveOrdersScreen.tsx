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
import { storage } from '../services/storage';

interface LiveOrdersScreenProps {
  navigation: any;
  user?: any;
  restaurant?: any;
  onLogout?: () => void;
}

export const LiveOrdersScreen: React.FC<LiveOrdersScreenProps> = ({
  navigation,
  user,
  restaurant,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<any[]>([]);
  const [counts, setCounts] = useState({ incoming: 0, preparing: 0, ready: 0, dispatched: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<'all_active' | 'incoming' | 'preparing' | 'ready' | 'dispatched'>('all_active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 1. Popup Window for Incoming Order Acknowledgment
  const [ackModalOrder, setAckModalOrder] = useState<any | null>(null);
  const acknowledgedIdsRef = useRef<Set<string>>(new Set());

  // 2. Real-time Driver Pickup Toast Notification
  const [driverPickupBanner, setDriverPickupBanner] = useState<{
    orderNumber: string;
    riderName: string;
    timestamp: string;
  } | null>(null);
  const prevOrdersStatusMapRef = useRef<Record<string, string>>({});

  // 3. Fallback PIN Verification Modal (optional)
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [selectedOrderForPin, setSelectedOrderForPin] = useState<any | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await mobileApi.getOrders('all');
      const orderList: any[] = res.data || [];
      setOrders(orderList);

      if (res.counts) {
        setCounts(res.counts);
      }

      // Detect any incoming unacknowledged order and pop acknowledgment window
      const unackIncoming = orderList.filter(
        (o) => o.status === 'incoming' && !acknowledgedIdsRef.current.has(o.id)
      );
      if (unackIncoming.length > 0 && !ackModalOrder) {
        setAckModalOrder(unackIncoming[0]);
        if (soundAlertEnabled) {
          Vibration.vibrate([0, 500, 200, 500]);
        }
      }

      // Detect Driver Pickup Handover confirmation in real-time
      orderList.forEach((o) => {
        const prevStatus = prevOrdersStatusMapRef.current[o.id];
        if (prevStatus === 'ready' && o.status === 'dispatched') {
          // Driver confirmed receipt! Notify restaurant immediately!
          setDriverPickupBanner({
            orderNumber: o.orderNumber,
            riderName: o.riderName || 'Assigned Driver',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          Vibration.vibrate([0, 250, 150, 250]);
          setTimeout(() => setDriverPickupBanner(null), 8000);
        }
        prevOrdersStatusMapRef.current[o.id] = o.status;
      });
    } catch (err: any) {
      console.warn('Error fetching orders:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Auto-poll orders every 8 seconds for live kitchen display & real-time driver updates
    const interval = setInterval(() => {
      fetchOrders(true);
      mobileApi.sendHeartbeat();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  // 1-Tap Order Acknowledgment via Popup Window
  const handleAcknowledgeOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      await mobileApi.acknowledgeOrder(orderId);
      acknowledgedIdsRef.current.add(orderId);
      setAckModalOrder(null);
      Vibration.vibrate(120);

      await fetchOrders(true);

      // Check if another unacknowledged incoming order exists
      const remaining = orders.filter(
        (o) => o.status === 'incoming' && o.id !== orderId && !acknowledgedIdsRef.current.has(o.id)
      );
      if (remaining.length > 0) {
        setAckModalOrder(remaining[0]);
      } else {
        setActiveTab('preparing');
      }
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Could not acknowledge order');
    } finally {
      setActionLoading(null);
    }
  };

  // General Status Update (e.g. food ready)
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      setActionLoading(orderId);
      await mobileApi.updateOrderStatus(orderId, nextStatus);
      await fetchOrders(true);
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Could not update order status');
    } finally {
      setActionLoading(null);
    }
  };

  // Driver Confirmation Action (Simulated or 1-tap confirmation with immediate restaurant notification)
  const handleDriverConfirmPickup = async (orderId: string, driverName?: string) => {
    try {
      setActionLoading(orderId);
      await mobileApi.confirmDriverPickup(orderId, driverName);
      const targetOrder = orders.find((o) => o.id === orderId);
      setDriverPickupBanner({
        orderNumber: targetOrder?.orderNumber || '#DD',
        riderName: driverName || targetOrder?.riderName || 'Driver',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      Vibration.vibrate([0, 200, 100, 200]);
      setTimeout(() => setDriverPickupBanner(null), 8000);
      await fetchOrders(true);
      setActiveTab('dispatched');
    } catch (err: any) {
      Alert.alert('Handover Failed', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Logout handler
  const handleLogoutConfirm = () => {
    Alert.alert(
      'Sign Out of Kitchen Account',
      `Are you sure you want to log out of ${restaurant?.name || 'Kitchen Partner'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await mobileApi.logout();
            } catch (e) {}
            await storage.clearAuth();
            if (onLogout) {
              onLogout();
            }
          },
        },
      ]
    );
  };

  // Fallback PIN Modal handlers
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

  // Filter orders based on active tab
  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'all_active') {
      return ['incoming', 'preparing', 'ready'].includes(o.status);
    }
    if (activeTab === 'incoming') return o.status === 'incoming';
    if (activeTab === 'preparing') return o.status === 'preparing';
    if (activeTab === 'ready') return o.status === 'ready';
    if (activeTab === 'dispatched') return o.status === 'dispatched' || o.status === 'delivered';
    return true;
  });

  const totalActiveCount = counts.incoming + counts.preparing + counts.ready;

  // Earliest cutoff for the active orders summary
  const pendingOrders = orders.filter((o) => o.status === 'incoming' || o.status === 'preparing' || o.status === 'ready');
  const earliestCutoff = pendingOrders.length > 0 && pendingOrders[0].handoverTime
    ? pendingOrders[0].handoverTime
    : '12:15 PM';

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Real-time Driver Pickup Toast Notification Banner */}
      {driverPickupBanner && (
        <View style={styles.driverPickupToast}>
          <View style={styles.driverPickupToastLeft}>
            <View style={styles.driverPickupToastIcon}>
              <Ionicons name="checkmark-done-circle" size={24} color="#047857" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverPickupToastTitle}>DRIVER RECEIPT CONFIRMED</Text>
              <Text style={styles.driverPickupToastSub}>
                Driver {driverPickupBanner.riderName} confirmed pickup of Order {driverPickupBanner.orderNumber} at {driverPickupBanner.timestamp}. Food handed over!
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setDriverPickupBanner(null)} style={{ padding: 4 }}>
            <Ionicons name="close" size={18} color="#047857" />
          </TouchableOpacity>
        </View>
      )}

      {/* Top Header Bar with Restaurant Identity, Controls & Clean Hierarchy */}
      <View style={styles.header}>
        {/* Top Meta Row: Restaurant Identity on left, Controls on right */}
        <View style={styles.headerTopRow}>
          <View style={styles.restoBadgeContainer}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveBadgeText}>LIVE KDS</Text>
            <Text style={styles.restoBadgeText} numberOfLines={1} ellipsizeMode="tail">
              • {restaurant?.name || 'Kitchen Partner'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* Sound Alert Toggle */}
            <TouchableOpacity
              style={[styles.audioToggleBtn, soundAlertEnabled && styles.audioToggleActive]}
              onPress={() => {
                setSoundAlertEnabled(!soundAlertEnabled);
                if (!soundAlertEnabled) {
                  Vibration.vibrate(150);
                }
              }}
              activeOpacity={0.8}
              accessibilityLabel="Toggle Sound"
            >
              <Ionicons
                name={soundAlertEnabled ? 'volume-high' : 'volume-mute'}
                size={14}
                color={soundAlertEnabled ? '#FFFFFF' : '#475569'}
              />
              <Text style={[styles.audioToggleText, soundAlertEnabled && styles.audioToggleTextActive]}>
                {soundAlertEnabled ? 'Sound ON' : 'Muted'}
              </Text>
            </TouchableOpacity>

            {/* Prominent Log Out Button */}
            <TouchableOpacity
              style={styles.headerLogoutBtn}
              onPress={handleLogoutConfirm}
              activeOpacity={0.8}
              accessibilityLabel="Sign out"
            >
              <Ionicons name="log-out-outline" size={14} color="#DC2626" />
              <Text style={styles.headerLogoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title Row: Bold Title + Live Status Indicator */}
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Kitchen Orders</Text>
          <View style={styles.headerSubBadge}>
            <Text style={styles.headerSubBadgeText}>
              {totalActiveCount} Active • Auto-Sync
            </Text>
          </View>
        </View>
      </View>

      {/* Modern Handover Schedule Card */}
      <View style={styles.scheduleCard}>
        <View style={styles.scheduleLeft}>
          <View style={styles.scheduleIconWrap}>
            <Ionicons name="time" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.scheduleLabel}>NEXT DRIVER HANDOVER</Text>
            <Text style={styles.scheduleTimeText}>
              {totalActiveCount > 0 ? `${earliestCutoff} Cutoff` : 'All Active Orders Dispatched'}
            </Text>
          </View>
        </View>
        <View style={styles.scheduleCountPill}>
          <Text style={styles.scheduleCountPillText}>
            {totalActiveCount} Active Today
          </Text>
        </View>
      </View>

      {/* Scrollable Pipeline Status Tabs (Pill Style, Zero Clipping) */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {/* All Active Tab */}
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'all_active' && styles.tabPillActive]}
            onPress={() => setActiveTab('all_active')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabPillText, activeTab === 'all_active' && styles.tabPillTextActive]}>
              All Active
            </Text>
            {totalActiveCount > 0 && (
              <View style={[styles.tabPillBadge, activeTab === 'all_active' ? styles.tabPillBadgeActive : styles.tabPillBadgeInactive]}>
                <Text style={[styles.tabPillBadgeText, activeTab === 'all_active' && styles.tabPillBadgeTextActive]}>
                  {totalActiveCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Incoming Tab */}
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'incoming' && styles.tabPillActive]}
            onPress={() => setActiveTab('incoming')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabPillText, activeTab === 'incoming' && styles.tabPillTextActive]}>
              Incoming
            </Text>
            {counts.incoming > 0 && (
              <View style={[styles.tabPillBadge, styles.badgeUrgent]}>
                <Text style={styles.tabPillBadgeTextUrgent}>{counts.incoming}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* In Prep Tab */}
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'preparing' && styles.tabPillActive]}
            onPress={() => setActiveTab('preparing')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabPillText, activeTab === 'preparing' && styles.tabPillTextActive]}>
              In Prep
            </Text>
            {counts.preparing > 0 && (
              <View style={[styles.tabPillBadge, styles.badgePrep]}>
                <Text style={styles.tabPillBadgeTextWhite}>{counts.preparing}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Ready Tab */}
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'ready' && styles.tabPillActive]}
            onPress={() => setActiveTab('ready')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabPillText, activeTab === 'ready' && styles.tabPillTextActive]}>
              Ready
            </Text>
            {counts.ready > 0 && (
              <View style={[styles.tabPillBadge, styles.badgeReady]}>
                <Text style={styles.tabPillBadgeTextWhite}>{counts.ready}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Done Tab */}
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'dispatched' && styles.tabPillActive]}
            onPress={() => setActiveTab('dispatched')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabPillText, activeTab === 'dispatched' && styles.tabPillTextActive]}>
              Done
            </Text>
            {counts.dispatched > 0 && (
              <View style={[styles.tabPillBadge, styles.tabPillBadgeInactive]}>
                <Text style={styles.tabPillBadgeText}>{counts.dispatched}</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
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
              {activeTab === 'all_active'
                ? 'No Active Orders'
                : activeTab === 'incoming'
                ? 'No Incoming Orders'
                : activeTab === 'preparing'
                ? 'Kitchen Station Clear'
                : activeTab === 'ready'
                ? 'No Orders Awaiting Rider'
                : 'No Completed Orders'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all_active' || activeTab === 'incoming'
                ? 'New orders will automatically pop up in a prominent alert window.'
                : 'Orders in kitchen preparation will appear here.'}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const isLoadingThis = actionLoading === order.id;
            const isCompleted = order.status === 'dispatched' || order.status === 'delivered';

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* 1. PROMINENT DELIVERY DATE & HANDOVER TIME BANNER */}
                {isCompleted ? (
                  <View style={[styles.prominentHandoverBox, styles.handoverBoxDone]}>
                    <View style={styles.handoverLeft}>
                      <View style={styles.doneCheckBadge}>
                        <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={styles.handoverTaglineDone}>HANDOVER COMPLETED</Text>
                        <Text style={styles.handoverBigTimeDone}>
                          Handed to {order.riderName || 'Driver'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.handoverRight}>
                      <View style={styles.deliveryDatePillDone}>
                        <Ionicons name="checkmark-circle" size={12} color="#065F46" />
                        <Text style={styles.deliveryDateTextDone}>Dispatched</Text>
                      </View>
                      <Text style={styles.deliverySlotSubTextDone}>{order.deliverySlot}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.prominentHandoverBox}>
                    <View style={styles.handoverLeft}>
                      <View style={styles.alarmBadge}>
                        <Ionicons name="alarm" size={20} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={styles.handoverTagline}>HANDOVER TO DRIVER BY</Text>
                        <Text style={styles.handoverBigTime}>
                          {order.handoverTime || '12:15 PM'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.handoverRight}>
                      <View style={styles.deliveryDatePill}>
                        <Ionicons name="calendar" size={12} color="#1E3A8A" />
                        <Text style={styles.deliveryDateText}>
                          {order.deliveryDate || 'Today, Oct 30'}
                        </Text>
                      </View>
                      <Text style={styles.deliverySlotSubText}>{order.deliverySlot}</Text>
                    </View>
                  </View>
                )}

                {/* 2. Order ID & Customer Header */}
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
                      {order.customerName} • {order.customerPhone || 'Online Prepaid'}
                    </Text>
                  </View>
                </View>

                {/* 3. Ordered Items Breakdown with robust quantity & price handling */}
                <View style={styles.itemsBox}>
                  <Text style={styles.itemsBoxTitle}>ITEMS TO PREPARE ({order.items?.length || 0})</Text>
                  {order.items?.map((item: any, idx: number) => {
                    const qty = Number(item.quantity ?? item.qty ?? 1);
                    const price = Number(item.price) || 0;
                    return (
                      <View key={idx} style={styles.itemRow}>
                        <View style={styles.itemQuantityBadge}>
                          <Text style={styles.itemQuantityText}>{qty}x</Text>
                        </View>
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          {item.portion && <Text style={styles.itemPortion}>{item.portion}</Text>}
                        </View>
                        <Text style={styles.itemPrice}>₹{(price * qty).toFixed(0)}</Text>
                      </View>
                    );
                  })}
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
                    <Text style={styles.amountVal}>₹{(Number(order.totalAmount) || 0).toFixed(0)}</Text>
                  </View>

                  {/* Incoming: 1-Click Accept */}
                  {order.status === 'incoming' && (
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, styles.acceptBtn]}
                      onPress={() => handleAcknowledgeOrder(order.id)}
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

                  {/* In Prep: Food Ready */}
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

                  {/* Ready: Driver Receipt Confirmation (Fast 1-tap or Driver app confirmation) */}
                  {order.status === 'ready' && (
                    <View style={styles.readyActionsWrap}>
                      <TouchableOpacity
                        style={[styles.primaryActionBtn, styles.dispatchBtn]}
                        onPress={() => handleDriverConfirmPickup(order.id, order.riderName)}
                        disabled={isLoadingThis}
                        activeOpacity={0.85}
                      >
                        {isLoadingThis ? (
                          <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-done" size={18} color={COLORS.white} />
                            <Text style={styles.primaryActionBtnText}>Confirm Handed to Driver</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.pinSmallBtn}
                        onPress={() => openPinModal(order)}
                        accessibilityLabel="Enter PIN"
                      >
                        <Ionicons name="key-outline" size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Dispatched: Confirmed badge */}
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

      {/* 4. POPUP WINDOW: ORDER ACKNOWLEDGMENT MODAL (Required by restaurant partner) */}
      <Modal
        visible={Boolean(ackModalOrder)}
        transparent
        animationType="slide"
        onRequestClose={() => setAckModalOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ackModalCard}>
            {/* Header Alert Title */}
            <View style={styles.ackHeader}>
              <View style={styles.ackPulseWrap}>
                <Ionicons name="notifications" size={24} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ackAlertTitle}>NEW ORDER RECEIVED</Text>
                <Text style={styles.ackAlertSub}>Please acknowledge to start preparation</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAckModalOrder(null)}
                style={styles.ackCloseIconBtn}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Prominent Handover Box inside Popup */}
            <View style={styles.ackHandoverHighlight}>
              <View style={styles.ackHandoverLeft}>
                <Ionicons name="alarm" size={22} color="#FFFFFF" />
                <View>
                  <Text style={styles.ackHandoverLabel}>HANDOVER TO DRIVER BY</Text>
                  <Text style={styles.ackHandoverTimeText}>
                    {ackModalOrder?.handoverTime || '12:15 PM'}
                  </Text>
                </View>
              </View>
              <View style={styles.ackHandoverRight}>
                <Text style={styles.ackHandoverDate}>{ackModalOrder?.deliveryDate || 'Today, Oct 30'}</Text>
                <Text style={styles.ackDeliverySlotText}>{ackModalOrder?.deliverySlot}</Text>
              </View>
            </View>

            {/* Order Info Row */}
            <View style={styles.ackOrderInfoRow}>
              <View>
                <Text style={styles.ackOrderNumber}>{ackModalOrder?.orderNumber}</Text>
                <Text style={styles.ackCustomerText}>
                  {ackModalOrder?.customerName} • {ackModalOrder?.customerPhone || 'Online Prepaid'}
                </Text>
              </View>
              <View style={styles.ackAmountBadge}>
                <Text style={styles.ackAmountLabel}>BILL TOTAL</Text>
                <Text style={styles.ackAmountValue}>
                  ₹{(Number(ackModalOrder?.totalAmount) || 0).toFixed(0)}
                </Text>
              </View>
            </View>

            {/* Ordered Items List */}
            <View style={styles.ackItemsBox}>
              <Text style={styles.ackItemsTitle}>
                ITEMS TO PREPARE ({ackModalOrder?.items?.length || 0})
              </Text>
              <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}>
                {ackModalOrder?.items?.map((item: any, idx: number) => {
                  const qty = Number(item.quantity ?? item.qty ?? 1);
                  const price = Number(item.price) || 0;
                  return (
                    <View key={idx} style={styles.ackItemRow}>
                      <View style={styles.ackItemQtyBadge}>
                        <Text style={styles.ackItemQtyText}>{qty}x</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ackItemName}>{item.name}</Text>
                        {item.portion && <Text style={styles.ackItemPortion}>{item.portion}</Text>}
                      </View>
                      <Text style={styles.ackItemPrice}>₹{(price * qty).toFixed(0)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Customer Special Instructions */}
            {ackModalOrder?.specialInstructions ? (
              <View style={styles.ackNotesBox}>
                <Ionicons name="chatbubble-ellipses" size={16} color="#B45309" />
                <Text style={styles.ackNotesText}>
                  <Text style={{ fontWeight: '700' }}>Customer Note: </Text>
                  {ackModalOrder.specialInstructions}
                </Text>
              </View>
            ) : null}

            {/* ONE-TAP PRIMARY ACTION: Acknowledge & Start Prep */}
            <View style={styles.ackActionRow}>
              <TouchableOpacity
                style={styles.ackPrimaryBtn}
                onPress={() => handleAcknowledgeOrder(ackModalOrder.id)}
                disabled={Boolean(actionLoading)}
                activeOpacity={0.85}
              >
                {actionLoading === ackModalOrder?.id ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                    <Text style={styles.ackPrimaryBtnText}>Acknowledge & Start Prep</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. Driver PIN Handover Verification Modal (Optional Fallback) */}
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
              Enter the 4-digit Daily Drop dispatch PIN from the driver app screen:
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

            {selectedOrderForPin?.dispatchPin && (
              <View style={styles.demoPinNotice}>
                <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
                <Text style={styles.demoPinNoticeText}>
                  Rider PIN for this test order: <Text style={{ fontWeight: '700' }}>{selectedOrderForPin.dispatchPin}</Text>
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
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  restoBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.5,
  },
  restoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  audioToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  audioToggleActive: {
    backgroundColor: '#0F172A',
  },
  audioToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  audioToggleTextActive: {
    color: '#FFFFFF',
  },
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  headerLogoutText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E3A2F',
    letterSpacing: -0.3,
  },
  headerSubBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerSubBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  scheduleCard: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scheduleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  scheduleTimeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#78350F',
  },
  scheduleCountPill: {
    backgroundColor: '#78350F',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduleCountPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tabsWrapper: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 6,
  },
  tabsScrollContent: {
    paddingHorizontal: 14,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: '#204D39',
    borderColor: '#204D39',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabPillBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CBD5E1',
  },
  tabPillBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabPillBadgeInactive: {
    backgroundColor: '#E2E8F0',
  },
  tabPillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  tabPillBadgeTextActive: {
    color: '#FFFFFF',
  },
  badgeUrgent: {
    backgroundColor: '#DC2626',
  },
  tabPillBadgeTextUrgent: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  badgePrep: {
    backgroundColor: '#D97706',
  },
  badgeReady: {
    backgroundColor: '#059669',
  },
  tabPillBadgeTextWhite: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
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
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  prominentHandoverBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  handoverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alarmBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  handoverTagline: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.5,
  },
  handoverBigTime: {
    fontSize: 19,
    fontWeight: '900',
    color: '#9A3412',
  },
  handoverRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  deliveryDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deliveryDateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E40AF',
  },
  deliverySlotSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78350F',
  },
  handoverBoxDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  doneCheckBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  handoverTaglineDone: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  handoverBigTimeDone: {
    fontSize: 15,
    fontWeight: '900',
    color: '#047857',
  },
  deliveryDatePillDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deliveryDateTextDone: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  deliverySlotSubTextDone: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
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
    fontSize: 17,
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
  itemsBox: {
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
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
    marginBottom: 6,
  },
  itemQuantityBadge: {
    width: 28,
    height: 22,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  itemQuantityText: {
    fontSize: 11,
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
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instructionsText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 15,
  },
  riderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  riderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riderIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  amountWrap: {
    justifyContent: 'center',
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  amountVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: COLORS.forest,
  },
  readyBtn: {
    backgroundColor: '#D97706',
  },
  dispatchBtn: {
    backgroundColor: '#047857',
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
  },
  readyActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinSmallBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completedTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  driverPickupToast: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  driverPickupToastLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  driverPickupToastIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverPickupToastTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  driverPickupToastSub: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '500',
    marginTop: 1,
  },
  // Modal Overlays
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  ackModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  ackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  ackPulseWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ackAlertTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  ackAlertSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  ackCloseIconBtn: {
    padding: 6,
  },
  ackHandoverHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  ackHandoverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ackHandoverLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FECACA',
    letterSpacing: 0.5,
  },
  ackHandoverTimeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  ackHandoverRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  ackHandoverDate: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ackDeliverySlotText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FCA5A5',
  },
  ackOrderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 10,
  },
  ackOrderNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  ackCustomerText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  ackAmountBadge: {
    alignItems: 'flex-end',
  },
  ackAmountLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  ackAmountValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },
  ackItemsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  ackItemsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ackItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  ackItemQtyBadge: {
    width: 26,
    height: 22,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  ackItemQtyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  ackItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  ackItemPortion: {
    fontSize: 11,
    color: '#6B7280',
  },
  ackItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  ackNotesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  ackNotesText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 15,
  },
  ackActionRow: {
    marginTop: 4,
  },
  ackPrimaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.forest,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.forest,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ackPrimaryBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  // PIN Verification Modal Styles
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
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
    marginBottom: 16,
    lineHeight: 18,
  },
  pinInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 16,
    color: '#111827',
    marginBottom: 12,
  },
  demoPinNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  demoPinNoticeText: {
    fontSize: 11,
    color: '#4B5563',
  },
  pinErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  pinErrorText: {
    fontSize: 12,
    color: COLORS.urgent,
    fontWeight: '600',
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
