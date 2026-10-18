import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { SVG_ASSETS } from '../data/svgAssets';
import {
  CharacterId,
  EnvPropType,
  LootType,
  LumberjackMode,
  NodeType,
} from '../types/game';

export function getTreehouseSvg(
  variant: 'oak' | 'pine',
  hasHiddenPlayer: boolean
): string {
  const raw =
    variant === 'oak' ? SVG_ASSETS.treehouseOak : SVG_ASSETS.treehousePine;
  if (hasHiddenPlayer) {
    return raw;
  }
  return raw.replace(
    '<g id="hidden-player">',
    '<g id="hidden-player" opacity="0">'
  );
}

export function getChestSvg(opened: boolean): string {
  const raw = SVG_ASSETS.chest;
  if (!opened) {
    return raw;
  }
  return raw
    .replace('<g id="lid-open" opacity="0">', '<g id="lid-open" opacity="1">')
    .replace('<g id="loot-glow" opacity="0">', '<g id="loot-glow" opacity="1">')
    .replace('<g id="lid-closed">', '<g id="lid-closed" opacity="0">');
}

export function getLanternSvg(mode: 'unlit' | 'lit' | 'flash'): string {
  const raw = SVG_ASSETS.lantern;
  if (mode === 'lit') {
    return raw;
  }
  if (mode === 'flash') {
    return raw.replace(
      '<g id="flash-blind" opacity="0">',
      '<g id="flash-blind" opacity="1">'
    );
  }
  // unlit
  return raw
    .replace('<g id="glow-lit">', '<g id="glow-lit" opacity="0">')
    .replace('<g id="flame-lit">', '<g id="flame-lit" opacity="0">');
}

type StridePose = 0 | 1 | 2;

/**
 * Splits the character's <g id="legs"> into individually transformable left and right legs/boots,
 * and applies running stride transforms to legs, arms, flashlight, scarf/collar, braids, backpack, and hat.
 */
