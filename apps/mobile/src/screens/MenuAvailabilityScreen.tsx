import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { mobileApi } from '../services/api';

interface MenuAvailabilityScreenProps {
  navigation: any;
  user?: any;
  restaurant?: any;
}

export const MenuAvailabilityScreen: React.FC<MenuAvailabilityScreenProps> = () => {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await mobileApi.getMenu();
      setItems(res.data || []);
    } catch (err: any) {
      console.warn('Error fetching menu:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMenu();
  }, []);

  const handleToggleStock = async (itemId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Optimistic update
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, isAvailable: newStatus } : it))
    );
    try {
      setTogglingId(itemId);
      await mobileApi.toggleMenuStock(itemId, newStatus);
    } catch (err: any) {
      // Revert if error
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, isAvailable: currentStatus } : it))
      );
      Alert.alert('Update Failed', err.message || 'Could not update stock status.');
    } finally {
      setTogglingId(null);
    }
  };

  // Derive unique categories
  const categories = useMemo(() => {
    const cats = ['All'];
    items.forEach((item) => {
      if (item.category && !cats.includes(item.category)) {
        cats.push(item.category);
      }
    });
    return cats;
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase().trim()));
      return matchCat && matchSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  const totalCount = items.length;
  const inStockCount = items.filter((i) => i.isAvailable).length;
  const soldOutCount = totalCount - inStockCount;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Menu & 86ing</Text>
          <Text style={styles.headerSubtitle}>Instant Stock & Out-of-Stock Controls</Text>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={fetchMenu} activeOpacity={0.7}>
          <Ionicons name="reload" size={18} color={COLORS.forest} />
        </TouchableOpacity>
      </View>

      {/* Stock Summary Strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{totalCount}</Text>
          <Text style={styles.summaryLabel}>Total Dishes</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: '#059669' }]}>{inStockCount}</Text>
          <Text style={styles.summaryLabel}>In Stock</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: COLORS.urgent }]}>{soldOutCount}</Text>
          <Text style={styles.summaryLabel}>86ed / Sold Out</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search dish or category..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Filter Pills */}
      <View style={styles.categoryPillWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catPill, isSelected && styles.catPillSelected]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catPillText, isSelected && styles.catPillTextSelected]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Dish List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.forest]} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.forest} />
            <Text style={styles.loadingText}>Loading menu items...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No dishes found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search query or category filter.</Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const isToggling = togglingId === item.id;
            return (
              <View key={item.id} style={[styles.itemCard, !item.isAvailable && styles.itemCardSoldOut]}>
                <View style={styles.itemInfo}>
                  <View style={styles.titleRow}>
                    <View
                      style={[
                        styles.vegBadge,
                        item.category?.toLowerCase().includes('chicken') || item.category?.toLowerCase().includes('mutton')
                          ? styles.nonVegBadge
                          : styles.vegBadge,
                      ]}
                    />
                    <Text
                      style={[
                        styles.dishName,
                        !item.isAvailable && styles.dishNameSoldOut,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.dishCategory}>{item.category || 'General'}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.dishPrice}>₹{item.price}</Text>
                    {item.dailyQuota ? (
                      <>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.quotaText}>
                          Quota: {item.remainingQuota}/{item.dailyQuota}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>

                {/* Right Switch / 86ing Toggle */}
                <View style={styles.switchWrap}>
                  <View
                    style={[
                      styles.stockStatusBadge,
                      item.isAvailable ? styles.stockInBadge : styles.stockOutBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockStatusText,
                        item.isAvailable ? styles.stockInText : styles.stockOutText,
                      ]}
                    >
                      {item.isAvailable ? 'IN STOCK' : '86ed'}
                    </Text>
                  </View>

                  <Switch
                    value={item.isAvailable}
                    onValueChange={() => handleToggleStock(item.id, item.isAvailable)}
                    trackColor={{ false: '#FCA5A5', true: '#A7F3D0' }}
                    thumbColor={item.isAvailable ? COLORS.forest : '#EF4444'}
                    disabled={isToggling}
                  />
                </View>
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
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  categoryPillWrap: {
    marginTop: 10,
    marginBottom: 4,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catPillSelected: {
    backgroundColor: COLORS.forest,
    borderColor: COLORS.forest,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  catPillTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
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
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  itemCardSoldOut: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  vegBadge: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#059669',
    backgroundColor: '#10B981',
  },
  nonVegBadge: {
    borderColor: '#DC2626',
    backgroundColor: '#EF4444',
  },
  dishName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  dishNameSoldOut: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dishCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaDot: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  dishPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  quotaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  switchWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  stockStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockInBadge: {
    backgroundColor: '#D1FAE5',
  },
  stockOutBadge: {
    backgroundColor: '#FEE2E2',
  },
  stockStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stockInText: {
    color: '#047857',
  },
  stockOutText: {
    color: '#DC2626',
  },
});
