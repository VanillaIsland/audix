import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '@/constants/theme';

type Props = { videoId: string; autoPlay?: boolean };

export function YouTubeSurface({ videoId, autoPlay = false }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const valid = /^[A-Za-z0-9_-]{6,20}$/.test(videoId ?? '');

  useEffect(() => { setAttempt(0); setBlocked(false); }, [videoId]);

  const fail = () => { if (attempt === 0) setAttempt(1); else setBlocked(true); };

  if (!valid || blocked) {
    return (
      <View style={styles.blocked}>
        <Ionicons name="videocam-off-outline" size={22} color={Colors.textMuted} />
        <Text style={styles.blockedTitle}>{valid ? 'Vidéo bloquée par YouTube ici' : 'Aperçu vidéo indisponible pour cette référence'}</Text>
        <Text style={styles.blockedCopy}>Utilise le bouton lecture (audio sans pub) ou ouvre la source officielle.</Text>
        <Pressable style={styles.blockedBtn} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)}>
          <Ionicons name="open-outline" size={14} color={Colors.cyan} />
          <Text style={styles.blockedBtnText}>Ouvrir dans YouTube</Text>
        </Pressable>
      </View>
    );
  }

  const host = attempt === 0 ? 'https://www.youtube.com' : 'https://www.youtube-nocookie.com';
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;height:100%;background:#000}</style></head><body><div id="p" style="position:absolute;inset:0"></div><script src="${host}/iframe_api"></script><script>var player;window.onYouTubeIframeAPIReady=function(){player=new YT.Player('p',{videoId:'${videoId}',playerVars:{playsinline:1,rel:0,modestbranding:1,autoplay:${autoPlay ? 1 : 0}},events:{onReady:function(e){if(${autoPlay ? 'true' : 'false'}){e.target.playVideo();}},onError:function(e){window.ReactNativeWebView.postMessage('err:'+e.data);}}});};</script></body></html>`;

  return (
    <WebView
      key={`${videoId}-${attempt}`}
      source={{ html }}
      style={styles.webview}
      javaScriptEnabled
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      onError={fail}
      onMessage={(event) => { if (event.nativeEvent.data.startsWith('err:')) fail(); }}
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: '#000' },
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0B0F18', padding: 12 },
  blockedTitle: { color: Colors.textMuted, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  blockedCopy: { color: Colors.textMuted, fontSize: 8, textAlign: 'center', marginBottom: 4 },
  blockedBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#0B2630' },
  blockedBtnText: { color: Colors.cyan, fontSize: 10, fontWeight: '900' },
});
