import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import NaviiAvatar from '@/components/NaviiAvatar';
import { getSession, updateSession, type UserSession } from '@/lib/session';
import { updateAccountProfile } from '@/lib/accounts';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { notifyUser } from '@/lib/notify';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved?: (session: UserSession) => void;
};

export default function ProfileEditModal({ visible, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [seed, setSeed] = useState('guest@financialcopilot.com');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    void (async () => {
      const session = await getSession();
      if (!session) return;
      setName(session.name);
      setPhone(session.phone || '');
      setEmail(session.email);
      setSeed(session.naviiSeed);
    })();
  }, [visible]);

  const save = async () => {
    if (!name.trim()) {
      toast.error('Enter your display name');
      return;
    }
    setSaving(true);
    try {
      const session = await updateSession({ name, phone });
      if (!session) {
        toast.error('Sign in first to edit your profile');
        return;
      }
      await updateAccountProfile(session.email, { name: session.name, phone: session.phone });
      await haptic('success', 'login');
      await notifyUser('Profile updated', `Hi ${session.name} — your account details were saved.`, 'info');
      onSaved?.(session);
      onClose();
    } catch {
      toast.error('Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.handle} />
              <Text style={styles.title}>Edit profile</Text>
              <Text style={styles.sub}>Update how you appear across Financial Copilot</Text>

              <View style={styles.avatarRow}>
                <NaviiAvatar seed={seed} size={72} mood="serious" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.emailLabel}>Signed in as</Text>
                  <Text style={styles.email}>{email || '—'}</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Display name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.colors.muted}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Phone (optional)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. 024 XXX XXXX"
                placeholderTextColor={theme.colors.muted}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={save}
                disabled={saving}
              >
                <MaterialCommunityIcons name="content-save-outline" size={18} color={theme.colors.white} />
                <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save profile'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 30, 24, 0.45)',
    justifyContent: 'flex-end',
  },
  kav: { width: '100%', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.line,
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.ink },
  sub: { fontSize: 13, color: theme.colors.muted, marginTop: 4, marginBottom: 18 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  emailLabel: { fontSize: 12, color: theme.colors.muted, fontWeight: '600' },
  email: { fontSize: 14, color: theme.colors.ink, fontWeight: '600', marginTop: 2 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.muted,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.ink,
    backgroundColor: theme.colors.paper,
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: theme.colors.cedar,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: { color: theme.colors.white, fontWeight: '700', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { color: theme.colors.brass, fontWeight: '700' },
});
