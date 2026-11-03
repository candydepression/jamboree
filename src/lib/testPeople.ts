// Made-up people from supabase/seed.sql. The sign-in screen offers them only in test mode,
// so anyone trying the test build can step into each role without a real email.
export const TEST_PEOPLE = [
  { email: 'maya@test.onetwothreefour.app', name: 'Maya R.', role: 'Hosts a weekly home jam (approval on)' },
  { email: 'dev@test.onetwothreefour.app', name: 'Dev P.', role: 'Runs the Thursday venue jam' },
  { email: 'june@test.onetwothreefour.app', name: 'June K.', role: 'Drummer, going to two jams' },
  { email: 'sam@test.onetwothreefour.app', name: 'Sam T.', role: 'Bassist, waiting on a request' },
  { email: 'lee@test.onetwothreefour.app', name: 'Lee W.', role: 'Listener, new here, can’t post yet' },
] as const;
