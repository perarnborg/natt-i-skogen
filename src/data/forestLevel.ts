import { ChestItem, EnvProp, ForestNode } from '../types/game';

export const WORLD_WIDTH = 900;
export const WORLD_HEIGHT = 1800;

/** Max distance the player can dash between two trees/treehouses */
export const MAX_DASH_DISTANCE = 320;

/** Base sight radius in the dark night forest (expanded by maps & lit lantern) */
export const BASE_SIGHT_RADIUS = 195;
export const MAP_SIGHT_BONUS = 75;
export const LIT_LANTERN_SIGHT_BONUS = 65;

export const INITIAL_NODES: ForestNode[] = [
  // Goal at the very top of the forest
  {
    id: 'node-safe-cabin',
    type: 'safe-cabin',
    x: 450,
    y: 130,
    label: 'Trygga Stugan (Mål!)',
  },

  // Upper deep forest row (y: 300 - 420)
  { id: 'node-16', type: 'pine', x: 250, y: 290 },
  { id: 'node-15', type: 'treehouse-pine', x: 640, y: 310, label: 'Utkikskoja' },
  { id: 'node-14', type: 'oak', x: 440, y: 420 },

  // Upper-mid forest row (y: 540 - 690)
  { id: 'node-13', type: 'treehouse-oak', x: 210, y: 530, label: 'Ek-koja' },
  { id: 'node-12', type: 'pine', x: 690, y: 550 },
  { id: 'node-11', type: 'pine', x: 450, y: 660 },

  // Center forest row (y: 800 - 960)
  { id: 'node-10', type: 'oak', x: 230, y: 780 },
  { id: 'node-9', type: 'treehouse-pine', x: 660, y: 820, label: 'Gran-koja' },
  { id: 'node-8', type: 'oak', x: 440, y: 950 },

  // Lower-mid forest row (y: 1100 - 1260)
  { id: 'node-7', type: 'treehouse-oak', x: 220, y: 1100, label: 'Gömställe' },
  { id: 'node-6', type: 'pine', x: 670, y: 1120 },
  { id: 'node-5', type: 'pine', x: 460, y: 1250 },

  // Lower forest row near start (y: 1390 - 1660)
  { id: 'node-4', type: 'oak', x: 240, y: 1390 },
  { id: 'node-3', type: 'treehouse-pine', x: 660, y: 1420, label: 'Trädkoja' },
  { id: 'node-2', type: 'pine', x: 350, y: 1540 },
  {
    id: 'node-start',
    type: 'oak',
    x: 450,
    y: 1670,
    label: 'Startträd',
  },
];

export const INITIAL_CHESTS: ChestItem[] = [
  {
    id: 'chest-1',
    x: 280,
    y: 1560,
    nearNodeId: 'node-2',
    opened: false,
    loot: 'matches',
  },
  {
    id: 'chest-2',
    x: 165,
    y: 1410,
    nearNodeId: 'node-4',
    opened: false,
    loot: 'lantern',
  },
  {
    id: 'chest-3',
    x: 735,
    y: 1440,
    nearNodeId: 'node-3',
    opened: false,
    loot: 'map',
  },
  {
    id: 'chest-4',
    x: 535,
    y: 1265,
    nearNodeId: 'node-5',
    opened: false,
    loot: 'matches',
  },
  {
    id: 'chest-5',
    x: 150,
    y: 1120,
    nearNodeId: 'node-7',
    opened: false,
    loot: 'lantern',
  },
  {
    id: 'chest-6',
    x: 520,
    y: 965,
    nearNodeId: 'node-8',
    opened: false,
    loot: 'map',
  },
  {
    id: 'chest-7',
    x: 735,
    y: 835,
    nearNodeId: 'node-9',
    opened: false,
    loot: 'lantern',
  },
  {
    id: 'chest-8',
    x: 370,
    y: 675,
    nearNodeId: 'node-11',
    opened: false,
    loot: 'matches',
  },
  {
    id: 'chest-9',
    x: 145,
    y: 550,
    nearNodeId: 'node-13',
    opened: false,
    loot: 'map',
  },
];

export const INITIAL_ENV_PROPS: EnvProp[] = [
  // Signposts guiding the player northward
  { id: 'prop-sign-1', type: 'signpost', x: 540, y: 1630 },
  { id: 'prop-sign-2', type: 'signpost', x: 350, y: 1010 },
  { id: 'prop-sign-3', type: 'signpost', x: 530, y: 390 },

  // Freshly chopped stumps left by the crazed lumberjack
  { id: 'prop-stump-1', type: 'stump', x: 560, y: 1490 },
  { id: 'prop-stump-2', type: 'stump', x: 330, y: 1180 },
  { id: 'prop-stump-3', type: 'stump', x: 575, y: 740 },
  { id: 'prop-stump-4', type: 'stump', x: 330, y: 460 },

  // Mossy boulders with bioluminescent mushrooms
  { id: 'prop-rock-1', type: 'rock', x: 160, y: 1580 },
  { id: 'prop-rock-2', type: 'rock', x: 750, y: 1270 },
  { id: 'prop-rock-3', type: 'rock', x: 140, y: 920 },
  { id: 'prop-rock-4', type: 'rock', x: 760, y: 670 },
  { id: 'prop-rock-5', type: 'rock', x: 160, y: 370 },

  // Dense night berry bushes
  { id: 'prop-bush-1', type: 'bush', x: 390, y: 1420 },
  { id: 'prop-bush-2', type: 'bush', x: 580, y: 1120 },
  { id: 'prop-bush-3', type: 'bush', x: 330, y: 840 },
  { id: 'prop-bush-4', type: 'bush', x: 570, y: 560 },
  { id: 'prop-bush-5', type: 'bush', x: 360, y: 260 },

  // Rusty bear traps placed by the lumberjack along paths!
  { id: 'prop-trap-1', type: 'bear-trap', x: 455, y: 1380, triggered: false },
  { id: 'prop-trap-2', type: 'bear-trap', x: 345, y: 1090, triggered: false },
  { id: 'prop-trap-3', type: 'bear-trap', x: 550, y: 880, triggered: false },
  { id: 'prop-trap-4', type: 'bear-trap', x: 340, y: 600, triggered: false },
  { id: 'prop-trap-5', type: 'bear-trap', x: 540, y: 360, triggered: false },
];

export function isTreehouseNode(type: ForestNode['type']): boolean {
  return type === 'treehouse-oak' || type === 'treehouse-pine';
}

export function getDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}
