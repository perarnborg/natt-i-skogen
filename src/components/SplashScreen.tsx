import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

const childInspirationImg = require('../../graphics/inspo-child.png');
const lumberjackInspirationImg = require('../../graphics/inspo-lumberjack.png');

interface SplashScreenProps {
  onStartGame: () => void;
  onChooseCharacter: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onStartGame,
  onChooseCharacter,
}) => {
  const { width, height } = useWindowDimensions();
  const isCompact = height < 720;

  // Entrance & looping animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(-24)).current;
  const childFloat = useRef(new Animated.Value(0)).current;
  const lumberPulse = useRef(new Animated.Value(1)).current;
  const lanternGlow = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(titleSlide, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    const childLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(childFloat, {
          toValue: -6,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(childFloat, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const lumberLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(lumberPulse, {
          toValue: 1.04,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(lumberPulse, {
          toValue: 0.98,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(lanternGlow, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(lanternGlow, {
          toValue: 0.65,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    childLoop.start();
    lumberLoop.start();
    glowLoop.start();

    return () => {
      childLoop.stop();
      lumberLoop.stop();
      glowLoop.stop();
    };
  }, [childFloat, fadeAnim, lanternGlow, lumberPulse, titleSlide]);

  const cardWidth = Math.min(width * 0.46, 178);
  const cardHeight = isCompact ? cardWidth * 1.32 : cardWidth * 1.42;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* SVG Night Forest & Blood Moon Backdrop */}
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 400 800`}
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#05080D" />
            <Stop offset="45%" stopColor="#0C1824" />
            <Stop offset="100%" stopColor="#060B10" />
          </LinearGradient>
          <RadialGradient id="moonGlow" cx="75%" cy="22%" r="38%">
            <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.32" />
            <Stop offset="55%" stopColor="#7F1D1D" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#05080D" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="lanternAura" cx="28%" cy="55%" r="40%">
            <Stop offset="0%" stopColor="#FBBF24" stopOpacity="0.28" />
            <Stop offset="60%" stopColor="#D97706" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#05080D" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect x="0" y="0" width="400" height="800" fill="url(#skyGrad)" />
        <Circle cx="300" cy="175" r="150" fill="url(#moonGlow)" />
        <Circle cx="110" cy="440" r="160" fill="url(#lanternAura)" />

        {/* Full Moon behind the pine silhouettes */}
        <Circle cx="305" cy="160" r="36" fill="#FEE2E2" opacity="0.85" />
        <Circle cx="305" cy="160" r="31" fill="#FECACA" opacity="0.95" />

        {/* Distant Dark Pine Silhouettes */}
        <Path
          d="M-20 520 L25 380 L55 460 L95 340 L135 470 L175 360 L215 480 L260 330 L305 465 L350 350 L395 470 L430 390 L430 800 L-20 800 Z"
          fill="#081119"
          opacity="0.9"
        />
        <Path
          d="M-20 590 L40 450 L85 550 L140 420 L190 560 L245 430 L295 555 L345 440 L415 570 L415 800 L-20 800 Z"
          fill="#050A0F"
        />

        {/* Atmospheric Ground Mist */}
        <Ellipse
          cx="200"
          cy="560"
          rx="220"
          ry="45"
          fill="#1E293B"
          opacity="0.22"
        />
      </Svg>

      {/* TOP TITLE HEADER */}
      <Animated.View
        style={[
          styles.headerSection,
          { transform: [{ translateY: titleSlide }] },
        ]}
      >
        <View style={styles.nightBadge}>
          <Text style={styles.nightBadgeText}>🌲 ÖVERLEVNADSSPEL I MÖRKRET</Text>
        </View>
        <Text style={[styles.mainTitle, isCompact && { fontSize: 30 }]}>
          NATT I SKOGEN
        </Text>
        <Text style={styles.tagline}>
          Hitta lyktor, göm dig i trädkojor och undvik skogshuggarens yxa
        </Text>
      </Animated.View>

      {/* DUAL INSPIRATION ART SHOWCASE: LUMBERJACK VS CHILD */}
      <View style={styles.charactersStage}>
        {/* LUMBERJACK CARD (Right / Looming Menace) */}
        <Animated.View
          style={[
            styles.characterCard,
            styles.lumberCard,
            {
              width: cardWidth * 1.06,
              height: cardHeight * 1.05,
              transform: [{ scale: lumberPulse }, { rotate: '3.5deg' }],
            },
          ]}
        >
          <Image
            source={lumberjackInspirationImg}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.lumberVignette} />
          <View style={[styles.roleTag, styles.lumberRoleTag]}>
            <Text style={styles.lumberRoleText}>🪓 SKOGSHUGGAREN</Text>
          </View>
        </Animated.View>

        {/* CHILD CARD (Left / Foreground Hero with Lantern) */}
        <Animated.View
          style={[
            styles.characterCard,
            styles.childCard,
            {
              width: cardWidth,
              height: cardHeight,
              transform: [{ translateY: childFloat }, { rotate: '-3.5deg' }],
            },
          ]}
        >
          <Image
            source={childInspirationImg}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.childLanternGlow, { opacity: lanternGlow }]}
          />
          <View style={[styles.roleTag, styles.childRoleTag]}>
            <Text style={styles.childRoleText}>🏮 BARNET I SKOGEN</Text>
          </View>
        </Animated.View>

        {/* Center VS / Tension Emblem */}
        <View style={styles.vsBadge}>
          <Text style={styles.vsText}>⚡</Text>
        </View>
      </View>

      {/* BOTTOM CALL TO ACTION BUTTONS */}
      <View style={styles.bottomActions}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 },
          ]}
          onPress={onStartGame}
        >
          <Text style={styles.primaryBtnText}>🔥 STARTA JAKTEN</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && { opacity: 0.75 },
          ]}
          onPress={onChooseCharacter}
        >
          <Text style={styles.secondaryBtnText}>
            Välj karaktär (Tjej / Kille / Annat)
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060B10',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerSection: {
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  nightBadge: {
    backgroundColor: 'rgba(15, 26, 36, 0.88)',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  nightBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  mainTitle: {
    color: '#F8FAFC',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(245, 158, 11, 0.45)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  tagline: {
    color: '#94A3B8',
    fontSize: 12.5,
    textAlign: 'center',
    maxWidth: 310,
    lineHeight: 17,
  },
  charactersStage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    marginVertical: 4,
  },
  characterCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 12,
  },
  childCard: {
    borderWidth: 2.5,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    marginLeft: -18,
    marginTop: 22,
    zIndex: 3,
  },
  lumberCard: {
    borderWidth: 2.5,
    borderColor: '#DC2626',
    shadowColor: '#991B1B',
    marginRight: -12,
    marginBottom: 18,
    zIndex: 2,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  lumberVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(127, 29, 29, 0.14)',
  },
  childLanternGlow: {
    position: 'absolute',
    left: -15,
    top: '28%',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(251, 191, 36, 0.28)',
  },
  roleTag: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  childRoleTag: {
    backgroundColor: 'rgba(20, 30, 42, 0.9)',
    borderColor: '#F59E0B',
  },
  lumberRoleTag: {
    backgroundColor: 'rgba(40, 12, 12, 0.9)',
    borderColor: '#EF4444',
  },
  childRoleText: {
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  lumberRoleText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  vsBadge: {
    position: 'absolute',
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F1A24',
    borderWidth: 2,
    borderColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  vsText: {
    fontSize: 18,
  },
  bottomActions: {
    width: '100%',
    maxWidth: 340,
    gap: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#F59E0B',
    borderColor: '#FDE047',
    borderWidth: 1.5,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  primaryBtnText: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: '#0F1A24',
    borderColor: '#1E3242',
    borderWidth: 1.5,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
});