function buildCharacterPoseSvg(
  character: CharacterId,
  pose: StridePose
): string {
  const raw = SVG_ASSETS[character];
  if (pose === 0) {
    return raw;
  }

  const isLeftForward = pose === 1;

  const leftLegTransform = isLeftForward
    ? 'translate(-2, -10) rotate(13 84 172)'
    : 'translate(-1, 5) rotate(-9 84 172)';
  const rightLegTransform = isLeftForward
    ? 'translate(1, 5) rotate(9 116 172)'
    : 'translate(2, -10) rotate(-13 116 172)';

  const leftArmTransform = isLeftForward
    ? 'translate(0, 4) rotate(18 68 124)'
    : 'translate(0, -6) rotate(-20 68 124)';
  const rightArmTransform = isLeftForward
    ? 'translate(0, -6) rotate(-20 132 124)'
    : 'translate(0, 4) rotate(16 132 124)';

  const backpackTransform = isLeftForward
    ? 'translate(0, -3) rotate(-3.5 100 135)'
    : 'translate(0, -3) rotate(3.5 100 135)';

  const neckTransform = isLeftForward
    ? 'translate(0, -2) rotate(4 100 124)'
    : 'translate(0, -2) rotate(-4 100 124)';

  const headTransform = isLeftForward
    ? 'translate(0, -2) rotate(-2.5 100 88)'
    : 'translate(0, -2) rotate(2.5 100 88)';

  const braidLeftTransform = isLeftForward
    ? 'rotate(14 52 96)'
    : 'rotate(-8 52 96)';
  const braidRightTransform = isLeftForward
    ? 'rotate(8 148 96)'
    : 'rotate(-14 148 96)';

  // Group left leg + left boot and right leg + right boot separately inside <g id="legs">
  let xml = raw.replace(
    /<g id="legs">([\s\S]*?)<\/g>/,
    (_match, inner: string) => {
      const leftLegMatch = inner.match(
        /<!-- Left Leg -->([\s\S]*?)(?=<!-- Right Leg -->)/
      );
      const rightLegMatch = inner.match(
        /<!-- Right Leg -->([\s\S]*?)(?=<!-- Left [A-Za-z ]*Boot -->)/
      );
      const leftBootMatch = inner.match(
        /<!-- Left [A-Za-z ]*Boot -->([\s\S]*?)(?=<!-- Right [A-Za-z ]*Boot -->)/
      );
      const rightBootMatch = inner.match(
        /<!-- Right [A-Za-z ]*Boot -->([\s\S]*)$/
      );

      if (
        !leftLegMatch ||
        !rightLegMatch ||
        !leftBootMatch ||
        !rightBootMatch
      ) {
        return `<g id="legs" transform="${leftLegTransform}">${inner}</g>`;
      }

      return `<g id="legs">
        <g id="leg-left" transform="${leftLegTransform}">
          ${leftLegMatch[1]}
          ${leftBootMatch[1]}
        </g>
        <g id="leg-right" transform="${rightLegTransform}">
          ${rightLegMatch[1]}
          ${rightBootMatch[1]}
        </g>
      </g>`;
    }
  );

  xml = xml
    .replace(
      '<g id="shadow">',
      '<g id="shadow" transform="translate(100, 212) scale(0.86, 0.82) translate(-100, -212)">'
    )
    .replace(
      '<g id="backpack">',
      `<g id="backpack" transform="${backpackTransform}">`
    )
    .replace(
      '<g id="arm-left">',
      `<g id="arm-left" transform="${leftArmTransform}">`
    )
    .replace(
      '<g id="arm-right">',
      `<g id="arm-right" transform="${rightArmTransform}">`
    )
    .replace('<g id="scarf">', `<g id="scarf" transform="${neckTransform}">`)
    .replace('<g id="collar">', `<g id="collar" transform="${neckTransform}">`)
    .replace(
      '<g id="braid-left">',
      `<g id="braid-left" transform="${braidLeftTransform}">`
    )
    .replace(
      '<g id="braid-right">',
      `<g id="braid-right" transform="${braidRightTransform}">`
    )
    .replace(
      '<g id="hair-sides">',
      `<g id="hair-sides" transform="${neckTransform}">`
    )
    .replace('<g id="head">', `<g id="head" transform="${headTransform}">`);

  return xml;
}

const CHARACTER_POSE_CACHE: Record<
  CharacterId,
  Record<StridePose, string>
> = {
  girl: {
    0: buildCharacterPoseSvg('girl', 0),
    1: buildCharacterPoseSvg('girl', 1),
    2: buildCharacterPoseSvg('girl', 2),
  },
  boy: {
    0: buildCharacterPoseSvg('boy', 0),
    1: buildCharacterPoseSvg('boy', 1),
    2: buildCharacterPoseSvg('boy', 2),
  },
  other: {
    0: buildCharacterPoseSvg('other', 0),
    1: buildCharacterPoseSvg('other', 1),
    2: buildCharacterPoseSvg('other', 2),
  },
};

