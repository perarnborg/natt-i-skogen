export type CharacterId = 'girl' | 'boy' | 'other';

export type NodeType =
  | 'pine'
  | 'oak'
  | 'treehouse-oak'
  | 'treehouse-pine'
  | 'safe-cabin';

export type LootType = 'lantern' | 'matches' | 'map';

export type EnvPropType = 'stump' | 'bush' | 'rock' | 'bear-trap' | 'signpost';

export interface ForestNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label?: string;
}

export interface ChestItem {
  id: string;
  x: number;
  y: number;
  nearNodeId: string;
  opened: boolean;
  loot: LootType;
}

export interface EnvProp {
  id: string;
  type: EnvPropType;
  x: number;
  y: number;
  triggered?: boolean;
}

export interface Inventory {
  lanterns: number;
  matches: number;
  maps: number;
  lanternLit: boolean;
}

export type LumberjackMode = 'patrol' | 'chase' | 'blinded';

export type GameStatus = 'menu' | 'playing' | 'won' | 'caught';
