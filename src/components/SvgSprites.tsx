import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { SVG_ASSETS } from '../data/svgAssets';
import { CharacterId, EnvPropType, LootType, NodeType } from '../types/game';

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

export const CharacterSprite: React.FC<{
  character: CharacterId;
  size?: number;
}> = ({ character, size = 76 }) => {
  const xml = SVG_ASSETS[character];
  return (
    <SvgXml
      xml={xml}
      width={size}
      height={Math.round(size * (240 / 200))}
    />
  );
};

export const LumberjackSprite: React.FC<{
  blinded?: boolean;
  size?: number;
}> = ({ blinded = false, size = 96 }) => {
  return (
    <View style={{ alignItems: 'center' }}>
      {blinded && (
        <View style={styles.blindBadge}>
          <Text style={styles.blindBadgeText}>💫 BLÄNDAD!</Text>
        </View>
      )}
      <View style={blinded ? { opacity: 0.78 } : undefined}>
        <SvgXml
          xml={SVG_ASSETS.lumberjack}
          width={size}
          height={Math.round(size * (280 / 260))}
        />
      </View>
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
