import React, { useState } from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameBoard } from '../components/GameBoard';
import { SplashScreen } from '../components/SplashScreen';
import { CharacterSprite, LumberjackSprite } from '../components/SvgSprites';
import { CharacterId } from '../types/game';

const CHARACTER_OPTIONS: {
  id: CharacterId;
  label: string;
  desc: string;
}[] = [
  {
    id: 'girl',
    label: 'Tjej',
    desc: 'Gul regnkappa & röd mössa',
  },
  {
    id: 'boy',
    label: 'Kille',
    desc: 'Rostorange skogsparkas',
  },
  {
    id: 'other',
    label: 'Annat',
    desc: 'Skogsgrön poncho & huva',
  },
];

type AppScreen = 'splash' | 'select' | 'game';

export default function App() {
  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterId>('girl');
  const [screen, setScreen] = useState<AppScreen>('splash');

  if (screen === 'splash') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <SplashScreen
          onStartGame={() => setScreen('game')}
          onChooseCharacter={() => setScreen('select')}
        />
      </SafeAreaView>
    );
  }

  if (screen === 'game') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <GameBoard
          character={selectedCharacter}
          onChangeCharacter={() => setScreen('select')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.menuContainer}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>🌲 NATT I SKOGEN</Text>
          <Text style={styles.subtitle}>
            Spring från träd till träd genom mörkret, göm dig i trädkojor och
            fly från den galna skogshuggaren!
          </Text>
        </View>

        <View style={styles.lumberPreview}>
          <LumberjackSprite size={92} />
        </View>

        <Text style={styles.sectionLabel}>Välj vem du vill spela som:</Text>

        <View style={styles.characterGrid}>
          {CHARACTER_OPTIONS.map((opt) => {
            const active = selectedCharacter === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSelectedCharacter(opt.id)}
                style={[styles.charCard, active && styles.charCardActive]}
              >
                <CharacterSprite character={opt.id} size={78} />
                <Text style={styles.charTitle}>{opt.label}</Text>
                <Text style={styles.charDesc}>{opt.desc}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.startBtn} onPress={() => setScreen('game')}>
          <Text style={styles.startBtnText}>Spring ut i skogen!</Text>
        </Pressable>

        <Pressable onPress={() => setScreen('splash')}>
          <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>
            ← Tillbaka till startskärmen
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#060B10',
  },
  menuContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  headerBlock: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 19,
  },
  lumberPreview: {
    backgroundColor: '#0F1A24',
    padding: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#7F1D1D',
  },
  sectionLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  characterGrid: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  charCard: {
    width: 108,
    backgroundColor: '#0F1A24',
    borderColor: '#1E3242',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  charCardActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#172838',
  },
  charTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  charDesc: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
  },
  startBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  startBtnText: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '900',
  },
});
