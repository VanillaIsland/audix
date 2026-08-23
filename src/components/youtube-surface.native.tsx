import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Colors } from '@/constants/theme';

/**
 * Erreur 153 = le player refuse un embed sans origine. Charger l'iframe dans un
 * document HTML avec baseUrl lui donne une origine valide, ce qu'une simple
 * `source={{ uri }}` ne fait pas.
 */
const page = (videoId: string) => `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100%}</style>
</head><body>
<iframe src="https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=https%3A%2F%2Fwww.youtube.com"
 allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</body></html>`;

export function YouTubeSurface({ videoId }: { videoId: string }) {
  return (
    <View style={styles.wrap}>
      <WebView
        source={{ html: page(videoId), baseUrl: 'https://www.youtube.com' }}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  web: { flex: 1, backgroundColor: Colors.background },
});
