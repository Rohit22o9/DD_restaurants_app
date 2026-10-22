import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { mobileApi, getBaseHost } from '../services/api';
import { storage } from '../services/storage';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any, restaurant: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('gulati@restaurant.dailydrop.com');
  const [password, setPassword] = useState('PartnerPass2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serverHost, setServerHost] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);

  useEffect(() => {
    getBaseHost().then(h => {
      setServerHost(h);
      setCustomUrl(h);
    });
  }, []);

  const handleSaveCustomUrl = async () => {
    if (customUrl.trim()) {
      await storage.setServerUrl(customUrl.trim());
      setServerHost(customUrl.trim());
      setShowServerConfig(false);
      Alert.alert('Server Saved', `API Host updated to ${customUrl.trim()}`);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await mobileApi.login(email.trim(), password);
      if (res.user.role !== 'restaurant_partner') {
        throw new Error('Access denied: Only registered Restaurant Partners can log into this application.');
      }
      await storage.saveAuth(res.token, res.user, res.restaurant);
      onLoginSuccess(res.token, res.user, res.restaurant);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('PartnerPass2026!');
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.scroll, {
        paddingTop: Math.max(insets.top, 24),
        paddingBottom: Math.max(insets.bottom, 24),
      }]}>
        <View style={styles.card}>
          {/* Logo & Header */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/daily_drop_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PARTNER APP</Text>
            </View>
            <Text style={styles.title}>Kitchen Operations Sign In</Text>
            <Text style={styles.subtitle}>
              Access daily orders, prep briefs, and meal capacity allocations.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={COLORS.urgent} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.form}>
            <Text style={styles.label}>REGISTERED EMAIL</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="partner@restaurant.dailydrop.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In to Kitchen Dashboard</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Demo Selector */}
          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>Quick Testing Accounts:</Text>
            <View style={styles.demoButtons}>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => setDemoAccount('gulati@restaurant.dailydrop.com')}
              >
                <Text style={styles.demoBtnText}>Gulati's Kitchen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => setDemoAccount('bawarchi@restaurant.dailydrop.com')}
              >
                <Text style={styles.demoBtnText}>Bawarchi Biryani</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Server Connection Info */}
          <View style={styles.serverSection}>
            <TouchableOpacity
              onPress={() => setShowServerConfig(!showServerConfig)}
              style={styles.serverBadge}
            >
              <Ionicons name="wifi-outline" size={13} color={COLORS.forest} />
              <Text style={styles.serverBadgeText}>
                API Host: {serverHost || 'Loading...'}
              </Text>
              <Ionicons name={showServerConfig ? 'chevron-up' : 'settings-outline'} size={12} color={COLORS.muted} />
            </TouchableOpacity>

            {showServerConfig && (
              <View style={styles.serverEditWrap}>
                <Text style={styles.serverEditLabel}>Backend Server URL (for physical device):</Text>
                <View style={styles.serverInputRow}>
                  <TextInput
                    style={styles.serverInput}
                    value={customUrl}
                    onChangeText={setCustomUrl}
                    placeholder="http://172.19.13.103:4000"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.serverSaveBtn} onPress={handleSaveCustomUrl}>
                    <Text style={styles.serverSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.serverHint}>
                  Default Wi-Fi IP is http://172.19.13.103:4000
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.footerHelp}>
          Partner accounts are provisioned by Daily Drop. Need an invite? Contact ops@dailydrop.com
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    shadowColor: COLORS.forestDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 170,
    height: 44,
    marginBottom: 10,
  },
  badge: {
    backgroundColor: COLORS.mint,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.forest,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.dark,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.urgentBg,
    borderColor: COLORS.urgentBorder,
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.urgent,
    fontWeight: '600',
    flex: 1,
  },
  form: {
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mintSubtle,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 13,
    color: COLORS.dark,
  },
  eyeBtn: {
    padding: 8,
  },
  loginBtn: {
    backgroundColor: COLORS.forest,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.mintBorder,
    alignItems: 'center',
  },
  demoLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
    marginBottom: 8,
  },
  demoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    backgroundColor: COLORS.mintSubtle,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  demoBtnText: {
    fontSize: 11,
    color: COLORS.forest,
    fontWeight: '700',
  },
  serverSection: {
    marginTop: 14,
    width: '100%',
    alignItems: 'center',
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mintSubtle,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  serverBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.forest,
  },
  serverEditWrap: {
    width: '100%',
    backgroundColor: COLORS.mintSubtle,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    borderRadius: 14,
    padding: 10,
    marginTop: 8,
  },
  serverEditLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.muted,
    marginBottom: 4,
  },
  serverInputRow: {
    flexDirection: 'row',
    gap: 6,
  },
  serverInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: COLORS.dark,
  },
  serverSaveBtn: {
    backgroundColor: COLORS.forest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    justifyContent: 'center',
  },
  serverSaveText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  serverHint: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 4,
  },
  footerHelp: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
  },
});

