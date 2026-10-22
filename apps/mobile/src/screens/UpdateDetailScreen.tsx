import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { Header } from '../components/Header';
import { mobileApi } from '../services/api';

interface UpdateDetailScreenProps {
  route: any;
  navigation: any;
}

export const UpdateDetailScreen: React.FC<UpdateDetailScreenProps> = ({ route, navigation }) => {
  const { updateId } = route.params;
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [availability, setAvailability] = useState<'available' | 'partially_available' | 'unavailable'>('available');
  const [maxCapacity, setMaxCapacity] = useState('100');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [answerText, setAnswerText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Attachment Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await mobileApi.getUpdateDetail(updateId);
      setData(res.data);

      // If already responded, populate existing response
      if (res.data.response) {
        if (res.data.response.availabilityStatus) {
          setAvailability(res.data.response.availabilityStatus);
        }
        if (res.data.response.availabilityDetails?.maxCapacity) {
          setMaxCapacity(String(res.data.response.availabilityDetails.maxCapacity));
        }
        if (res.data.response.answerText) {
          setAnswerText(res.data.response.answerText);
        }
        if (res.data.response.selectedOptions?.[0]) {
          setSelectedOption(res.data.response.selectedOptions[0]);
        }
      } else if (res.data.responseConfig?.options?.[0]) {
        setSelectedOption(res.data.responseConfig.options[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [updateId]);

  const handleAcknowledge = async () => {
    setSubmitting(true);
    try {
      await mobileApi.acknowledgeUpdate(updateId);
      Alert.alert('Acknowledged', 'Update receipt and instructions acknowledged to Daily Drop Operations.');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponseSubmit = async (isDraft = false) => {
    setSubmitting(true);
    try {
      const payload: any = {
        isDraft,
        answerText: answerText.trim() || undefined,
      };

      if (data.responseType === 'availability_confirmation') {
        payload.availabilityStatus = availability;
        payload.availabilityDetails = {
          maxCapacity: parseInt(maxCapacity, 10) || 0,
        };
      } else if (data.responseType === 'multiple_choice') {
        payload.selectedOptions = [selectedOption];
      }

      await mobileApi.submitResponse(updateId, payload);
      setShowConfirmModal(false);
      Alert.alert(
        isDraft ? 'Draft Saved' : 'Response Submitted',
        isDraft
          ? 'Your response has been saved as draft.'
          : 'Your response was successfully recorded and transmitted to Daily Drop Operations!'
      );
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Submission Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAttachment = async (att: any) => {
    setDownloadingId(att.id);
    setDownloadSuccess(null);
    try {
      const downloadUrl = mobileApi.getAttachmentDownloadUrl(updateId, att.id);
      if (Platform.OS === 'web') {
        window.open(downloadUrl, '_blank');
      } else {
        await Linking.openURL(downloadUrl);
      }
      setDownloadSuccess(`Downloaded "${att.fileName}" successfully`);
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Could not stream attachment');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.forest} />
        <Text style={styles.loadingText}>Opening update instructions...</Text>
      </View>
    );
  }

  const isSubmitted = Boolean(data?.response?.status === 'submitted' || data?.response?.status === 'reviewed');
  const isAcknowledged = data?.recipientStatus === 'acknowledged';

  return (
    <View style={styles.container}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title={data?.category}
        subtitle={`Version ${data?.version || 1}`}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Overdue Alert Banner */}
        {data?.isOverdue && !isSubmitted && (
          <View style={styles.overdueBanner}>
            <Ionicons name="warning" size={18} color={COLORS.urgent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.overdueTitle}>Deadline Has Passed</Text>
              <Text style={styles.overdueSub}>
                Late submissions will be logged and reviewed by the Daily Drop dispatch team.
              </Text>
            </View>
          </View>
        )}

        {/* Section A & B: Title & Metadata Card */}
        <View style={styles.metaCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.priorityBadge, {
              backgroundColor: data.priority === 'urgent' ? COLORS.urgentBg : data.priority === 'high' ? COLORS.amberBg : COLORS.mintSubtle
            }]}>
              <Text style={[styles.priorityBadgeText, {
                color: data.priority === 'urgent' ? COLORS.urgent : data.priority === 'high' ? COLORS.amber : COLORS.forest
              }]}>
                {data.priority.toUpperCase()} PRIORITY
              </Text>
            </View>

            <View style={styles.catPill}>
              <Text style={styles.catPillText}>{data.category}</Text>
            </View>
          </View>

          <Text style={styles.title}>{data.title}</Text>

          <View style={styles.timestampsRow}>
            <View style={styles.timeItem}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.muted} />
              <Text style={styles.timeLabel}>
                Published: {new Date(data.publishedAt || Date.now()).toLocaleDateString()}
              </Text>
            </View>

            {data.deadlineAt && (
              <View style={styles.timeItem}>
                <Ionicons name="alarm-outline" size={13} color={data.isOverdue ? COLORS.urgent : COLORS.amber} />
                <Text style={[styles.timeLabel, { color: data.isOverdue ? COLORS.urgent : COLORS.amber, fontWeight: '700' }]}>
                  Deadline: {new Date(data.deadlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Section C: Full Message & Operational Instructions */}
        <View style={styles.contentCard}>
          <Text style={styles.contentHeader}>OPERATIONAL INSTRUCTIONS</Text>
          <Text style={styles.messageText}>{data.message}</Text>
        </View>

        {/* Section D: Attachments */}
        {data.attachments && data.attachments.length > 0 && (
          <View style={styles.contentCard}>
            <Text style={styles.contentHeader}>ATTACHED DOCUMENTS ({data.attachments.length})</Text>

            {downloadSuccess && (
              <View style={styles.downloadSuccessBox}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.forest} />
                <Text style={styles.downloadSuccessText}>{downloadSuccess}</Text>
              </View>
            )}

            {data.attachments.map((att: any) => {
              const isDownloading = downloadingId === att.id;
              return (
                <View key={att.id} style={styles.attachmentCard}>
                  <View style={styles.attLeft}>
                    <View style={styles.fileIconWrap}>
                      <Ionicons name="document-text" size={20} color={COLORS.forest} />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.attName} numberOfLines={1}>{att.fileName}</Text>
                      <Text style={styles.attSize}>
                        Spreadsheet / Doc • {(att.fileSize / 1024).toFixed(1)} KB
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => handleDownloadAttachment(att)}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={COLORS.forest} />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={14} color={COLORS.forest} />
                        <Text style={styles.downloadBtnText}>Open</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Section E: Required Action & Submission Interface */}
        <View style={styles.contentCard}>
          <View style={styles.actionHeaderRow}>
            <Text style={styles.contentHeader}>KITCHEN RESPONSE REQUIRED</Text>
            {isSubmitted && (
              <View style={styles.submittedPill}>
                <Ionicons name="checkmark-done" size={12} color={COLORS.forest} />
                <Text style={styles.submittedPillText}>SUBMITTED</Text>
              </View>
            )}
          </View>

          {/* Acknowledgement Only */}
          {data.responseType === 'acknowledgement_only' && (
            <View style={styles.actionBody}>
              <Text style={styles.actionPrompt}>
                Please confirm that your packaging and prep stations have read and implemented these guidelines.
              </Text>
              {isAcknowledged ? (
                <View style={styles.completedNotice}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.forest} />
                  <Text style={styles.completedNoticeText}>
                    Acknowledged on {new Date(data.acknowledgedAt || Date.now()).toLocaleTimeString()}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleAcknowledge}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Acknowledge Update</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Availability Confirmation */}
          {data.responseType === 'availability_confirmation' && (
            <View style={styles.actionBody}>
              <Text style={styles.actionPrompt}>
                {data.responseConfig?.promptQuestion || 'Can your kitchen commit to the pre-order schedule?'}
              </Text>

              {/* Status Selector */}
              <View style={styles.choiceGroup}>
                {[
                  { id: 'available', label: 'Confirmed Available', icon: 'checkmark-circle', color: COLORS.forest },
                  { id: 'partially_available', label: 'Partially Available', icon: 'alert-circle', color: COLORS.amber },
                  { id: 'unavailable', label: 'Cannot Accommodate', icon: 'close-circle', color: COLORS.urgent },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.choiceItem,
                      availability === opt.id && { borderColor: opt.color, backgroundColor: COLORS.mintSubtle }
                    ]}
                    onPress={() => !isSubmitted && setAvailability(opt.id as any)}
                    disabled={isSubmitted}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={availability === opt.id ? opt.color : COLORS.muted}
                    />
                    <Text style={[
                      styles.choiceLabel,
                      availability === opt.id && { color: opt.color, fontWeight: '800' }
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Capacity Input */}
              {availability !== 'unavailable' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>MAXIMUM DAILY LUNCH BOX CAPACITY:</Text>
                  <TextInput
                    style={styles.fieldInput}
                    keyboardType="number-pad"
                    value={maxCapacity}
                    onChangeText={setMaxCapacity}
                    editable={!isSubmitted}
                    placeholder="e.g. 150"
                  />
                </View>
              )}

              {/* Notes Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>KITCHEN NOTES / CONSTRAINTS (OPTIONAL):</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 70, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={3}
                  value={answerText}
                  onChangeText={setAnswerText}
                  editable={!isSubmitted}
                  placeholder="e.g. Tandoor prep starts at 8:30 AM. Limited packaging boxes for Monday."
                />
              </View>

              {/* Submit Buttons */}
              {!isSubmitted ? (
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.draftBtn}
                    onPress={() => handleResponseSubmit(true)}
                    disabled={submitting}
                  >
                    <Text style={styles.draftBtnText}>Save Draft</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() => setShowConfirmModal(true)}
                    disabled={submitting}
                  >
                    <Text style={styles.submitBtnText}>Submit Response</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.submittedSummary}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.forest} />
                  <Text style={styles.submittedSummaryText}>
                    Submitted: {availability.replace('_', ' ').toUpperCase()} • {maxCapacity} boxes
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Multiple Choice Response */}
          {data.responseType === 'multiple_choice' && (
            <View style={styles.actionBody}>
              <Text style={styles.actionPrompt}>Select your kitchen's operating decision:</Text>

              <View style={styles.choiceGroup}>
                {(data.responseConfig?.options || ['Accept', 'Decline']).map((opt: string, i: number) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.choiceItem,
                      selectedOption === opt && { borderColor: COLORS.forest, backgroundColor: COLORS.mintSubtle }
                    ]}
                    onPress={() => !isSubmitted && setSelectedOption(opt)}
                    disabled={isSubmitted}
                  >
                    <Ionicons
                      name={selectedOption === opt ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selectedOption === opt ? COLORS.forest : COLORS.muted}
                    />
                    <Text style={[styles.choiceLabel, selectedOption === opt && { color: COLORS.forest, fontWeight: '800' }]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!isSubmitted ? (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setShowConfirmModal(true)}
                  disabled={submitting}
                >
                  <Text style={styles.primaryBtnText}>Submit Decision</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.submittedSummary}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.forest} />
                  <Text style={styles.submittedSummaryText}>Selected: {selectedOption}</Text>
                </View>
              )}
            </View>
          )}

          {/* Announcement Only */}
          {data.responseType === 'announcement_only' && (
            <View style={styles.announcementNotice}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.forest} />
              <Text style={styles.announcementText}>
                This is an informational announcement from Daily Drop Operations. No response submission is required.
              </Text>
            </View>
          )}
        </View>

        {/* Section: Admin Notes / Review Feedback if any */}
        {data.response?.adminNotes && (
          <View style={styles.opsFeedbackCard}>
            <View style={styles.opsFeedbackHeader}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.forest} />
              <Text style={styles.opsFeedbackTitle}>DAILY DROP OPERATIONS FOLLOW-UP</Text>
            </View>
            <Text style={styles.opsFeedbackBody}>"{data.response.adminNotes}"</Text>
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="help-circle" size={40} color={COLORS.forest} style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Confirm Kitchen Submission</Text>
            <Text style={styles.modalText}>
              Are you sure you want to commit your kitchen status as{' '}
              <Text style={{ fontWeight: 'bold' }}>{availability.replace('_', ' ').toUpperCase()}</Text>?
              Daily Drop dispatchers will assign drivers according to your quota.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => handleResponseSubmit(false)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm & Send</Text>
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
    backgroundColor: COLORS.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.muted,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.urgentBg,
    borderColor: COLORS.urgentBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  overdueTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.urgent,
  },
  overdueSub: {
    fontSize: 10,
    color: COLORS.urgent,
    marginTop: 1,
  },
  metaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  catPill: {
    backgroundColor: COLORS.mintSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.forest,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.dark,
    marginBottom: 10,
    lineHeight: 22,
  },
  timestampsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.mintBorder,
    paddingTop: 10,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '500',
  },
  contentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    marginBottom: 12,
  },
  contentHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.forest,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 13,
    color: COLORS.dark,
    lineHeight: 20,
    fontWeight: '400',
  },
  downloadSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mint,
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
    gap: 6,
  },
  downloadSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.forest,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.mintSubtle,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    padding: 10,
    borderRadius: 14,
    marginTop: 6,
  },
  attLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  attName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
  },
  attSize: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 1,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  downloadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.forest,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  submittedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  submittedPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.forest,
  },
  actionBody: {
    marginTop: 4,
  },
  actionPrompt: {
    fontSize: 12,
    color: COLORS.dark,
    fontWeight: '600',
    marginBottom: 10,
  },
  choiceGroup: {
    gap: 8,
    marginBottom: 12,
  },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    backgroundColor: COLORS.white,
    gap: 10,
  },
  choiceLabel: {
    fontSize: 12,
    color: COLORS.dark,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: COLORS.mintSubtle,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: COLORS.dark,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  draftBtn: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  draftBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  submitBtn: {
    flex: 2,
    backgroundColor: COLORS.forest,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  primaryBtn: {
    backgroundColor: COLORS.forest,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mint,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  completedNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.forest,
  },
  submittedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mint,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  submittedSummaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.forest,
  },
  announcementNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mintSubtle,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  announcementText: {
    fontSize: 11,
    color: COLORS.forest,
    flex: 1,
    lineHeight: 16,
  },
  opsFeedbackCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    marginBottom: 12,
  },
  opsFeedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  opsFeedbackTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.forest,
    letterSpacing: 0.5,
  },
  opsFeedbackBody: {
    fontSize: 11,
    color: COLORS.dark,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 34, 23, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalText: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 18,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.forest,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
});
