import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  BASE_SIGHT_RADIUS,
  INITIAL_CHESTS,
  INITIAL_ENV_PROPS,
  INITIAL_NODES,
  LIT_LANTERN_SIGHT_BONUS,
  MAP_SIGHT_BONUS,
  MAX_DASH_DISTANCE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getDistance,
  isTreehouseNode,
} from '../data/forestLevel';
import {
  CharacterId,
  ChestItem,
  EnvProp,
  ForestNode,
  GameStatus,
  Inventory,
  LumberjackMode,
} from '../types/game';
import {
  CharacterSprite,
  ChestSprite,
  EnvPropSprite,
  ForestNodeSprite,
  ItemSprite,
  LumberjackSprite,
} from './SvgSprites';

interface GameBoardProps {
  character: CharacterId;
  onChangeCharacter: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  character,
  onChangeCharacter,
}) => {
  const windowDims = useWindowDimensions();
  const viewportWidth = Math.min(windowDims.width - 16, 520);
  const [viewportHeight, setViewportHeight] = useState<number>(
    Math.max(windowDims.height - 280, 320)
  );
  const scale = viewportWidth / WORLD_WIDTH;

  // Player state
  const [currentNodeId, setCurrentNodeId] = useState<string>('node-start');
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({
    x: 450,
    y: 1670,
  });
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [trappedTimer, setTrappedTimer] = useState<number>(0);
  const [dustPuffs, setDustPuffs] = useState<
    { id: number; x: number; y: number; ttl: number; heavy?: boolean }[]
  >([]);
  const stepCounterRef = useRef<number>(0);

  // World items & props
  const [chests, setChests] = useState<ChestItem[]>(INITIAL_CHESTS);
  const [envProps, setEnvProps] = useState<EnvProp[]>(INITIAL_ENV_PROPS);
  const [inventory, setInventory] = useState<Inventory>({
    lanterns: 1,
    matches: 1,
    maps: 0,
    lanternLit: false,
  });
  const [flashBurstActive, setFlashBurstActive] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>(
    'Tryck på ett träd eller en trädkoja i närheten för att springa dit!'
  );

  // Lumberjack AI state
  const [lumberPos, setLumberPos] = useState<{ x: number; y: number }>({
    x: 240,
    y: 1220,
  });
  const [lumberMode, setLumberMode] = useState<LumberjackMode>('patrol');
  const [blindedTimer, setBlindedTimer] = useState<number>(0);
  const patrolTargetRef = useRef<{ x: number; y: number }>({ x: 660, y: 1180 });

  // Game status
  const [status, setStatus] = useState<GameStatus>('playing');

  const currentNode = useMemo(
    () => INITIAL_NODES.find((n) => n.id === currentNodeId)!,
    [currentNodeId]
  );

  const playerLean = useMemo(() => {
    if (!isRunning || !targetNodeId) return 0;
    const target = INITIAL_NODES.find((n) => n.id === targetNodeId);
    if (!target) return 0;
    const dx = target.x - playerPos.x;
    if (Math.abs(dx) < 15) return 0;
    return dx > 0 ? 1 : -1;
  }, [isRunning, playerPos.x, targetNodeId]);

  const isHidingInTreehouse =
    !isRunning && isTreehouseNode(currentNode.type);

  // Sight radius calculation (Base + Maps + Lit Lantern)
  const sightRadius =
    BASE_SIGHT_RADIUS +
    inventory.maps * MAP_SIGHT_BONUS +
    (inventory.lanternLit ? LIT_LANTERN_SIGHT_BONUS : 0);

  // Reachable nodes from current position when not mid-dash
  const reachableNodeIds = useMemo(() => {
    if (isRunning || status !== 'playing') return new Set<string>();
    const set = new Set<string>();
    for (const node of INITIAL_NODES) {
      if (node.id === currentNodeId) continue;
      const dist = getDistance(playerPos.x, playerPos.y, node.x, node.y);
      if (dist <= MAX_DASH_DISTANCE) {
        set.add(node.id);
      }
    }
    return set;
  }, [currentNodeId, isRunning, playerPos.x, playerPos.y, status]);

  // Reset / Restart game
  const restartGame = () => {
    setCurrentNodeId('node-start');
    setTargetNodeId(null);
    setPlayerPos({ x: 450, y: 1670 });
    setIsRunning(false);
    setTrappedTimer(0);
    setChests(INITIAL_CHESTS);
    setEnvProps(INITIAL_ENV_PROPS);
    setInventory({
      lanterns: 1,
      matches: 1,
      maps: 0,
      lanternLit: false,
    });
    setLumberPos({ x: 240, y: 1220 });
    setLumberMode('patrol');
    setBlindedTimer(0);
    setStatus('playing');
    setToastMessage(
      'Ny natt i skogen! Spring från träd till träd upp mot Trygga Stugan.'
    );
  };

  // Main 60fps / tick game loop
  useEffect(() => {
    if (status !== 'playing') return;

    const interval = setInterval(() => {
      const dt = 0.05; // 50ms tick

      // Update trap timer
      setTrappedTimer((prev) => Math.max(0, prev - dt));

      // Update footstep dust puffs
      stepCounterRef.current += 1;
      setDustPuffs((prev) => {
        const next = prev
          .map((p) => ({ ...p, ttl: p.ttl - dt }))
          .filter((p) => p.ttl > 0);

        if (isRunning && stepCounterRef.current % 2 === 0) {
          const offsetSide = stepCounterRef.current % 4 === 0 ? -9 : 9;
          next.push({
            id: Date.now() + Math.random(),
            x: playerPos.x + offsetSide,
            y: playerPos.y + 8,
            ttl: 0.35,
          });
        }
        if (
          lumberMode === 'chase' &&
          blindedTimer <= 0 &&
          stepCounterRef.current % 3 === 0
        ) {
          const offsetSide = stepCounterRef.current % 6 === 0 ? -14 : 14;
          next.push({
            id: Date.now() + Math.random() + 1,
            x: lumberPos.x + offsetSide,
            y: lumberPos.y + 12,
            ttl: 0.4,
            heavy: true,
          });
        }
        return next.slice(-14);
      });

      // Update blinded timer
      setBlindedTimer((prev) => {
        const next = Math.max(0, prev - dt);
        if (prev > 0 && next === 0) {
          setLumberMode('patrol');
          setToastMessage('Skogshuggaren ser igen! Akta dig!');
        }
        return next;
      });

      // Move player if dashing between trees
      setPlayerPos((prevPlayer) => {
        if (!isRunning || !targetNodeId) return prevPlayer;
        const targetNode = INITIAL_NODES.find((n) => n.id === targetNodeId);
        if (!targetNode) return prevPlayer;

        const dx = targetNode.x - prevPlayer.x;
        const dy = targetNode.y - prevPlayer.y;
        const dist = Math.hypot(dx, dy);
        const speed = trappedTimer > 0 ? 95 : 250; // px per second
        const step = speed * dt;

        if (dist <= step) {
          // Arrived at target tree/treehouse!
          setIsRunning(false);
          setCurrentNodeId(targetNode.id);
          setTargetNodeId(null);

          if (targetNode.type === 'safe-cabin') {
            setStatus('won');
            setToastMessage('Du nådde Trygga Stugan och klarade natten!');
          } else if (isTreehouseNode(targetNode.type)) {
            setToastMessage(
              `Gömd i ${targetNode.label || 'trädkojan'}! Skogshuggaren kan inte se dig här.`
            );
          }
          return { x: targetNode.x, y: targetNode.y };
        }

        const nextX = prevPlayer.x + (dx / dist) * step;
        const nextY = prevPlayer.y + (dy / dist) * step;

        // Check bear traps along path
        setEnvProps((prevProps) =>
          prevProps.map((prop) => {
            if (
              prop.type === 'bear-trap' &&
              !prop.triggered &&
              getDistance(nextX, nextY, prop.x, prop.y) < 42
            ) {
              setTrappedTimer(1.8);
              setToastMessage('AJ! Du klev i en björnsax! Skogshuggaren hörde dig!');
              setLumberMode('chase');
              return { ...prop, triggered: true };
            }
            return prop;
          })
        );

        return { x: nextX, y: nextY };
      });

      // Update Lumberjack AI
      setLumberPos((prevLumber) => {
        if (blindedTimer > 0) {
          return prevLumber;
        }

        const distToPlayer = getDistance(
          prevLumber.x,
          prevLumber.y,
          playerPos.x,
          playerPos.y
        );

        // Catch check (cannot be caught while hidden inside a treehouse)
        if (!isHidingInTreehouse && distToPlayer < 56) {
          setStatus('caught');
          setToastMessage('Skogshuggaren fångade dig i mörkret!');
          return prevLumber;
        }

        // Detection rules:
        // - If player is running in the open, detection range is 340px
        // - If player is standing behind a normal tree, detection range is 200px
        // - If player is hidden in a treehouse, detection range is 0 (invisible!)
        const detectionRange = isHidingInTreehouse
          ? 0
          : isRunning
          ? 340
          : 205;

        let targetX = patrolTargetRef.current.x;
        let targetY = patrolTargetRef.current.y;
        let speed = 105;

        if (distToPlayer <= detectionRange) {
          if (lumberMode !== 'chase') {
            setLumberMode('chase');
            setToastMessage('Skogshuggaren fick syn på dig! Göm dig i en trädkoja eller blända honom!');
          }
          targetX = playerPos.x;
          targetY = playerPos.y;
          speed = 152;
        } else {
          if (lumberMode === 'chase') {
            setLumberMode('patrol');
          }
          const distToPatrol = getDistance(
            prevLumber.x,
            prevLumber.y,
            targetX,
            targetY
          );
          if (distToPatrol < 30) {
            // Pick a new patrol waypoint near the player's general vertical zone
            const bandY = Math.max(
              240,
              Math.min(1520, playerPos.y - 160 + (Math.random() - 0.5) * 360)
            );
            const bandX = 180 + Math.random() * 540;
            patrolTargetRef.current = { x: bandX, y: bandY };
            targetX = bandX;
            targetY = bandY;
          }
        }

        const dx = targetX - prevLumber.x;
        const dy = targetY - prevLumber.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 2) return prevLumber;

        return {
          x: prevLumber.x + (dx / dist) * speed * dt,
          y: prevLumber.y + (dy / dist) * speed * dt,
        };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [
    blindedTimer,
    isHidingInTreehouse,
    isRunning,
    lumberMode,
    playerPos.x,
    playerPos.y,
    status,
    targetNodeId,
    trappedTimer,
  ]);

  // Handle tapping a tree or treehouse to dash there
  const handlePressNode = (node: ForestNode) => {
    if (status !== 'playing' || isRunning) return;
    if (node.id === currentNodeId) return;

    const dist = getDistance(playerPos.x, playerPos.y, node.x, node.y);
    if (dist > MAX_DASH_DISTANCE) {
      setToastMessage('Det trädet är för långt bort! Välj ett närmare träd först.');
      return;
    }

    setTargetNodeId(node.id);
    setIsRunning(true);
  };

  // Handle tapping a chest in the forest
  const handlePressChest = (chest: ChestItem) => {
    if (status !== 'playing' || chest.opened) return;
    const dist = getDistance(playerPos.x, playerPos.y, chest.x, chest.y);
    if (dist > 190) {
      setToastMessage('Spring till trädet bredvid kistan för att öppna den!');
      return;
    }

    setChests((prev) =>
      prev.map((c) => (c.id === chest.id ? { ...c, opened: true } : c))
    );

    if (chest.loot === 'lantern') {
      setInventory((prev) => ({ ...prev, lanterns: prev.lanterns + 1 }));
      setToastMessage('Du hittade en Stormlykta i kistan! 🏮');
    } else if (chest.loot === 'matches') {
      setInventory((prev) => ({ ...prev, matches: prev.matches + 1 }));
      setToastMessage('Du hittade Tändstickor i kistan! 🔥');
    } else if (chest.loot === 'map') {
      setInventory((prev) => ({ ...prev, maps: prev.maps + 1 }));
      setToastMessage('Du hittade en Skogskarta! Ditt synfält i mörkret ökade! 🗺️');
    }
  };

  // Light lantern using matches
  const handleLightLantern = () => {
    if (status !== 'playing') return;
    if (inventory.lanternLit) {
      setToastMessage('Din lykta är redan tänd! Tryck på Blända när skogshuggaren är nära.');
      return;
    }
    if (inventory.lanterns <= 0) {
      setToastMessage('Du behöver hitta en lykta i en kista först!');
      return;
    }
    if (inventory.matches <= 0) {
      setToastMessage('Du behöver tändstickor för att tända lyktan!');
      return;
    }

    setInventory((prev) => ({
      ...prev,
      matches: prev.matches - 1,
      lanternLit: true,
    }));
    setToastMessage('Du tände lyktan med en tändsticka! Nu ser du längre och kan blända skogshuggaren!');
  };

  // Blind the lumberjack with a lit lantern
  const handleBlindLumberjack = () => {
    if (status !== 'playing') return;
    if (!inventory.lanternLit) {
      if (inventory.lanterns > 0 && inventory.matches > 0) {
        // Light & blind in one smooth action if player has both!
        setInventory((prev) => ({
          ...prev,
          lanterns: prev.lanterns - 1,
          matches: prev.matches - 1,
          lanternLit: false,
        }));
      } else {
        setToastMessage('Tänd en lykta med tändstickor först för att kunna blända!');
        return;
      }
    } else {
      setInventory((prev) => ({
        ...prev,
        lanterns: Math.max(0, prev.lanterns - 1),
        lanternLit: false,
      }));
    }

    setFlashBurstActive(true);
    setTimeout(() => setFlashBurstActive(false), 650);

    const dist = getDistance(playerPos.x, playerPos.y, lumberPos.x, lumberPos.y);
    if (dist <= 420) {
      setBlindedTimer(5.0);
      setLumberMode('blinded');
      setToastMessage('BLIXT! Skogshuggaren är bländad i 5 sekunder! Spring!! ⚡');
    } else {
      setToastMessage('Lyktan blixtrade till, men skogshuggaren var för långt bort!');
    }
  };

  // Camera vertical scroll to center player smoothly inside viewport
  const cameraY = useMemo(() => {
    const desiredTop = playerPos.y * scale - viewportHeight * 0.58;
    const maxScroll = WORLD_HEIGHT * scale - viewportHeight;
    return Math.max(0, Math.min(maxScroll, desiredTop));
  }, [playerPos.y, scale, viewportHeight]);

  // Progress percentage toward Safe Cabin (from y=1670 to y=130)
  const progressPct = Math.round(
    Math.max(0, Math.min(100, ((1670 - playerPos.y) / (1670 - 130)) * 100))
  );

  const lumberDistance = Math.round(
    getDistance(playerPos.x, playerPos.y, lumberPos.x, lumberPos.y)
  );

  return (
    <View style={styles.container}>
      {/* TOP HUD: Progress, Lumberjack Alert & Character Switch */}
      <View style={[styles.topHud, { width: viewportWidth }]}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.gameTitle}>🌲 NATT I SKOGEN</Text>
            <Text style={styles.subText}>
              Avstånd till Trygga Stugan: {100 - progressPct}% kvar
            </Text>
          </View>

          <View style={styles.topRightButtons}>
            <Pressable style={styles.smallBtn} onPress={onChangeCharacter}>
              <Text style={styles.smallBtnText}>Byt barn</Text>
            </Pressable>
            <Pressable style={styles.smallBtn} onPress={restartGame}>
              <Text style={styles.smallBtnText}>Omstart</Text>
            </Pressable>
          </View>
        </View>

        {/* Progress Bar + Status Pill */}
        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progressPct}%` }]}
            />
          </View>
          <View
            style={[
              styles.statusPill,
              lumberMode === 'chase'
                ? styles.pillDanger
                : lumberMode === 'blinded'
                ? styles.pillBlind
                : isHidingInTreehouse
                ? styles.pillSafe
                : styles.pillNormal,
            ]}
          >
            <Text style={styles.statusPillText}>
              {lumberMode === 'blinded'
                ? `💫 Bländad (${blindedTimer.toFixed(1)}s)`
                : lumberMode === 'chase'
                ? '🪓 JAGAD!'
                : isHidingInTreehouse
                ? '🏠 Gömd i koja'
                : `👣 Skogshuggare: ${lumberDistance}m`}
            </Text>
          </View>
        </View>
      </View>

      {/* MAIN SCROLLING FOREST VIEWPORT */}
      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - viewportHeight) > 2) {
            setViewportHeight(h);
          }
        }}
        style={[
          styles.viewport,
          { width: viewportWidth },
        ]}
      >
        <View
          style={{
            width: WORLD_WIDTH * scale,
            height: WORLD_HEIGHT * scale,
            transform: [{ translateY: -cameraY }],
          }}
        >
          {/* SVG Night Forest Ground Paths, Reachable Lines & Fog-of-War Lighting */}
          <Svg
            width={WORLD_WIDTH * scale}
            height={WORLD_HEIGHT * scale}
            viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <RadialGradient id="playerLight" cx="50%" cy="50%" r="50%">
                <Stop
                  offset="0%"
                  stopColor={inventory.lanternLit ? '#FFE885' : '#7DD3FC'}
                  stopOpacity={inventory.lanternLit ? '0.28' : '0.16'}
                />
                <Stop
                  offset="65%"
                  stopColor="#1E3A4C"
                  stopOpacity="0.1"
                />
                <Stop offset="100%" stopColor="#060B10" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Base Dark Forest Floor */}
            <Rect
              x="0"
              y="0"
              width={WORLD_WIDTH}
              height={WORLD_HEIGHT}
              fill="#0B151C"
            />

            {/* Winding Dirt Trail Hints in the Forest */}
            <Line
              x1="450"
              y1="1670"
              x2="350"
              y2="1540"
              stroke="#152530"
              strokeWidth="26"
              strokeLinecap="round"
            />
            <Line
              x1="350"
              y1="1540"
              x2="460"
              y2="1250"
              stroke="#152530"
              strokeWidth="26"
              strokeLinecap="round"
            />
            <Line
              x1="460"
              y1="1250"
              x2="440"
              y2="950"
              stroke="#152530"
              strokeWidth="26"
              strokeLinecap="round"
            />
            <Line
              x1="440"
              y1="950"
              x2="450"
              y2="660"
              stroke="#152530"
              strokeWidth="26"
              strokeLinecap="round"
            />
            <Line
              x1="450"
              y1="660"
              x2="440"
              y2="420"
              stroke="#152530"
              strokeWidth="26"
              strokeLinecap="round"
            />
            <Line
              x1="440"
              y1="420"
              x2="450"
              y2="130"
              stroke="#152530"
              strokeWidth="26"
              strokeLinecap="round"
            />

            {/* Dashed Connection Lines to Reachable Trees */}
            {INITIAL_NODES.map((node) => {
              if (!reachableNodeIds.has(node.id)) return null;
              return (
                <Line
                  key={`line-${node.id}`}
                  x1={playerPos.x}
                  y1={playerPos.y}
                  x2={node.x}
                  y2={node.y}
                  stroke={
                    isTreehouseNode(node.type) || node.type === 'safe-cabin'
                      ? '#FBBF24'
                      : '#38BDF8'
                  }
                  strokeWidth="3.5"
                  strokeDasharray="10, 8"
                  opacity="0.65"
                />
              );
            })}

            {/* Player Sight Radius Circle */}
            <Circle
              cx={playerPos.x}
              cy={playerPos.y}
              r={sightRadius}
              fill="url(#playerLight)"
              stroke={inventory.lanternLit ? '#FDE047' : '#38BDF8'}
              strokeWidth="2"
              strokeDasharray="8, 8"
              opacity="0.7"
            />
          </Svg>

          {/* 1. ENVIRONMENT PROPS (Stumps, Bushes, Rocks, Bear Traps, Signposts) */}
          {envProps.map((prop) => {
            const dist = getDistance(playerPos.x, playerPos.y, prop.x, prop.y);
            const inSight = dist <= sightRadius + 65;
            const propSize = 58 * scale;
            return (
              <View
                key={prop.id}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: prop.x * scale - propSize / 2,
                  top: prop.y * scale - propSize / 2,
                  opacity: inSight ? (prop.triggered ? 0.45 : 0.95) : 0.16,
                  zIndex: Math.round(prop.y),
                }}
              >
                <EnvPropSprite type={prop.type} size={propSize} />
              </View>
            );
          })}

          {/* 2. CHESTS (Containing Lanterns, Matches, Maps) */}
          {chests.map((chest) => {
            const dist = getDistance(
              playerPos.x,
              playerPos.y,
              chest.x,
              chest.y
            );
            const inSight = dist <= sightRadius + 75 || inventory.maps >= 2;
            const canOpen = !chest.opened && dist <= 190;
            const chestSize = 54 * scale;

            return (
              <Pressable
                key={chest.id}
                onPress={() => handlePressChest(chest)}
                style={{
                  position: 'absolute',
                  left: chest.x * scale - chestSize / 2,
                  top: chest.y * scale - chestSize / 2,
                  opacity: inSight ? 1 : 0.2,
                  zIndex: Math.round(chest.y) + 2,
                  alignItems: 'center',
                }}
              >
                {canOpen && (
                  <View style={styles.chestPrompt}>
                    <Text style={styles.chestPromptText}>Öppna kista!</Text>
                  </View>
                )}
                <ChestSprite opened={chest.opened} size={chestSize} />
              </Pressable>
            );
          })}

          {/* 3. TREES & TREEHOUSES (Interactive Dash Nodes) */}
          {INITIAL_NODES.map((node) => {
            const isReachable = reachableNodeIds.has(node.id);
            const isCurrent = node.id === currentNodeId && !isRunning;
            const hasPlayerInside =
              isCurrent && isTreehouseNode(node.type);
            const dist = getDistance(playerPos.x, playerPos.y, node.x, node.y);
            const inSight =
              dist <= sightRadius + 110 ||
              isReachable ||
              node.type === 'safe-cabin';

            const nodeSize =
              (node.type === 'safe-cabin'
                ? 145
                : isTreehouseNode(node.type)
                ? 130
                : 112) * scale;

            return (
              <Pressable
                key={node.id}
                onPress={() => handlePressNode(node)}
                style={{
                  position: 'absolute',
                  left: node.x * scale - nodeSize / 2,
                  top: node.y * scale - nodeSize * 0.88,
                  width: nodeSize,
                  alignItems: 'center',
                  opacity: inSight ? 1 : 0.25,
                  zIndex: Math.round(node.y),
                }}
              >
                {/* Reachable Ring Highlight under tree trunk */}
                {isReachable && (
                  <View
                    style={[
                      styles.reachableRing,
                      {
                        width: nodeSize * 0.72,
                        height: nodeSize * 0.26,
                        bottom: 4,
                        borderColor:
                          isTreehouseNode(node.type) ||
                          node.type === 'safe-cabin'
                            ? '#FBBF24'
                            : '#38BDF8',
                      },
                    ]}
                  />
                )}

                <ForestNodeSprite
                  type={node.type}
                  hasHiddenPlayer={hasPlayerInside}
                  size={nodeSize}
                />

                {node.label && (inSight || node.type === 'safe-cabin') && (
                  <View
                    style={[
                      styles.nodeBadge,
                      node.type === 'safe-cabin' && styles.safeCabinBadge,
                    ]}
                  >
                    <Text style={styles.nodeBadgeText}>{node.label}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}

          {/* 3.5 FOOTSTEP DUST PUFFS ON FOREST FLOOR */}
          {dustPuffs.map((puff) => {
            const puffSize = (puff.heavy ? 18 : 12) * scale;
            return (
              <View
                key={puff.id}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: puff.x * scale - puffSize / 2,
                  top: puff.y * scale - puffSize / 2,
                  width: puffSize,
                  height: puffSize * 0.65,
                  borderRadius: puffSize,
                  backgroundColor: puff.heavy
                    ? 'rgba(239, 68, 68, 0.35)'
                    : 'rgba(186, 230, 253, 0.45)',
                  opacity: Math.max(0, Math.min(1, puff.ttl * 2.5)),
                  zIndex: Math.round(puff.y) + 1,
                }}
              />
            );
          })}

          {/* 4. MAIN CHARACTER (Hidden inside cabin when in a treehouse) */}
          {!isHidingInTreehouse && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: playerPos.x * scale - 38 * scale,
                top: playerPos.y * scale - 76 * scale,
                zIndex: Math.round(playerPos.y) + 5,
                alignItems: 'center',
              }}
            >
              {flashBurstActive && (
                <View style={styles.flashOverlayCircle} />
              )}
              <CharacterSprite
                character={character}
                size={76 * scale}
                isMoving={isRunning}
                trapped={trappedTimer > 0}
                leanDirection={playerLean}
              />
            </View>
          )}

          {/* 5. CRAZED LUMBERJACK */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: lumberPos.x * scale - 48 * scale,
              top: lumberPos.y * scale - 92 * scale,
              zIndex: Math.round(lumberPos.y) + 6,
              opacity:
                lumberDistance <= sightRadius + 95 || lumberMode === 'chase'
                  ? 1
                  : 0.22,
            }}
          >
            <LumberjackSprite
              blinded={lumberMode === 'blinded'}
              mode={lumberMode}
              isMoving={status === 'playing' && lumberMode !== 'blinded'}
              size={96 * scale}
            />
          </View>
        </View>

        {/* WIN / CAUGHT MODAL OVERLAY */}
        {status !== 'playing' && (
          <View style={styles.overlayModal}>
            <Text style={styles.modalTitle}>
              {status === 'won'
                ? '🌅 DU KLARADE NATTEN!'
                : '🪓 FÅNGAD AV SKOGSHUGGAREN!'}
            </Text>
            <Text style={styles.modalDesc}>
              {status === 'won'
                ? 'Du sprang från träd till träd genom mörkret och nådde Trygga Stugan i säkerhet!'
                : 'Skogshuggaren hann ikapp dig mellan träden. Göm dig i trädkojor eller blända honom med en tänd lykta!'}
            </Text>
            <Pressable style={styles.modalPrimaryBtn} onPress={restartGame}>
              <Text style={styles.modalPrimaryBtnText}>Spela igen</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* BOTTOM INVENTORY & ACTION BAR */}
      <View style={[styles.bottomBar, { width: viewportWidth }]}>
        <Text style={styles.toastText} numberOfLines={1}>
          {toastMessage}
        </Text>

        <View style={styles.inventoryRow}>
          {/* Lanterns slot */}
          <Pressable style={styles.invCard} onPress={handleLightLantern}>
            <ItemSprite
              item="lantern"
              lanternMode={
                flashBurstActive
                  ? 'flash'
                  : inventory.lanternLit
                  ? 'lit'
                  : 'unlit'
              }
              size={28}
            />
            <View style={styles.invTextCol}>
              <Text style={styles.invTitle} numberOfLines={1}>
                Lyktor: {inventory.lanterns}
              </Text>
              <Text style={styles.invSub} numberOfLines={1}>
                {inventory.lanternLit ? 'Tänd (+Syn)' : 'Tänd lykta'}
              </Text>
            </View>
          </Pressable>

          {/* Matches slot */}
          <Pressable style={styles.invCard} onPress={handleLightLantern}>
            <ItemSprite item="matches" size={28} />
            <View style={styles.invTextCol}>
              <Text style={styles.invTitle} numberOfLines={1}>
                Stickor: {inventory.matches}
              </Text>
              <Text style={styles.invSub} numberOfLines={1}>
                Tänder
              </Text>
            </View>
          </Pressable>

          {/* Maps slot */}
          <View style={styles.invCard}>
            <ItemSprite item="map" size={28} />
            <View style={styles.invTextCol}>
              <Text style={styles.invTitle} numberOfLines={1}>
                Kartor: {inventory.maps}
              </Text>
              <Text style={styles.invSub} numberOfLines={1}>
                Syn: {Math.round(sightRadius)}m
              </Text>
            </View>
          </View>

          {/* BLIND LUMBERJACK ACTION BUTTON */}
          <Pressable
            onPress={handleBlindLumberjack}
            style={[
              styles.blindActionBtn,
              !(
                inventory.lanternLit ||
                (inventory.lanterns > 0 && inventory.matches > 0)
              ) && styles.blindActionBtnDisabled,
            ]}
          >
            <Text style={styles.blindActionBtnText}>⚡ BLÄNDA</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060B10',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 6,
  },
  topHud: {
    backgroundColor: '#0F1A24',
    borderColor: '#1E3242',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  topRightButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  smallBtn: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  smallBtnText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 7,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillNormal: {
    backgroundColor: '#1E293B',
  },
  pillSafe: {
    backgroundColor: '#065F46',
  },
  pillDanger: {
    backgroundColor: '#991B1B',
  },
  pillBlind: {
    backgroundColor: '#854D0E',
  },
  statusPillText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '700',
  },
  viewport: {
    flex: 1,
    minHeight: 220,
    backgroundColor: '#091118',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E3242',
    overflow: 'hidden',
    position: 'relative',
  },
  reachableRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderRadius: 999,
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
  },
  nodeBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
    marginTop: -6,
  },
  safeCabinBadge: {
    backgroundColor: '#065F46',
    borderColor: '#34D399',
  },
  nodeBadgeText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '700',
  },
  chestPrompt: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: -4,
    zIndex: 5,
  },
  chestPromptText: {
    color: '#1E1B18',
    fontSize: 9,
    fontWeight: '800',
  },
  flashOverlayCircle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -80,
    backgroundColor: 'rgba(254, 249, 195, 0.75)',
  },
  overlayModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 11, 16, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    color: '#CBD5E1',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
  },
  modalPrimaryBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
  },
  modalPrimaryBtnText: {
    color: '#1C1917',
    fontWeight: '800',
    fontSize: 15,
  },
  bottomBar: {
    backgroundColor: '#0F1A24',
    borderColor: '#1E3242',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 5,
  },
  toastText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  inventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  invCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162432',
    borderColor: '#273E52',
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 4,
    gap: 4,
  },
  invTextCol: {
    flex: 1,
  },
  invTitle: {
    color: '#F1F5F9',
    fontSize: 10,
    fontWeight: '700',
  },
  invSub: {
    color: '#94A3B8',
    fontSize: 8.5,
  },
  blindActionBtn: {
    backgroundColor: '#FACC15',
    paddingHorizontal: 9,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#EAB308',
  },
  blindActionBtnDisabled: {
    backgroundColor: '#334155',
    borderColor: '#475569',
    opacity: 0.6,
  },
  blindActionBtnText: {
    color: '#1E1B18',
    fontSize: 10.5,
    fontWeight: '900',
  },
});
