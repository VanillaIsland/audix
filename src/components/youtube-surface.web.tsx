import { StyleSheet, View } from 'react-native';

/** Sur le web, l'iframe a naturellement l'origine de la page : pas de bricolage. */
export function YouTubeSurface({ videoId }: { videoId: string }) {
  return (
    <View style={styles.wrap}>
      {/* Élément DOM : valide uniquement sur react-native-web. */}
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ border: 0, width: '100%', height: '100%', background: '#000' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { flex: 1, backgroundColor: '#000' } });
