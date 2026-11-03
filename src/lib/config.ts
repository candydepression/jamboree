// App-wide settings, read once from the environment (see .env.example).

/** Seattle is the launch city; jams store their own timezone, this is the default for new ones. */
export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

/** Test builds offer "sign in as a made-up person" (supabase/seed.sql). Never on in the live app. */
export const isTestMode = process.env.EXPO_PUBLIC_TEST_MODE === '1';
export const testPassword = process.env.EXPO_PUBLIC_TEST_PASSWORD ?? '';

export const APP_VERSION = '0.1.0';
