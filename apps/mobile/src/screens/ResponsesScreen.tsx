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

interface ResponsesScreenProps {
  navigation: any;
}

export const ResponsesScreen: React.FC<ResponsesScreenProps> = ({ navigation }) => {
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const res = await mobileApi.getResponsesHistory();
      setResponses(res.data);
    } catch (err: any) {
      console.warn('Failed to load response history:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResponses();
  }, []);

  return (
    <View style={styles.container}>
      <Header
        title="Kitchen Submissions"
        subtitle="Historical availability & quota commitments"
        onNotificationPress={() => navigation.navigate('Notifications')}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.forest]} />}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.forest} style={{ marginTop: 40 }} />
        ) : responses.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={44} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No Submissions Recorded</Text>
            <Text style={styles.emptySub}>
              Confirmations submitted by your kitchen team will be recorded here.
            </Text>
          </View>
        ) : (
          responses.map((r: any) => (
            <TouchableOpacity
              key={r.id}
              style={styles.card}
              onPress={() => navigation.navigate('UpdateDetail', { updateId: r.updateId })}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.statusBadge, {
                    backgroundColor: r.status === 'reviewed' ? COLORS.mint : COLORS.blueBg
                  }]}>
                    <Text style={[styles.statusBadgeText, {
                      color: r.status === 'reviewed' ? COLORS.forest : COLORS.blue
                    }]}>
                      {r.status === 'reviewed' ? 'OPS REVIEWED' : 'SUBMITTED'}
                    </Text>
                  </View>

                  <Text style={styles.categoryText}>{r.updateCategory}</Text>
                </View>

                <Text style={styles.dateText}>
                  {new Date(r.submittedAt || Date.now()).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.updateTitle}>{r.updateTitle}</Text>

              {/* Submitted Answer Overview */}
              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>SUBMITTED KITCHEN STATUS:</Text>
                {r.availabilityStatus && (
                  <Text style={styles.availabilityValue}>
                    {r.availabilityStatus.replace('_', ' ').toUpperCase()}
                    {r.availabilityDetails?.maxCapacity ? ` (${r.availabilityDetails.maxCapacity} boxes)` : ''}
                  </Text>
                )}
                {r.selectedOptions?.[0] && (
                  <Text style={styles.optionValue}>Selected: {r.selectedOptions[0]}</Text>
                )}
                {r.answerText && (
                  <Text style={styles.noteText}>"{r.answerText}"</Text>
                )}
              </View>

              {/* Admin Note if Reviewed */}
              {r.adminNotes && (
                <View style={styles.adminNoteBox}>
                  <Ionicons name="shield-checkmark" size={13} color={COLORS.forest} />
                  <Text style={styles.adminNoteText}>Ops Note: {r.adminNotes}</Text>
                </View>
              )}
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
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  categoryText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  updateTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 8,
  },
  answerBox: {
    backgroundColor: COLORS.mintSubtle,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    marginBottom: 6,
  },
  answerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  availabilityValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.forest,
  },
  optionValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
  },
  noteText: {
    fontSize: 11,
    color: COLORS.dark,
    fontStyle: 'italic',
    marginTop: 2,
  },
  adminNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  adminNoteText: {
    fontSize: 10,
    color: COLORS.forest,
    fontWeight: '700',
    flex: 1,
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
    textAlign: 'center',
  },
});
