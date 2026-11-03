// Sign in with a 6-digit code sent by email. Google and Apple come once their accounts exist.
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { sendCode, signInAsTestPerson, verifyCode } from '@/features/auth/api';
import { TEST_PEOPLE } from '@/features/auth/testPeople';
import { isTestMode } from '@/lib/config';
import { Button, Card, Field, Notice, Screen, Section, space, Text } from '@/ui';
import { DrumKit } from '@/ui/art/DrumKit';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(step: () => Promise<{ error: { message: string } | null }>, after?: () => void) {
    setBusy(true);
    setError(null);
    const { error: e } = await step();
    setBusy(false);
    if (e) setError(e.message);
    else after?.();
  }

  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const askForCode = () => run(() => sendCode(email), () => setSent(true));
  const verify = () => run(() => verifyCode(email, code), done);
  const asTestPerson = (who: string) => run(() => signInAsTestPerson(who), done);

  return (
    <Screen>
      <View style={{ alignItems: 'center' }}>
        <DrumKit size={220} />
      </View>
      <View style={{ gap: space.xs }}>
        <Text variant="title">Where musicians find each other.</Text>
        <Text muted>Sign in to RSVP, chat with the group, and post your own jams.</Text>
      </View>

      {!sent ? (
        <View style={{ gap: space.md }}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            onSubmitEditing={askForCode}
          />
          <Button title="Email me a code" onPress={askForCode} loading={busy} disabled={!email.includes('@')} />
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <Text>We sent a 6-digit code to {email.trim()}.</Text>
          <Field
            label="Code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            onSubmitEditing={verify}
          />
          <Button title="Sign in" onPress={verify} loading={busy} disabled={code.trim().length < 6} />
          <Button title="Use a different email" kind="ghost" onPress={() => { setSent(false); setCode(''); }} />
        </View>
      )}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {isTestMode ? (
        <Section label="Test build · sign in as a made-up person">
          {TEST_PEOPLE.map((p) => (
            <Card key={p.email} tone="outline">
              <Text variant="heading">{p.name}</Text>
              <Text variant="small" muted>{p.role}</Text>
              <Button title={`Be ${p.name.split(' ')[0]}`} kind="secondary" onPress={() => asTestPerson(p.email)} disabled={busy} />
            </Card>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
