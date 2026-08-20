import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PlaybackProvider } from '@/lib/playback';

import '../global.css';

export default function RootLayout() {
  return (
    // PlaybackProvider sits above the navigator so the audio player is never
    // unmounted by navigation — that is what keeps sound alive when the screen
    // locks or the user switches app.
    <PlaybackProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#050609' } }} />
    </PlaybackProvider>
  );
}