export const CharacterSprite: React.FC<{
  character: CharacterId;
  size?: number;
  isMoving?: boolean;
  trapped?: boolean;
  leanDirection?: number; // -1 left, 0 straight, 1 right
}> = ({
  character,
  size = 76,
  isMoving = false,
  trapped = false,
  leanDirection = 0,
}) => {
  const [stridePose, setStridePose] = useState<StridePose>(0);
  const bobAnim = useRef(new Animated.Value(0)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Alternate limb stride frames while moving
  useEffect(() => {
    if (!isMoving) {
      setStridePose(0);
      return;
    }
    setStridePose(1);
    const stepMs = trapped ? 210 : 115;
    const interval = setInterval(() => {
      setStridePose((prev) => (prev === 1 ? 2 : 1));
    }, stepMs);
    return () => clearInterval(interval);
  }, [isMoving, trapped]);

  // Smooth continuous body bob, tilt, and breathing
  useEffect(() => {
    bobAnim.stopAnimation();
    tiltAnim.stopAnimation();
    scaleAnim.stopAnimation();

    if (isMoving) {
      const halfCycle = trapped ? 210 : 115;
      const runLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(bobAnim, {
              toValue: -7,
              duration: halfCycle,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(bobAnim, {
              toValue: 0,
              duration: halfCycle,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(tiltAnim, {
              toValue: 1,
              duration: halfCycle,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(tiltAnim, {
              toValue: -1,
              duration: halfCycle,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.04,
              duration: halfCycle,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 0.96,
              duration: halfCycle,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      runLoop.start();
      return () => runLoop.stop();
    } else {
      // Subtle idle breathing animation when hiding behind a tree
      tiltAnim.setValue(0);
      const idleLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(bobAnim, {
              toValue: -2,
              duration: 900,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.02,
              duration: 900,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(bobAnim, {
              toValue: 0,
              duration: 900,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 0.99,
              duration: 900,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      idleLoop.start();
      return () => idleLoop.stop();
    }
  }, [bobAnim, isMoving, scaleAnim, tiltAnim, trapped]);

  const baseLean = leanDirection * 5;
  const rotateStr = tiltAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [
      `${baseLean - 6}deg`,
      `${baseLean}deg`,
      `${baseLean + 6}deg`,
    ],
  });

  const xml = CHARACTER_POSE_CACHE[character][stridePose];

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: bobAnim },
          { rotate: rotateStr },
          { scaleY: scaleAnim },
        ],
      }}
    >
      <SvgXml
        xml={xml}
        width={size}
        height={Math.round(size * (240 / 200))}
      />
    </Animated.View>
  );
};

type LumberjackPoseKey =
  | 'idle'
  | 'patrolLeft'
  | 'patrolRight'
  | 'chaseLeft'
  | 'chaseRight'
  | 'blindedLeft'
  | 'blindedRight';

function buildLumberjackPoseSvg(poseKey: LumberjackPoseKey): string {
  const raw = SVG_ASSETS.lumberjack;
  if (poseKey === 'idle') {
    return raw;
  }

  if (poseKey === 'blindedLeft' || poseKey === 'blindedRight') {
    const dir = poseKey === 'blindedLeft' ? -1 : 1;
    return raw
      .replace(
        '<g id="arm-left">',
        `<g id="arm-left" transform="translate(${dir * 4}, -16) rotate(${
          -28 + dir * 10
        } 194 106)">`
      )
      .replace(
        '<g id="arm-right">',
        `<g id="arm-right" transform="translate(${dir * 3}, 6) rotate(${
          14 * dir
        } 68 106)">`
      )
      .replace(
        '<g id="head" transform="rotate(5 133 72)">',
        `<g id="head" transform="rotate(${dir * 14} 133 72)">`
      );
  }

  const isChase = poseKey === 'chaseLeft' || poseKey === 'chaseRight';
  const isLeftStep = poseKey === 'patrolLeft' || poseKey === 'chaseLeft';

  const bootLeftTransform = isLeftStep
    ? `translate(-2, ${isChase ? -14 : -9}) rotate(${
        isChase ? 14 : 9
      } 88 235)`
    : `translate(1, ${isChase ? 5 : 3}) rotate(-6 88 235)`;

  const bootRightTransform = isLeftStep
    ? `translate(-1, ${isChase ? 5 : 3}) rotate(6 180 235)`
    : `translate(2, ${isChase ? -14 : -9}) rotate(${
        isChase ? -14 : -9
      } 180 235)`;

  // Right arm holds the huge bloodstained axe!
  const armRightTransform = isLeftStep
    ? `translate(0, ${isChase ? -9 : -4}) rotate(${
        isChase ? -24 : -11
      } 68 106)`
    : `translate(0, ${isChase ? 5 : 3}) rotate(${
        isChase ? 18 : 9
      } 68 106)`;

  // Left arm with clenched claw hand
  const armLeftTransform = isLeftStep
    ? `translate(0, ${isChase ? 5 : 3}) rotate(${
        isChase ? 18 : 10
      } 194 106)`
    : `translate(0, ${isChase ? -8 : -4}) rotate(${
        isChase ? -22 : -11
      } 194 106)`;

  const headAngle = isLeftStep
    ? isChase
      ? -8
      : -1
    : isChase
    ? 14
    : 9;

  return raw
    .replace(
      '<g id="boot-left">',
      `<g id="boot-left" transform="${bootLeftTransform}">`
    )
    .replace(
      '<g id="boot-right">',
      `<g id="boot-right" transform="${bootRightTransform}">`
    )
    .replace(
      '<g id="arm-right">',
      `<g id="arm-right" transform="${armRightTransform}">`
    )
    .replace(
      '<g id="arm-left">',
      `<g id="arm-left" transform="${armLeftTransform}">`
    )
    .replace(
      '<g id="head" transform="rotate(5 133 72)">',
      `<g id="head" transform="translate(0, ${
        isChase ? -3 : -1
      }) rotate(${headAngle} 133 72)">`
    );
}

const LUMBERJACK_POSE_CACHE: Record<LumberjackPoseKey, string> = {
  idle: buildLumberjackPoseSvg('idle'),
  patrolLeft: buildLumberjackPoseSvg('patrolLeft'),
  patrolRight: buildLumberjackPoseSvg('patrolRight'),
  chaseLeft: buildLumberjackPoseSvg('chaseLeft'),
  chaseRight: buildLumberjackPoseSvg('chaseRight'),
  blindedLeft: buildLumberjackPoseSvg('blindedLeft'),
  blindedRight: buildLumberjackPoseSvg('blindedRight'),
};

export const LumberjackSprite: React.FC<{
  blinded?: boolean;
  mode?: LumberjackMode;
  isMoving?: boolean;
  size?: number;
}> = ({
  blinded = false,
  mode = 'patrol',
  isMoving = true,
  size = 96,
}) => {
  const effectiveMode: LumberjackMode = blinded ? 'blinded' : mode;
  const [stepToggle, setStepToggle] = useState<boolean>(false);
  const stompAnim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isMoving && effectiveMode !== 'blinded') {
      return;
    }
    const intervalMs =
      effectiveMode === 'chase'
        ? 135
        : effectiveMode === 'blinded'
        ? 260
        : 220;
    const timer = setInterval(() => {
      setStepToggle((prev) => !prev);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [effectiveMode, isMoving]);

  useEffect(() => {
    stompAnim.stopAnimation();
    swayAnim.stopAnimation();
    pulseAnim.stopAnimation();

    const halfCycle =
      effectiveMode === 'chase'
        ? 135
        : effectiveMode === 'blinded'
        ? 260
        : 220;

    const stompHeight =
      effectiveMode === 'chase' ? -8 : effectiveMode === 'blinded' ? -2 : -4.5;

    const animLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(stompAnim, {
            toValue: stompHeight,
            duration: halfCycle,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(stompAnim, {
            toValue: 0,
            duration: halfCycle,
            easing: Easing.in(Easing.bounce),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(swayAnim, {
            toValue: 1,
            duration: halfCycle,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(swayAnim, {
            toValue: -1,
            duration: halfCycle,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: effectiveMode === 'chase' ? 1.06 : 1.02,
            duration: halfCycle,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: halfCycle,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animLoop.start();
    return () => animLoop.stop();
  }, [effectiveMode, pulseAnim, stompAnim, swayAnim]);

  const poseKey: LumberjackPoseKey = useMemo(() => {
    if (effectiveMode === 'blinded') {
      return stepToggle ? 'blindedLeft' : 'blindedRight';
    }
    if (!isMoving) return 'idle';
    if (effectiveMode === 'chase') {
      return stepToggle ? 'chaseLeft' : 'chaseRight';
    }
    return stepToggle ? 'patrolLeft' : 'patrolRight';
  }, [effectiveMode, isMoving, stepToggle]);

  const maxAngle =
    effectiveMode === 'chase' ? 7 : effectiveMode === 'blinded' ? 9 : 4;
  const rotateStr = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [`-${maxAngle}deg`, `${maxAngle}deg`],
  });

  return (
    <View style={{ alignItems: 'center' }}>
      {effectiveMode === 'blinded' && (
        <View style={styles.blindBadge}>
          <Text style={styles.blindBadgeText}>💫 BLÄNDAD!</Text>
        </View>
      )}
      <Animated.View
        style={[
          effectiveMode === 'blinded' ? { opacity: 0.8 } : undefined,
          {
            transform: [
              { translateY: stompAnim },
              { rotate: rotateStr },
              { scale: pulseAnim },
            ],
          },
        ]}
      >
        <SvgXml
          xml={LUMBERJACK_POSE_CACHE[poseKey]}
          width={size}
          height={Math.round(size * (280 / 260))}
        />
      </Animated.View>
    </View>
  );
};

export const ForestNodeSprite: React.FC<{
  type: NodeType;
  hasHiddenPlayer?: boolean;
  size?: number;
}> = ({ type, hasHiddenPlayer = false, size = 115 }) => {
  const xml = useMemo(() => {
    switch (type) {
      case 'pine':
        return SVG_ASSETS.treePine;
      case 'oak':
        return SVG_ASSETS.treeOak;
      case 'treehouse-oak':
      case 'safe-cabin':
        return getTreehouseSvg('oak', hasHiddenPlayer || type === 'safe-cabin');
      case 'treehouse-pine':
        return getTreehouseSvg('pine', hasHiddenPlayer);
    }
  }, [type, hasHiddenPlayer]);

  return (
    <SvgXml
      xml={xml}
      width={size}
      height={Math.round(size * 1.18)}
    />
  );
};

export const ChestSprite: React.FC<{
  opened: boolean;
  size?: number;
}> = ({ opened, size = 58 }) => {
  const xml = useMemo(() => getChestSvg(opened), [opened]);
  return <SvgXml xml={xml} width={size} height={size} />;
};

export const ItemSprite: React.FC<{
  item: LootType;
  lanternMode?: 'unlit' | 'lit' | 'flash';
  size?: number;
}> = ({ item, lanternMode = 'lit', size = 44 }) => {
  const xml = useMemo(() => {
    if (item === 'lantern') return getLanternSvg(lanternMode);
    if (item === 'matches') return SVG_ASSETS.matches;
    return SVG_ASSETS.map;
  }, [item, lanternMode]);

  return <SvgXml xml={xml} width={size} height={size} />;
};

export const EnvPropSprite: React.FC<{
  type: EnvPropType;
  size?: number;
}> = ({ type, size = 64 }) => {
  const xml = useMemo(() => {
    switch (type) {
      case 'stump':
        return SVG_ASSETS.stump;
      case 'bush':
        return SVG_ASSETS.bush;
      case 'rock':
        return SVG_ASSETS.rock;
      case 'bear-trap':
        return SVG_ASSETS.bearTrap;
      case 'signpost':
        return SVG_ASSETS.signpost;
    }
  }, [type]);

  return <SvgXml xml={xml} width={size} height={Math.round(size * 0.85)} />;
};

const styles = StyleSheet.create({
  blindBadge: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CA8A04',
    marginBottom: -8,
    zIndex: 10,
  },
  blindBadgeText: {
    color: '#422006',
    fontSize: 10,
    fontWeight: '800',
  },
});
