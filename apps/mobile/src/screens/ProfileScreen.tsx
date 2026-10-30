import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { Header } from '../components/Header';
import { mobileApi } from '../services/api';
import { storage } from '../services/storage';

interface ProfileScreenProps {
  user: any;
  restaurant: any;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  restaurant,
  onLogout,
}) => {
  // Change Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Edit Phone / Address
  const [phone, setPhone] = useState(restaurant?.phone || '');
  const [address, setAddress] = useState(restaurant?.address || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Required', 'Please enter your current and new password.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Too Short', 'New password must be at least 8 characters long.');
      return;
    }

    setSubmittingPassword(true);
    try {
      await mobileApi.changePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Success', 'Your password has been updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleSaveContact = async () => {
    setSavingProfile(true);
    try {
      await mobileApi.updateProfile({ phone, address });
      Alert.alert('Updated', 'Kitchen contact information saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoutConfirm = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of the Partner App?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await mobileApi.logout();
          } catch (e) {}
          await storage.clearAuth();
          onLogout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Kitchen Profile" subtitle="Account credentials & settings" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Restaurant Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="storefront" size={28} color={COLORS.forest} />
          </View>
          <Text style={styles.restoName}>{restaurant?.name || 'Restaurant Partner'}</Text>
          <Text style={styles.codeText}>{restaurant?.code || 'DD-CODE'}</Text>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={13} color={COLORS.forest} />
            <Text style={styles.verifiedText}>Verified Daily Drop Partner</Text>
          </View>
        </View>

        {/* Authorized User Account Details */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>AUTHORIZED ACCOUNT</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Partner Lead:</Text>
            <Text style={styles.rowVal}>{user?.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email Address:</Text>
            <Text style={styles.rowVal}>{user?.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Role:</Text>
            <Text style={styles.rowVal}>Kitchen Owner / Operations</Text>
          </View>
        </View>

        {/* Contact Information (Editable Fields) */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>KITCHEN CONTACT DETAILS</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>DISPATCH CONTACT PHONE</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>KITCHEN ADDRESS</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveContact}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Update Contact Information</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Security & Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>SECURITY & PREFERENCES</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="key-outline" size={18} color={COLORS.forest} />
              <Text style={styles.menuLabel}>Change Account Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={handleLogoutConfirm}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.urgent} />
              <Text style={[styles.menuLabel, { color: COLORS.urgent }]}>Sign Out of Kitchen Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.urgent} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Account Password</Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.label}>CURRENT PASSWORD</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.label}>NEW PASSWORD (MIN. 8 CHARACTERS)</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handlePasswordChange}
                disabled={submittingPassword}
              >
                {submittingPassword ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Save Password</Text>
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
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  restoName: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.dark,
    textAlign: 'center',
  },
  codeText: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.forest,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.forest,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mintBorder,
  },
  rowLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },
  rowVal: {
    fontSize: 11,
    color: COLORS.dark,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.mintSubtle,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: COLORS.dark,
  },
  saveBtn: {
    backgroundColor: COLORS.forest,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mintBorder,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
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
    padding: 22,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.dark,
    marginBottom: 14,
  },
  modalInputGroup: {
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
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
