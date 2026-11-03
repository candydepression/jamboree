import { router } from 'expo-router';

import { Button, Screen, Text } from '@/ui';

/** What a signed-out person sees on tabs that need an account. */
export function SignInPrompt({ title = 'Hi there', text }: { title?: string; text: string }) {
  return (
    <Screen>
      <Text variant="title">{title}</Text>
      <Text muted>{text}</Text>
      <Button title="Sign in" onPress={() => router.push('/sign-in')} />
    </Screen>
  );
}
