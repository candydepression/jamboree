// Me: your profile, posting invites, feedback, and your account.
import { useState } from 'react';
import { View } from 'react-native';

import { signOut } from '@/features/auth/api';
import { useAuth, type Profile } from '@/features/auth/AuthProvider';
import { SignInPrompt } from '@/features/auth/SignInPrompt';
import { useOptions } from '@/features/jams/api';
import { deleteMyAccount, useMemberInvites, useMyInstruments, useNewMemberInvite, useSaveProfile, useSendFeedback, type Experience } from '@/features/profile/api';
import { Avatar, Button, Card, Chip, Field, Notice, Row, Screen, Section, Segmented, space, Text } from '@/ui';

const LEVELS: { value: Experience; label: string }[] = [
  { value: 'just_starting', label: 'New' },
  { value: 'some_experience', label: 'Some' },
  { value: 'seasoned', label: 'Seasoned' },
  { value: 'pro', label: 'Pro' },
];

export default function Me() {
  const { userId, profile, email } = useAuth();
  if (!userId || !profile) return <SignInPrompt title="Me" text="Sign in to set up your profile." />;

  return (
    <Screen>
      <Row gap={space.md}>
        <Avatar name={profile.display_name ?? '?'} size={56} tone="green" />
        <View style={{ flex: 1 }}>
          <Text variant="title">{profile.display_name}</Text>
          <Text variant="small" muted>{email}</Text>
        </View>
      </Row>
      <ProfileEditor profile={profile} />
      {profile.can_post ? <Invites /> : null}
      <Feedback />
      <Account />
    </Screen>
  );
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const save = useSaveProfile(profile.id);
  const options = useOptions('instruments');
  const mine = useMyInstruments(profile.id);
  const [stage, setStage] = useState(profile.stage_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [level, setLevel] = useState<Experience | ''>(profile.experience_level ?? '');
  // Untouched, the picks show what's saved; the first tap starts a local edit.
  const [edited, setPlays] = useState<number[] | null>(null);
  const plays = edited ?? mine.data ?? [];

  const unfinished = !profile.bio || !profile.experience_level || !mine.data?.length;

  return (
    <Section label="Your profile">
      {unfinished ? (
        <Card tone="mauve">
          <Text variant="heading">Finish your profile</Text>
          <Text variant="small">Hosts who approve each person see this when you ask to join.</Text>
        </Card>
      ) : null}
      <Field label="Stage name (optional)" value={stage} onChangeText={setStage} maxLength={60} />
      <Text variant="small">What you play</Text>
      <Row gap={6}>
        {options.data?.map((o) => (
          <Chip
            key={o.id}
            label={o.name}
            selected={plays.includes(o.id)}
            onPress={() => setPlays(plays.includes(o.id) ? plays.filter((x) => x !== o.id) : [...plays, o.id])}
          />
        ))}
      </Row>
      <Text variant="small">Experience</Text>
      <Segmented label="Experience" value={level} onChange={setLevel} options={LEVELS} />
      <Field label="About you" value={bio} onChangeText={setBio} multiline maxLength={600} placeholder="Who you play with, what you’re into" />
      <Button
        title={save.isSuccess && !save.isPending ? 'Saved' : 'Save profile'}
        loading={save.isPending}
        onPress={() =>
          save.mutate({
            stage_name: stage.trim() || null,
            bio: bio.trim() || null,
            experience_level: level || null,
            instrumentIds: plays,
          })
        }
      />
      {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
    </Section>
  );
}

function Invites() {
  const { userId } = useAuth();
  const invites = useMemberInvites(userId, true);
  const create = useNewMemberInvite();
  const used = invites.data?.length ?? 0;
  return (
    <Section label={`Posting invites · ${used} of 5 used`}>
      <Text variant="small" muted>Give a code to someone you’d vouch for. It lets them post jams.</Text>
      {invites.data?.map((i) => (
        <Row key={i.code} gap={space.md}>
          <Text variant="stamp" selectable>{i.code}</Text>
          <Text variant="label">{i.redeemed_at ? 'USED' : 'NOT USED YET'}</Text>
        </Row>
      ))}
      {used < 5 ? <Button title="Make an invite code" kind="secondary" loading={create.isPending} onPress={() => create.mutate()} /> : null}
      {create.error ? <Notice tone="danger">{create.error.message}</Notice> : null}
    </Section>
  );
}

function Feedback() {
  const send = useSendFeedback();
  const [message, setMessage] = useState('');
  return (
    <Section label="Send feedback">
      <Field label="What’s working, what’s not" value={message} onChangeText={setMessage} multiline maxLength={4000} />
      <Button
        title={send.isSuccess ? 'Thanks, got it' : 'Send'}
        kind="secondary"
        disabled={!message.trim()}
        loading={send.isPending}
        onPress={() => send.mutate({ message: message.trim(), screen: 'me' }, { onSuccess: () => setMessage('') })}
      />
      {send.error ? <Notice tone="danger">{send.error.message}</Notice> : null}
    </Section>
  );
}

function Account() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Section label="Account">
      <Button title="Sign out" kind="secondary" onPress={signOut} />
      {confirming ? (
        <Card tone="outline">
          <Text>This deletes your profile, RSVPs and jams for good. Chat messages stay as “deleted user”.</Text>
          <Row gap={space.sm} style={{ flexWrap: 'nowrap' }}>
            <Button title="Keep my account" kind="secondary" style={{ flex: 1 }} onPress={() => setConfirming(false)} />
            <Button
              title="Delete"
              kind="danger"
              style={{ flex: 1 }}
              onPress={() => deleteMyAccount().catch((e: Error) => setError(e.message))}
            />
          </Row>
        </Card>
      ) : (
        <Button title="Delete my account" kind="ghost" onPress={() => setConfirming(true)} />
      )}
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </Section>
  );
}
