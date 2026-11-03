// The one required step after signing up: a name. Everything else waits for "finish your profile".
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Field, Notice, Row, Screen, Text } from '@/components/ui';
import { useSaveProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { space } from '@/theme';

export default function Onboarding() {
  const { userId } = useAuth();
  const save = useSaveProfile(userId);
  const [first, setFirst] = useState('');
  const [initial, setInitial] = useState('');
  const [stage, setStage] = useState('');

  const shown = stage.trim() || [first.trim(), initial.trim() && `${initial.trim().toUpperCase()}.`].filter(Boolean).join(' ');

  return (
    <Screen
      footer={
        <Button
          title="Continue"
          disabled={!first.trim()}
          loading={save.isPending}
          onPress={() =>
            save.mutate({
              first_name: first.trim(),
              last_initial: initial.trim().slice(0, 1).toUpperCase() || null,
              stage_name: stage.trim() || null,
            })
          }
        />
      }>
      <View style={{ gap: space.xs }}>
        <Text variant="label">STEP 1 OF 1</Text>
        <Text variant="title">What should people call you?</Text>
        <Text muted>Others see your first name and last initial, or your stage name if you have one.</Text>
      </View>
      <Row gap={space.md} style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <Field label="First name" value={first} onChangeText={setFirst} autoComplete="given-name" maxLength={40} />
        <View style={{ width: 110 }}>
          <Field label="Last initial" value={initial} onChangeText={setInitial} maxLength={1} autoCapitalize="characters" />
        </View>
      </Row>
      <Field label="Stage name (optional)" value={stage} onChangeText={setStage} maxLength={60} />
      {shown ? <Text variant="stamp">SHOWS AS · {shown.toUpperCase()}</Text> : null}
      {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
    </Screen>
  );
}
