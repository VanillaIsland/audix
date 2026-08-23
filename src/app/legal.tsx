import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';

const UPDATED_AT = '23 août 2026';
const CONTACT = 'vanillalyricsdistribution@gmail.com';

type Block = { heading: string; paragraphs: string[] };

const TERMS: Block[] = [
  {
    heading: 'À quoi sert Audix',
    paragraphs: [
      'Audix est un lecteur privé. Il sert à écouter et à organiser des enregistrements dont tu possèdes les droits, ou que tu es autorisé à utiliser.',
      'L’app lit les fichiers que tu importes depuis ton téléphone et affiche les liens de plateformes que tu ajoutes, en passant par leurs lecteurs officiels.',
    ],
  },
  {
    heading: 'Ce que tu déclares en utilisant Audix',
    paragraphs: [
      'Tu confirmes être titulaire des droits sur les fichiers que tu importes, ou disposer d’une autorisation écrite du titulaire.',
      'Tu restes seul responsable des contenus que tu ajoutes dans l’app et de l’usage que tu en fais.',
    ],
  },
  {
    heading: 'Ce qu’Audix ne fait pas',
    paragraphs: [
      'Audix ne télécharge pas les contenus de YouTube, de Spotify ou de Facebook. Ces liens sont conservés comme références et lus par le lecteur officiel de la plateforme.',
      'Audix ne bloque aucune publicité, ne contourne aucune mesure technique de protection et ne modifie pas le fonctionnement des services tiers.',
      'La sauvegarde hors ligne concerne uniquement les fichiers directs que tu importes ou que tu récupères depuis un lien de transfert que tu contrôles.',
    ],
  },
  {
    heading: 'Services tiers',
    paragraphs: [
      'Quand tu lances une recherche ou une lecture qui passe par YouTube, Spotify ou Facebook, ce sont les conditions de ces services qui s’appliquent à cette lecture, en plus des présentes conditions.',
    ],
  },
  {
    heading: 'Disponibilité et responsabilité',
    paragraphs: [
      'Audix est fourni en l’état, sans garantie de disponibilité continue. Une mise à jour, une panne de service tiers ou une réinstallation peuvent interrompre une fonction.',
      'Pense à garder une copie de tes fichiers ailleurs que dans l’app. Audix ne remplace pas une sauvegarde.',
    ],
  },
  {
    heading: 'Évolution des conditions',
    paragraphs: [
      'Ces conditions peuvent être modifiées quand une fonction change. La date de mise à jour en haut de cette page indique la version en vigueur.',
    ],
  },
];

const PRIVACY: Block[] = [
  {
    heading: 'Où vivent tes données',
    paragraphs: [
      'Ta bibliothèque, tes playlists, tes favoris et ton historique sont enregistrés sur ton appareil. Tes fichiers audio et vidéo ne quittent jamais le téléphone.',
    ],
  },
  {
    heading: 'Ce qui part vers le serveur',
    paragraphs: [
      'Si tu utilises la synchronisation, seules des informations écrites sont envoyées vers Supabase : titre, artiste, album, favori, playlist et, le cas échéant, le lien d’origine. Aucun fichier audio n’est transféré.',
      'Cette synchronisation existe pour te permettre de retrouver ton organisation quand tu changes de téléphone. Tu déclenches toi-même l’envoi.',
    ],
  },
  {
    heading: 'Identifiant de compte',
    paragraphs: [
      'La synchronisation ouvre une session anonyme. Elle crée un identifiant technique, sans nom, sans adresse e-mail et sans mot de passe. Les données sont isolées par cet identifiant.',
    ],
  },
  {
    heading: 'Recherche et lecture',
    paragraphs: [
      'Une recherche envoie les mots que tu tapes à l’API YouTube, par l’intermédiaire d’une fonction serveur. Lire une vidéo ouvre le lecteur officiel de la plateforme, qui applique ses propres traceurs et ses propres règles.',
    ],
  },
  {
    heading: 'Publicité et revente',
    paragraphs: [
      'Audix n’affiche aucune publicité, ne profile personne et ne vend aucune donnée.',
    ],
  },
  {
    heading: 'Supprimer tes données',
    paragraphs: [
      'Supprimer un titre dans l’app efface aussi le fichier hors ligne correspondant. Désinstaller Audix efface la bibliothèque locale.',
      'Pour effacer les métadonnées synchronisées, écris à ' + CONTACT + '.',
    ],
  },
];

function Section({ blocks }: { blocks: Block[] }) {
  return (
    <View style={styles.blocks}>
      {blocks.map((block) => (
        <View key={block.heading} style={styles.block}>
          <Text style={styles.heading}>{block.heading}</Text>
          {block.paragraphs.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function LegalScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms');

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.bar}>
          <Pressable accessibilityLabel="Revenir en arrière" onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.barCopy}>
            <Text style={styles.barTitle}>Informations légales</Text>
            <Text style={styles.barMeta}>Mise à jour du {UPDATED_AT}</Text>
          </View>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.tabs}>
          <Pressable onPress={() => setTab('terms')} style={[styles.tab, tab === 'terms' && styles.tabOn]}>
            <Text style={[styles.tabText, tab === 'terms' && styles.tabTextOn]}>Conditions d’utilisation</Text>
          </Pressable>
          <Pressable onPress={() => setTab('privacy')} style={[styles.tab, tab === 'privacy' && styles.tabOn]}>
            <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextOn]}>Confidentialité</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            {tab === 'terms'
              ? 'Ces conditions décrivent ce que fait Audix, ce qu’il ne fait pas, et ce que tu acceptes en l’utilisant.'
              : 'Voici ce qu’Audix enregistre, ce qui reste sur ton téléphone et ce qui part vers un serveur.'}
          </Text>

          <Section blocks={tab === 'terms' ? TERMS : PRIVACY} />

          <View style={styles.contact}>
            <Ionicons name="mail-outline" size={18} color={Colors.cyan} />
            <Text style={styles.contactText}>Une question ou une demande de suppression : {CONTACT}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  barCopy: { flex: 1 },
  barTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
  barMeta: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 10 },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  tabOn: { borderColor: '#277E98', backgroundColor: '#0D202B' },
  tabText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
  tabTextOn: { color: Colors.text },
  page: { paddingHorizontal: 18, paddingBottom: 40, gap: 16 },
  intro: { color: Colors.textMuted, fontSize: 12, lineHeight: 19 },
  blocks: { gap: 14 },
  block: { gap: 6, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  heading: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  paragraph: { color: Colors.textMuted, fontSize: 12, lineHeight: 19 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, borderRadius: 16, backgroundColor: '#0B1E27' },
  contactText: { flex: 1, color: '#9FD4DE', fontSize: 11, lineHeight: 17 },
});
