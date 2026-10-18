import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
  LinearGradient,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import {
  BASE_SIGHT_RADIUS,
  LIT_LANTERN_SIGHT_BONUS,
  MAP_SIGHT_BONUS,
  MAX_DASH_DISTANCE,
  WORLD_WIDTH,
  generateForestLevel,
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

const childInspirationImg = require('../../graphics/inspo-child.png');
const lumberjackInspirationImg = require('../../graphics/inspo-lumberjack.png');

const MAX_HEARTS = 3;

interface GameBoardProps {
  character: CharacterId;
  onChangeCharacter: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  character,
  onChangeCharacter,
}) => {
  const windowDims = useWindowDimensions();
  const winWidth = windowDims.width;
  const winHeight = windowDims.height;
  const isCompactScreen = winHeight < 740;
  const viewportWidth = Math.min(winWidth - 16, 520);
  const [viewportHeight, setViewportHeight] = useState<number>(
    Math.max(winHeight - 280, 320)
  );
  const scale = viewportWidth / WORLD_WIDTH;

  // Level & Hearts state
  const [level, setLevel] = useState<number>(1);
  const [hearts, setHearts] = useState<number>(MAX_HEARTS);
  const [hurtTimer, setHurtTimer] = useState<number>(0);

  const levelConfig = useMemo(() => generateForestLevel(level), [level]);

  // Player state
  const [currentNodeId, setCurrentNodeId] = useState<string>('node-start');
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>(
    () => levelConfig.startPos
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [trappedTimer, setTrappedTimer] = useState<number>(0);
  const [dustPuffs, setDustPuffs] = useState<
    { id: number; x: number; y: number; ttl: number; heavy?: boolean }[]
  >([]);
  const stepCounterRef = useRef<number>(0);

  // World items & props
  const [chests, setChests] = useState<ChestItem[]>(() => levelConfig.chests);
  const [envProps, setEnvProps] = useState<EnvProp[]>(
    () => levelConfig.envProps
  );
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
  const [lumberPos, setLumberPos] = useState<{ x: number; y: number }>(
    () => levelConfig.lumberStartPos
  );
  const [lumberMode, setLumberMode] = useState<LumberjackMode>('patrol');
  const [blindedTimer, setBlindedTimer] = useState<number>(0);
  const patrolTargetRef = useRef<{ x: number; y: number }>({
    x: 660,
    y: 1180,
  });

  // Game status
  const [status, setStatus] = useState<GameStatus>('playing');

  const currentNode = useMemo(
    () =>
      levelConfig.nodes.find((n) => n.id === currentNodeId) ||
      levelConfig.nodes[levelConfig.nodes.length - 1],
    [currentNodeId, levelConfig.nodes]
  );

  // Failsafe check: if player is at safe-cabin while status is still 'playing', trigger level-complete immediately
  useEffect(() => {
    if (status === 'playing' && currentNode.type === 'safe-cabin') {
      setStatus('level-complete');
    }
  }, [currentNode.type, status]);

  const playerLean = useMemo(() => {
    if (!isRunning || !targetNodeId) return 0;
    const target = levelConfig.nodes.find((n) => n.id === targetNodeId);
    if (!target) return 0;
    const dx = target.x - playerPos.x;
    if (Math.abs(dx) < 15) return 0;
    return dx > 0 ? 1 : -1;
  }, [isRunning, levelConfig.nodes, playerPos.x, targetNodeId]);

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
    for (const node of levelConfig.nodes) {
      if (node.id === currentNodeId) continue;
      const dist = getDistance(playerPos.x, playerPos.y, node.x, node.y);
      if (dist <= MAX_DASH_DISTANCE) {
        set.add(node.id);
      }
    }
    return set;
  }, [currentNodeId, isRunning, levelConfig.nodes, playerPos.x, playerPos.y, status]);

  // Reset / Restart entire game from Level 1 with 3 full hearts
  const restartGame = () => {
    const lvl1 = generateForestLevel(1);
    setLevel(1);
    setHearts(MAX_HEARTS);
    setHurtTimer(0);
    setCurrentNodeId('node-start');
    setTargetNodeId(null);
    setPlayerPos(lvl1.startPos);
    setIsRunning(false);
    setTrappedTimer(0);
    setDustPuffs([]);
    setChests(lvl1.chests);
    setEnvProps(lvl1.envProps);
    setInventory({
      lanterns: 1,
      matches: 1,
      maps: 0,
      lanternLit: false,
    });
    setLumberPos(lvl1.lumberStartPos);
    setLumberMode('patrol');
    setBlindedTimer(0);
    patrolTargetRef.current = { x: 660, y: 1180 };
    setStatus('playing');
    setToastMessage(
      'Bana 1! Spring från träd till träd upp mot Trygga Stugan.'
    );
  };

  // Advance to the next level when reaching Safe Cabin
  const advanceToNextLevel = () => {
    const nextLvl = level + 1;
    const nextCfg = generateForestLevel(nextLvl);
    setLevel(nextLvl);
    setHurtTimer(0);
    setCurrentNodeId('node-start');
    setTargetNodeId(null);
    setPlayerPos(nextCfg.startPos);
    setIsRunning(false);
    setTrappedTimer(0);
    setDustPuffs([]);
    setChests(nextCfg.chests);
    setEnvProps(nextCfg.envProps);
    setInventory((prev) => ({
      ...prev,
      lanterns: prev.lanterns + 1,
      matches: prev.matches + 1,
      lanternLit: false,
    }));
    setLumberPos(nextCfg.lumberStartPos);
    setLumberMode('patrol');
    setBlindedTimer(0);
    patrolTargetRef.current = { x: 660, y: nextCfg.lumberStartPos.y - 40 };
    setStatus('playing');
    setToastMessage(
      `Bana ${nextLvl}! Skogen är längre och skogshuggaren rör sig snabbare!`
    );
  };

  // Main 60fps / tick game loop
  useEffect(() => {
    if (status !== 'playing') return;

    const interval = setInterval(() => {
      const dt = 0.05; // 50ms tick

      // Update trap & hurt invulnerability timers
      if (trappedTimer > 0) {
        setTrappedTimer((prev) => Math.max(0, prev - dt));
      }
      if (hurtTimer > 0) {
        setHurtTimer((prev) => Math.max(0, prev - dt));
      }

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
      if (blindedTimer > 0) {
        const nextBlind = Math.max(0, blindedTimer - dt);
        setBlindedTimer(nextBlind);
        if (nextBlind === 0) {
          setLumberMode('patrol');
          setToastMessage('Skogshuggaren ser igen! Akta dig!');
        }
      }

      // 1. Move player if dashing between trees
      let currentPlayerX = playerPos.x;
      let currentPlayerY = playerPos.y;
      let arrivedInCabin = false;

      if (isRunning && targetNodeId) {
        const targetNode = levelConfig.nodes.find((n) => n.id === targetNodeId);
        if (targetNode) {
          const dx = targetNode.x - playerPos.x;
          const dy = targetNode.y - playerPos.y;
          const dist = Math.hypot(dx, dy);
          const speed = trappedTimer > 0 ? 95 : 250; // px per second
          const step = speed * dt;

          if (dist <= step) {
            currentPlayerX = targetNode.x;
            currentPlayerY = targetNode.y;
            setPlayerPos({ x: targetNode.x, y: targetNode.y });
            setIsRunning(false);
            setCurrentNodeId(targetNode.id);
            setTargetNodeId(null);

            if (targetNode.type === 'safe-cabin') {
              arrivedInCabin = true;
              setStatus('level-complete');
              setToastMessage(
                `Du nådde Trygga Stugan och klarade Bana ${level}!`
              );
            } else if (isTreehouseNode(targetNode.type)) {
              setToastMessage(
                `Gömd i ${targetNode.label || 'trädkojan'}! Skogshuggaren kan inte se dig här.`
              );
            }
          } else {
            currentPlayerX = playerPos.x + (dx / dist) * step;
            currentPlayerY = playerPos.y + (dy / dist) * step;
            setPlayerPos({ x: currentPlayerX, y: currentPlayerY });

            const triggeredTrap = envProps.find(
              (prop) =>
                prop.type === 'bear-trap' &&
                !prop.triggered &&
                getDistance(currentPlayerX, currentPlayerY, prop.x, prop.y) < 42
            );
            if (triggeredTrap) {
              setTrappedTimer(1.8);
              setToastMessage(
                'AJ! Du klev i en björnsax! Skogshuggaren hörde dig!'
              );
              setLumberMode('chase');
              setEnvProps((prevProps) =>
                prevProps.map((prop) =>
                  prop.id === triggeredTrap.id
                    ? { ...prop, triggered: true }
                    : prop
                )
              );
            }
          }
        }
      }

      if (arrivedInCabin) {
        return;
      }

      // 2. Update Lumberjack AI
      if (blindedTimer <= 0) {
        const distToPlayer = getDistance(
          lumberPos.x,
          lumberPos.y,
          currentPlayerX,
          currentPlayerY
        );

        // Contact check (cannot be hit while hidden inside a treehouse or during brief hurt cooldown)
        if (!isHidingInTreehouse && hurtTimer <= 0 && distToPlayer < 56) {
          if (hearts <= 1) {
            setHearts(0);
            setStatus('gameover');
            setToastMessage(
              `Skogshuggaren tog ditt sista hjärta på Bana ${level}!`
            );
            return;
          } else {
            const remaining = hearts - 1;
            setHearts(remaining);
            setHurtTimer(2.5);
            setLumberMode('patrol');
            setToastMessage(
              `💔 AJ! Skogshuggaren fick tag i dig! -1 hjärta (${remaining} kvar)`
            );
            // Push the lumberjack back so the player has a chance to dash to safety
            const awayX =
              lumberPos.x < 450
                ? Math.max(120, lumberPos.x - 150)
                : Math.min(780, lumberPos.x + 150);
            const awayY = Math.max(180, lumberPos.y - 160);
            patrolTargetRef.current = { x: 450, y: awayY };
            setLumberPos({ x: awayX, y: awayY });
            return;
          }
        }

        // Detection rules:
        const detectionRange =
          isHidingInTreehouse || hurtTimer > 0
            ? 0
            : (isRunning ? 340 : 205) + levelConfig.detectionBonus;

        let targetX = patrolTargetRef.current.x;
        let targetY = patrolTargetRef.current.y;
        let speed = levelConfig.lumberPatrolSpeed;

        if (distToPlayer <= detectionRange) {
          if (lumberMode !== 'chase') {
            setLumberMode('chase');
            setToastMessage(
              'Skogshuggaren fick syn på dig! Göm dig i en trädkoja eller blända honom!'
            );
          }
          targetX = currentPlayerX;
          targetY = currentPlayerY;
          speed = levelConfig.lumberChaseSpeed;
        } else {
          if (lumberMode === 'chase') {
            setLumberMode('patrol');
          }
          const distToPatrol = getDistance(
            lumberPos.x,
            lumberPos.y,
            targetX,
            targetY
          );
          if (distToPatrol < 30) {
            const bandY = Math.max(
              240,
              Math.min(
                levelConfig.worldHeight - 250,
                currentPlayerY - 160 + (Math.random() - 0.5) * 360
              )
            );
            const bandX = 180 + Math.random() * 540;
            patrolTargetRef.current = { x: bandX, y: bandY };
            targetX = bandX;
            targetY = bandY;
          }
        }

        const dx = targetX - lumberPos.x;
        const dy = targetY - lumberPos.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= 2) {
          setLumberPos({
            x: lumberPos.x + (dx / dist) * speed * dt,
            y: lumberPos.y + (dy / dist) * speed * dt,
          });
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [
    blindedTimer,
    envProps,
    hearts,
    hurtTimer,
    isHidingInTreehouse,
    isRunning,
    level,
    levelConfig,
    lumberMode,
    lumberPos.x,
    lumberPos.y,
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
    const maxScroll = levelConfig.worldHeight * scale - viewportHeight;
    return Math.max(0, Math.min(maxScroll, desiredTop));
  }, [levelConfig.worldHeight, playerPos.y, scale, viewportHeight]);

  // Progress percentage toward Safe Cabin (from startPos.y to y=130)
  const progressPct = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        ((levelConfig.startPos.y - playerPos.y) /
          (levelConfig.startPos.y - 130)) *
          100
      )
    )
  );

  const lumberDistance = Math.round(
    getDistance(playerPos.x, playerPos.y, lumberPos.x, lumberPos.y)
  );

  // ============================================================================
  // FULL-SCREEN SPLASH VIEW: LEVEL COMPLETE ("TRYGGA STUGAN NÅDD!")
  // ============================================================================
  if (status === 'level-complete') {
    return (
      <View style={styles.splashContainer}>
        {/* Atmospheric Dawn-in-the-Forest SVG Backdrop */}
        <Svg
          width={winWidth}
          height={winHeight}
          viewBox="0 0 400 800"
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id="victorySky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#04131D" />
              <Stop offset="45%" stopColor="#082836" />
              <Stop offset="80%" stopColor="#0F3D3E" />
              <Stop offset="100%" stopColor="#05161A" />
            </LinearGradient>
            <RadialGradient id="cabinWarmGlow" cx="50%" cy="42%" r="50%">
              <Stop offset="0%" stopColor="#FDE047" stopOpacity="0.42" />
              <Stop offset="55%" stopColor="#F59E0B" stopOpacity="0.16" />
              <Stop offset="100%" stopColor="#04131D" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Rect x="0" y="0" width="400" height="800" fill="url(#victorySky)" />
          <Circle cx="200" cy="330" r="210" fill="url(#cabinWarmGlow)" />

          {/* Twinkling Night Stars */}
          <Circle cx="55" cy="70" r="1.8" fill="#FEF08A" opacity="0.8" />
          <Circle cx="120" cy="45" r="1.4" fill="#E0F2FE" opacity="0.6" />
          <Circle cx="290" cy="58" r="2" fill="#FEF08A" opacity="0.85" />
          <Circle cx="345" cy="95" r="1.5" fill="#E0F2FE" opacity="0.7" />
          <Circle cx="82" cy="135" r="1.5" fill="#FEF08A" opacity="0.6" />
          <Circle cx="320" cy="150" r="1.8" fill="#FEF08A" opacity="0.75" />

          {/* Distant Pine Silhouettes */}
          <Path
            d="M0 800 L0 610 L28 555 L52 605 L85 535 L120 605 L155 545 L188 605 L220 550 L255 605 L292 535 L330 600 L365 545 L400 605 L400 800 Z"
            fill="#041218"
            opacity="0.9"
          />
        </Svg>

        <View style={[styles.splashContent, { width: viewportWidth }]}>
          {/* Top Victory Badge */}
          <View style={styles.splashTopBadgeSuccess}>
            <Text style={styles.splashTopBadgeSuccessText}>
              🌟 BANA {level} AVKLARAD! 🌟
            </Text>
          </View>

          <Text style={styles.splashHeroTitle}>TRYGGA STUGAN NÅDD!</Text>
          <Text style={styles.splashHeroSubtitle}>
            Du hann fram till värmen innan skogshuggaren fick tag i dig!
          </Text>

          {/* Graphic Showcase Card (Inspiration Art + Safe Cabin + Character + Lit Lantern) */}
          <View style={styles.splashGraphicCard}>
            <View style={styles.splashArtFrame}>
              <Image
                source={childInspirationImg}
                style={styles.splashInspirationImage}
                resizeMode="cover"
              />
              <View style={styles.splashArtTag}>
                <Text style={styles.splashArtTagText}>I säkerhet!</Text>
              </View>
            </View>

            <View style={styles.splashSpritesScene}>
              <View style={styles.splashCabinWrapper}>
                <ForestNodeSprite
                  type="safe-cabin"
                  hasHiddenPlayer={false}
                  size={isCompactScreen ? 105 : 122}
                />
              </View>
              <View style={styles.splashPlayerWrapper}>
                <CharacterSprite
                  character={character}
                  size={isCompactScreen ? 64 : 74}
                  isMoving={false}
                />
              </View>
              <View style={styles.splashLanternWrapper}>
                <ItemSprite item="lantern" lanternMode="lit" size={40} />
              </View>
            </View>
          </View>

          {/* Status & Next Level Preview Card */}
          <View style={styles.splashStatsCard}>
            <View style={styles.splashStatRow}>
              <Text style={styles.splashStatLabel}>Dina hjärtan kvar:</Text>
              <View style={styles.splashHeartsInline}>
                {[1, 2, 3].map((i) => (
                  <Text key={i} style={styles.splashHeartIcon}>
                    {i <= hearts ? '❤️' : '🖤'}
                  </Text>
                ))}
              </View>
            </View>

            <View style={styles.splashDivider} />

            <View style={styles.splashStatRow}>
              <Text style={styles.splashStatLabel}>Stugbonus inför nästa natt:</Text>
              <Text style={styles.splashBonusText}>+1 🏮 Lykta  +1 🔥 Stickor</Text>
            </View>

            <View style={styles.splashDivider} />

            <Text style={styles.splashNextLevelInfo}>
              På <Text style={styles.modalHighlight}>Bana {level + 1}</Text> är
              skogen djupare, skogshuggaren snabbare och fler björnsaxar lurar i
              mörkret!
            </Text>
          </View>

          {/* BIG PROMINENT CTA BUTTON TO NEXT LEVEL */}
          <Pressable
            style={({ pressed }) => [
              styles.splashBigNextBtn,
              pressed && styles.splashBigBtnPressed,
            ]}
            onPress={advanceToNextLevel}
          >
            <Text style={styles.splashBigNextBtnPre}>REDO FÖR NÄSTA NATT?</Text>
            <Text style={styles.splashBigNextBtnTitle}>
              GÅ VIDARE TILL BANA {level + 1} →
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ============================================================================
  // FULL-SCREEN SPLASH VIEW: GAME OVER ("SKOGSHUGGAREN FICK DIG")
  // ============================================================================
  if (status === 'gameover') {
    return (
      <View style={styles.splashContainer}>
        {/* Dark Crimson Night Forest SVG Backdrop */}
        <Svg
          width={winWidth}
          height={winHeight}
          viewBox="0 0 400 800"
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id="gameOverSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#140408" />
              <Stop offset="50%" stopColor="#2A0810" />
              <Stop offset="100%" stopColor="#090306" />
            </LinearGradient>
            <RadialGradient id="dangerGlow" cx="50%" cy="38%" r="50%">
              <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.35" />
              <Stop offset="60%" stopColor="#7F1D1D" stopOpacity="0.14" />
              <Stop offset="100%" stopColor="#090306" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Rect x="0" y="0" width="400" height="800" fill="url(#gameOverSky)" />
          <Circle cx="200" cy="310" r="210" fill="url(#dangerGlow)" />

          {/* Dark Pine Silhouettes */}
          <Path
            d="M0 800 L0 610 L28 555 L52 605 L85 535 L120 605 L155 545 L188 605 L220 550 L255 605 L292 535 L330 600 L365 545 L400 605 L400 800 Z"
            fill="#070204"
            opacity="0.95"
          />
        </Svg>

        <View style={[styles.splashContent, { width: viewportWidth }]}>
          <View style={styles.splashTopBadgeDanger}>
            <Text style={styles.splashTopBadgeDangerText}>
              🖤 🖤 🖤 ALLA HJÄRTAN FÖRLORADE
            </Text>
          </View>

          <Text style={styles.splashGameOverTitle}>GAME OVER</Text>
          <Text style={styles.splashHeroSubtitle}>
            Skogshuggaren kom ikapp dig i den mörka skogen!
          </Text>

          {/* Graphic Showcase Card with Lumberjack Artwork & Sprite */}
          <View style={[styles.splashGraphicCard, styles.splashGraphicCardDanger]}>
            <View style={[styles.splashArtFrame, styles.splashArtFrameDanger]}>
              <Image
                source={lumberjackInspirationImg}
                style={styles.splashInspirationImage}
                resizeMode="cover"
              />
              <View style={[styles.splashArtTag, styles.splashArtTagDanger]}>
                <Text style={styles.splashArtTagDangerText}>Skogshuggaren</Text>
              </View>
            </View>

            <View style={styles.splashSpritesScene}>
              <LumberjackSprite
                blinded={false}
                mode="chase"
                isMoving={false}
                size={isCompactScreen ? 92 : 108}
              />
            </View>
          </View>

          {/* Reached Level Milestone Box */}
          <View style={styles.reachedLevelBox}>
            <Text style={styles.reachedLevelLabel}>DU KOM TILL</Text>
            <Text style={styles.reachedLevelNumber}>BANA {level}</Text>
            <Text style={styles.reachedLevelHint}>
              Tips: Göm dig i trädkojor eller blända skogshuggaren med tända
              lyktor för att skydda dina 3 hjärtan!
            </Text>
          </View>

          {/* BIG PROMINENT RETRY BUTTON */}
          <Pressable
            style={({ pressed }) => [
              styles.splashBigRetryBtn,
              pressed && styles.splashBigBtnPressed,
            ]}
            onPress={restartGame}
          >
            <Text style={styles.splashBigRetryBtnPre}>GE INTE UPP!</Text>
            <Text style={styles.splashBigRetryBtnTitle}>
              SPELA IGEN FRÅN BANA 1 ↻
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* TOP HUD: Level Badge, 3 Hearts, Progress & Character Switch */}
      <View style={[styles.topHud, { width: viewportWidth }]}>
        <View style={styles.topRow}>
          <View style={styles.titleAndLevelRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>BANA {level}</Text>
            </View>
            <View style={styles.heartsRow}>
              {[1, 2, 3].map((heartIdx) => (
                <Text
                  key={heartIdx}
                  style={[
                    styles.heartIcon,
                    heartIdx > hearts && styles.heartIconLost,
                  ]}
                >
                  {heartIdx <= hearts ? '❤️' : '🖤'}
                </Text>
              ))}
            </View>
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
            height: levelConfig.worldHeight * scale,
            transform: [{ translateY: -cameraY }],
          }}
        >
          {/* SVG Night Forest Ground Paths, Reachable Lines & Fog-of-War Lighting */}
          <Svg
            width={WORLD_WIDTH * scale}
            height={levelConfig.worldHeight * scale}
            viewBox={`0 0 ${WORLD_WIDTH} ${levelConfig.worldHeight}`}
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
              height={levelConfig.worldHeight}
              fill="#0B151C"
            />

            {/* Winding Dirt Trail Hints in the Forest */}
            {levelConfig.trailPoints.map((pt, idx) => {
              if (idx === 0) return null;
              const prev = levelConfig.trailPoints[idx - 1];
              return (
                <Line
                  key={`trail-${idx}`}
                  x1={prev.x}
                  y1={prev.y}
                  x2={pt.x}
                  y2={pt.y}
                  stroke="#152530"
                  strokeWidth="26"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Dashed Connection Lines to Reachable Trees */}
            {levelConfig.nodes.map((node) => {
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
          {levelConfig.nodes.map((node) => {
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
                opacity: hurtTimer > 0 ? 0.55 : 1,
              }}
            >
              {flashBurstActive && (
                <View style={styles.flashOverlayCircle} />
              )}
              {hurtTimer > 0 && (
                <View style={styles.hurtBadge}>
                  <Text style={styles.hurtBadgeText}>-1 ❤️</Text>
                </View>
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
  // ==========================================================================
  // FULL-SCREEN SPLASH STYLES (LEVEL COMPLETE & GAME OVER)
  // ==========================================================================
  splashContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#04131D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  splashContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  splashTopBadgeSuccess: {
    backgroundColor: 'rgba(6, 95, 70, 0.92)',
    borderColor: '#34D399',
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  splashTopBadgeSuccessText: {
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  splashTopBadgeDanger: {
    backgroundColor: 'rgba(69, 10, 10, 0.92)',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  splashTopBadgeDangerText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  splashHeroTitle: {
    color: '#FEF08A',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 2,
  },
  splashGameOverTitle: {
    color: '#EF4444',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 2,
  },
  splashHeroSubtitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  splashGraphicCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(15, 26, 36, 0.88)',
    borderColor: '#FBBF24',
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 10,
  },
  splashGraphicCardDanger: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(28, 10, 14, 0.9)',
  },
  splashArtFrame: {
    width: 118,
    height: 142,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#34D399',
    overflow: 'hidden',
    backgroundColor: '#09131C',
    position: 'relative',
  },
  splashArtFrameDanger: {
    borderColor: '#EF4444',
  },
  splashInspirationImage: {
    width: '100%',
    height: '100%',
  },
  splashArtTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(6, 95, 70, 0.92)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  splashArtTagDanger: {
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
  },
  splashArtTagText: {
    color: '#ECFDF5',
    fontSize: 10,
    fontWeight: '800',
  },
  splashArtTagDangerText: {
    color: '#FEE2E2',
    fontSize: 10,
    fontWeight: '800',
  },
  splashSpritesScene: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 130,
    position: 'relative',
  },
  splashCabinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashPlayerWrapper: {
    marginLeft: -18,
    marginBottom: 4,
  },
  splashLanternWrapper: {
    marginLeft: -6,
    marginBottom: 14,
  },
  splashStatsCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 26, 36, 0.92)',
    borderColor: '#1E3A4C',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 7,
  },
  splashStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splashStatLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  splashHeartsInline: {
    flexDirection: 'row',
    gap: 5,
  },
  splashHeartIcon: {
    fontSize: 16,
  },
  splashBonusText: {
    color: '#FDE047',
    fontSize: 12,
    fontWeight: '800',
  },
  splashDivider: {
    height: 1,
    backgroundColor: '#1E293B',
  },
  splashNextLevelInfo: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
  },
  splashBigNextBtn: {
    width: '100%',
    backgroundColor: '#22C55E',
    borderColor: '#86EFAC',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  splashBigNextBtnPre: {
    color: '#052E16',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  splashBigNextBtnTitle: {
    color: '#022C22',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  splashBigRetryBtn: {
    width: '100%',
    backgroundColor: '#F59E0B',
    borderColor: '#FDE047',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  splashBigRetryBtnPre: {
    color: '#451A03',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  splashBigRetryBtnTitle: {
    color: '#1C1917',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  splashBigBtnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  reachedLevelBox: {
    backgroundColor: 'rgba(22, 36, 50, 0.92)',
    borderColor: '#38BDF8',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  reachedLevelLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  reachedLevelNumber: {
    color: '#FDE047',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  reachedLevelHint: {
    color: '#CBD5E1',
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalHighlight: {
    color: '#FDE047',
    fontWeight: '800',
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
  titleAndLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    backgroundColor: '#1E3A8A',
    borderColor: '#38BDF8',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  levelBadgeText: {
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  heartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#162432',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#273E52',
  },
  heartIcon: {
    fontSize: 13,
  },
  heartIconLost: {
    opacity: 0.45,
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
  hurtBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 2,
  },
  hurtBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
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
