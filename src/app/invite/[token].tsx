// An invite link: sign in, then the invite-only jam opens up for you.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { SignInPrompt } from '@/features/auth/SignInPrompt';
import { openInvite } from '@/features/jams/api';
import { Loading, Notice, Screen, Text } from '@/ui';

export default function Invite() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { userId } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    openInvite(token)
      .then((jamId) => router.replace({ pathname: '/jam/[id]', params: { id: jamId } }))
      .catch((e: Error) => setError(e.message));
  }, [token, userId]);

  if (!userId) return <SignInPrompt title="You’re invited" text="Sign in to see the jam you were invited to." />;
  if (!error) return <Loading />;
  return (
    <Screen>
      <Text variant="title">That link didn’t work</Text>
      <Notice tone="danger">{error}</Notice>
    </Screen>
  );
}
