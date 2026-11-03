import { Tabs } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/api';
import { fonts, useColors } from '@/theme';

// Simple line icons, drawn here so the app carries no icon font.
const ICONS: Record<string, string> = {
  index: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z',
  going: 'M4 6h16M4 12h16M4 18h10',
  post: 'M12 5v14M5 12h14',
  inbox: 'M4 13l2.5-7h11L20 13v6H4zM4 13h5l1 2h4l1-2h5',
  me: 'M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6',
};

function TabIcon({ name, color }: { name: string; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d={ICONS[name]} />
      {name === 'index' ? <Circle cx={12} cy={9.5} r={2.5} /> : null}
      {name === 'me' ? <Circle cx={12} cy={8} r={4} /> : null}
    </Svg>
  );
}

export default function TabsLayout() {
  const c = useColors();
  const { userId } = useAuth();
  const unread = useNotifications(!!userId).data?.filter((n) => !n.read_at).length ?? 0;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.line, minHeight: 60 },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        tabBarIcon: ({ color }) => <TabIcon name={route.name} color={String(color)} />,
      })}>
      <Tabs.Screen name="index" options={{ title: 'Explore' }} />
      <Tabs.Screen name="going" options={{ title: 'Going' }} />
      <Tabs.Screen name="post" options={{ title: 'Post' }} />
      <Tabs.Screen
        name="inbox"
        options={{ title: 'Inbox', tabBarBadge: unread || undefined, tabBarBadgeStyle: { backgroundColor: c.chip, color: c.onChip } }}
      />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}
