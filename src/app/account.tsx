import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText, PrimaryButton, Row, Section } from '@/components/ui';
import { Spacing, useColors } from '@/constants/theme';
import { useSync } from '@/lib/use-sync';

/** Sign in with a 6-digit code sent by email. No password to remember. */
export default function AccountScreen() {
  const c = useColors();
  const { configured, sendCode, verifyCode } = useSync();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());

  const send = async () => {
    setBusy(true);
    setError(null);
    const e = await sendCode(email);
    setBusy(false);
    if (e) setError(e);
    else setSent(true);
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const e = await verifyCode(email, code);
    setBusy(false);
    if (e) setError(e.includes('expired') || e.includes('invalid') ? 'That code didn’t work. Check it, or send a new one.' : e);
    else router.back();
  };

  const inputStyle = [styles.input, { color: c.text }];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingVertical: Spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <AppText variant="largeTitle">Sync your things</AppText>
          <AppText variant="subhead" color={c.textSecondary} style={{ lineHeight: 21 }}>
            Sign in to keep your items, photos, receipts and settings the same on your iPhone and iPad, and backed
            up if you lose a device. We email you a code; there’s no password.
          </AppText>
        </View>

        {!configured ? (
          <Section footer="This build of Vestle has no sync server. See the README to connect Supabase.">
            <Row label="Sync isn’t set up" icon="cloud-offline-outline" last />
          </Section>
        ) : (
          <>
            <Section footer={sent ? `We sent a 6-digit code to ${email.trim()}.` : undefined}>
              <Row label="Email" last={!sent}>
                <TextInput
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setSent(false);
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={c.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  style={inputStyle}
                  accessibilityLabel="Email"
                />
              </Row>
              {sent ? (
                <Row label="Code" last>
                  <TextInput
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    placeholderTextColor={c.textTertiary}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    style={inputStyle}
                    accessibilityLabel="Sign-in code"
                  />
                </Row>
              ) : null}
            </Section>

            {error ? (
              <AppText variant="footnote" color={c.red} style={styles.error}>
                {error}
              </AppText>
            ) : null}

            <View style={styles.actions}>
              {busy ? (
                <ActivityIndicator color={c.ink} />
              ) : sent ? (
                <>
                  <PrimaryButton label="Sign in" icon="checkmark" onPress={() => code.length === 6 && void verify()} />
                  <PrimaryButton label="Send a new code" secondary onPress={() => void send()} />
                </>
              ) : (
                <PrimaryButton label="Email me a code" icon="mail-outline" onPress={() => emailOk && void send()} />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  intro: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.lg },
  input: { flex: 1, textAlign: 'right', fontSize: 17, paddingVertical: 4 },
  error: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  actions: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
});
