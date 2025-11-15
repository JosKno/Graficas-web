// ============================================
// MAIN MULTIPLAYER - ORQUESTADOR DEL JUEGO
// ============================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { getLevelConfig } from '../config.js';
import mpGameState from './multiplayerGameState.js';
import { getMultiplayerSync } from './multiplayerSync.js';
import { loadRunnerMultiplayer } from './multiplayerSceneSetup.js';
import { updateAllMultiplayer } from './multiplayerUpdater.js';
import { showCountdown } from '../countdown.js';

let animationFrameId = null;
const multiplayerSync = getMultiplayerSync();
const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

// Variable global para saber si el jugador local es el creador
let isLocalCreator = false;

// NOTA: NO importamos spawner.js porque usa gameState single player
// En su lugar, crearemos los objetos directamente aquí

// ============================================
// OBTENER DATOS DE LA SALA DESDE URL
// ============================================
function getRoomDataFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('roomId');
  const level = parseInt(urlParams.get('level')) || 1;
  
  console.log('📋 Parámetros de URL:', {
    roomId,
    level,
    fullURL: window.location.href
  });
  
  if (!roomId) {
    console.error('❌ No se encontró roomId en la URL');
    alert('No se especificó una sala. Redirigiendo al lobby...');
    window.location.href = 'lobby.html';
    return null;
  }
  
  return { roomId, level };
}

// ============================================
// INICIALIZAR JUEGO MULTIPLAYER
// ============================================
async function init() {
  const container = document.getElementById("game-container-renderer");

  if (!container) {
    console.error('No se encontró el contenedor del juego');
    return;
  }

  // Obtener datos de la sala
  const roomData = getRoomDataFromURL();
  if (!roomData) return;

  const { roomId, level } = roomData;

  // Esperar a que Firebase esté listo
  await waitForFirebase();

  // Obtener usuario actual
  const currentUser = window.currentUser;
  if (!currentUser) {
    alert('No hay usuario autenticado');
    window.location.href = 'login.html?mode=multiplayer';
    return;
  }

  // Obtener información de la sala desde Firebase
  let roomInfo = await getRoomInfo(roomId);
  if (!roomInfo) {
    alert('Sala no encontrada');
    window.location.href = 'lobby.html';
    return;
  }

  console.log('📊 Estado de la sala:', roomInfo.status);

  // Si la sala aún está en "waiting", esperar a que cambie a "playing"
  if (roomInfo.status === 'waiting') {
    console.log('⏳ Sala en estado "waiting", esperando a que inicie...');
    
    // Esperar máximo 10 segundos a que la sala cambie a "playing"
    roomInfo = await waitForRoomToStart(roomId, 10000);
    
    if (!roomInfo) {
      alert('La sala no se pudo iniciar. Volviendo al lobby...');
      window.location.href = 'lobby.html';
      return;
    }
  }

  // Validar que la sala tenga jugadores
  if (!roomInfo.players || typeof roomInfo.players !== 'object') {
    console.error('❌ Sala sin jugadores:', roomInfo);
    alert('Error: La sala no tiene jugadores configurados');
    window.location.href = 'lobby.html';
    return;
  }

  // Validar que haya exactamente 2 jugadores
  const playerCount = Object.keys(roomInfo.players).length;
  if (playerCount !== 2) {
    console.error('❌ La sala debe tener exactamente 2 jugadores. Tiene:', playerCount);
    alert(`Error: La sala tiene ${playerCount} jugador(es). Se necesitan 2 jugadores.`);
    window.location.href = 'lobby.html';
    return;
  }

  // Determinar jugadores
  const players = Object.keys(roomInfo.players);
  
  console.log('👥 Jugadores en la sala:', players);
  console.log('🔑 Tu UID:', currentUser.uid);
  
  const localPlayerId = currentUser.uid;
  const remotePlayerId = players.find(p => p !== localPlayerId);

  if (!remotePlayerId) {
    console.error('❌ No hay segundo jugador. Jugadores:', players);
    alert('No hay un segundo jugador en la sala. Esperando...');
    // En lugar de redirigir, podríamos esperar, pero por ahora redirigimos
    window.location.href = 'lobby.html';
    return;
  }

  console.log('✅ Jugadores identificados:', {
    local: localPlayerId,
    remote: remotePlayerId
  });

  // Obtener color del jugador basado en si es creador o no
  const isCreator = roomInfo.createdBy === localPlayerId;
  const playerColor = isCreator ? 'blue' : 'red';
  
  // Guardar globalmente para usar en actualización de HUD
  isLocalCreator = isCreator;
  
  console.log('🎨 Color asignado:', {
    isCreator,
    color: playerColor,
    createdBy: roomInfo.createdBy,
    localPlayerId
  });

  // Configurar estado del juego
  const levelConfig = getLevelConfig(level);
  mpGameState.setLevelConfig(levelConfig);
  mpGameState.setRoomData(roomId, localPlayerId, remotePlayerId, playerColor);

  // Inicializar sincronización
  multiplayerSync.initialize(window.firebaseDB, roomId, localPlayerId, remotePlayerId);

  // Crear reloj
  mpGameState.clock = new THREE.Clock();

  // Configurar escena
  createSceneForMultiplayer();
  createCameraForMultiplayer(container);
  createRendererForMultiplayer(container);
  createLightsForMultiplayer();

  // Crear terreno
  createGroundSegmentsForMultiplayer();
  createGrassAreasForMultiplayer();
  createLaneLinesForMultiplayer();
  createTreesForMultiplayer();

  // Configurar controles
  setupMultiplayerControls();
  setupPauseButton();

  // Actualizar nombres en HUD
  updatePlayerNames(roomInfo, localPlayerId, remotePlayerId);

  // Cargar modelos de runners
  await loadBothRunners(playerColor);

  // Iniciar sincronización
  startSynchronization();

  // Mostrar cuenta regresiva
  setTimeout(() => {
    showCountdown(() => {
      mpGameState.isGameStarted = true;
      console.log('¡Juego multiplayer iniciado!');
    });
  }, 500);

  // Evento resize
  window.addEventListener("resize", () => {
    if (!mpGameState.camera || !mpGameState.renderer) return;
    mpGameState.camera.aspect = container.clientWidth / container.clientHeight;
    mpGameState.camera.updateProjectionMatrix();
    mpGameState.renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // Iniciar loop de animación
  animate();
}

// ============================================
// CREAR ESCENA PARA MULTIPLAYER
// ============================================
function createSceneForMultiplayer() {
  mpGameState.scene = new THREE.Scene();
  
  // Aplicar fog y fondo según nivel
  const levelConfig = mpGameState.levelConfig;
  mpGameState.scene.fog = new THREE.Fog(
    levelConfig.fog.color,
    levelConfig.fog.near,
    levelConfig.fog.far
  );

  // Cargar skybox
  const loader = new THREE.TextureLoader();
  loader.load(levelConfig.background, (texture) => {
    mpGameState.scene.background = texture;
  });
}

// ============================================
// ESPERAR A QUE FIREBASE ESTÉ LISTO
// ============================================
function waitForFirebase() {
  return new Promise((resolve) => {
    console.log('⏳ Esperando inicialización de Firebase...');
    
    let attempts = 0;
    const maxAttempts = 50; // 5 segundos máximo
    
    const checkFirebase = setInterval(() => {
      attempts++;
      
      if (window.firebaseDB && window.currentUser) {
        clearInterval(checkFirebase);
        console.log('✅ Firebase listo:', {
          database: !!window.firebaseDB,
          user: window.currentUser.email
        });
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkFirebase);
        console.error('❌ Timeout esperando Firebase');
        alert('Error: Firebase no se inicializó correctamente');
        window.location.href = 'lobby.html';
      } else {
        console.log(`⏳ Intento ${attempts}/${maxAttempts} - DB: ${!!window.firebaseDB}, User: ${!!window.currentUser}`);
      }
    }, 100);
  });
}

// ============================================
// ESPERAR A QUE LA SALA INICIE
// ============================================
async function waitForRoomToStart(roomId, timeout = 10000) {
  const { ref, onValue, off } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
  
  return new Promise((resolve) => {
    const roomRef = ref(window.firebaseDB, `rooms/${roomId}`);
    let timeoutId;
    let unsubscribe;
    
    // Función de limpieza
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    };
    
    // Timeout
    timeoutId = setTimeout(() => {
      cleanup();
      console.error('⏱️ Timeout esperando que la sala inicie');
      resolve(null);
    }, timeout);
    
    // Escuchar cambios en tiempo real
    unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const room = snapshot.val();
        console.log('📊 Estado actual de sala:', room.status);
        
        if (room.status === 'playing') {
          console.log('✅ Sala lista para jugar!');
          cleanup();
          resolve(room);
        }
      } else {
        console.error('❌ Sala eliminada mientras esperábamos');
        cleanup();
        resolve(null);
      }
    });
  });
}

// ============================================
// OBTENER INFORMACIÓN DE LA SALA
// ============================================
async function getRoomInfo(roomId) {
  try {
    const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
    
    console.log('🔍 Buscando sala:', roomId);
    
    const roomRef = ref(window.firebaseDB, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('✅ Sala encontrada:', data);
      return data;
    } else {
      console.error('❌ Sala no existe en Firebase');
      return null;
    }
  } catch (error) {
    console.error('❌ Error obteniendo información de la sala:', error);
    return null;
  }
}

// ============================================
// ACTUALIZAR NOMBRES EN HUD
// ============================================
function updatePlayerNames(roomInfo, localPlayerId, remotePlayerId) {
  // Validar que los jugadores existan en roomInfo
  const localPlayerData = roomInfo.players?.[localPlayerId];
  const remotePlayerData = roomInfo.players?.[remotePlayerId];
  
  if (!localPlayerData) {
    console.warn('⚠️ Jugador local no encontrado en sala. Usando nombre por defecto.');
  }
  
  if (!remotePlayerData) {
    console.warn('⚠️ Jugador remoto no encontrado en sala. Usando nombre por defecto.');
  }
  
  const localName = localPlayerData?.name || 'TÚ';
  const remoteName = remotePlayerData?.name || 'OPONENTE';
  
  // Determinar quién es el creador
  const isLocalCreator = roomInfo.createdBy === localPlayerId;
  
  // HUD: Creador SIEMPRE a la izquierda (azul), quien se une SIEMPRE a la derecha (rojo)
  if (isLocalCreator) {
    // Yo soy el creador (azul) → izquierda
    document.getElementById('local-player-name').textContent = localName.toUpperCase();
    document.getElementById('remote-player-name').textContent = remoteName.toUpperCase();
  } else {
    // Yo me uní (rojo) → derecha
    // Intercambiar posiciones en el HUD
    document.getElementById('local-player-name').textContent = remoteName.toUpperCase();
    document.getElementById('remote-player-name').textContent = localName.toUpperCase();
  }
  
  console.log('📝 Nombres actualizados en HUD:', {
    isLocalCreator,
    izquierda: isLocalCreator ? localName : remoteName,
    derecha: isLocalCreator ? remoteName : localName
  });
}

// ============================================
// CARGAR AMBOS RUNNERS
// ============================================
async function loadBothRunners(localPlayerColor) {
  return new Promise((resolve) => {
    let loadedCount = 0;
    
    const onLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        resolve();
      }
    };
    
    // Cargar runner local
    loadRunnerMultiplayer('local', localPlayerColor, () => {
      console.log('✅ Runner local cargado');
      onLoaded();
    });
    
    // Cargar runner remoto
    const remoteColor = localPlayerColor === 'blue' ? 'red' : 'blue';
    loadRunnerMultiplayer('remote', remoteColor, () => {
      console.log('✅ Runner remoto cargado');
      onLoaded();
    });
  });
}

// ============================================
// CONFIGURAR CONTROLES MULTIPLAYER
// ============================================
function setupMultiplayerControls() {
  // Teclas
  const keys = {};
  
  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    
    if (!mpGameState.isGameStarted || mpGameState.isPaused) return;
    
    if ((e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") && !keys.jumpProcessed) {
      mpGameState.startJump('local');
      keys.jumpProcessed = true;
    }
    
    if ((e.key === "ArrowLeft" || e.key === "a" || e.key === "A") && !keys.leftProcessed) {
      mpGameState.changeLane('left', 'local');
      keys.leftProcessed = true;
    }
    
    if ((e.key === "ArrowRight" || e.key === "d" || e.key === "D") && !keys.rightProcessed) {
      mpGameState.changeLane('right', 'local');
      keys.rightProcessed = true;
    }
  });
  
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") {
      keys.jumpProcessed = false;
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      keys.leftProcessed = false;
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      keys.rightProcessed = false;
    }
  });
  
  // Touch/Mouse para móvil (opcional)
  let touchStartX = 0;
  
  window.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  });
  
  window.addEventListener("touchend", (e) => {
    if (!mpGameState.isGameStarted || mpGameState.isPaused) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        mpGameState.changeLane('right', 'local');
      } else {
        mpGameState.changeLane('left', 'local');
      }
    } else {
      mpGameState.startJump('local');
    }
  });
}

// ============================================
// CONFIGURAR BOTÓN DE PAUSA
// ============================================
function setupPauseButton() {
  const pauseButton = document.getElementById('pause-button');
  const pauseMenu = document.getElementById('pause-menu');
  const resumeButton = document.getElementById('resume-button');
  
  pauseButton.addEventListener('click', () => {
    mpGameState.isPaused = true;
    pauseMenu.style.display = 'flex';
  });
  
  resumeButton.addEventListener('click', () => {
    mpGameState.isPaused = false;
    pauseMenu.style.display = 'none';
  });
}

// ============================================
// INICIAR SINCRONIZACIÓN
// ============================================
function startSynchronization() {
  // Escuchar actualizaciones del jugador remoto
  multiplayerSync.listenToRemotePlayer((remoteData) => {
    updateRemotePlayerFromData(remoteData);
  });
  
  // Escuchar estado de la sala (ganadores, etc.)
  multiplayerSync.listenToRoomStatus((roomData) => {
    if (roomData.status === 'finished' && roomData.winner && !mpGameState.isGameOver) {
      handleGameOver(roomData.winner);
    }
    
    // Detectar si el oponente salió
    if (roomData.players) {
      const playerCount = Object.keys(roomData.players).length;
      if (playerCount < 2 && !mpGameState.isGameOver) {
        console.log('💨 El oponente abandonó la partida');
        
        // Si el jugador local aún está vivo, declarar victoria
        if (mpGameState.players.local.isAlive) {
          multiplayerSync.declareWinner(mpGameState.localPlayerId);
        }
      }
    }
  });
}

// ============================================
// ACTUALIZAR JUGADOR REMOTO DESDE FIREBASE
// ============================================
function updateRemotePlayerFromData(data) {
  const remote = mpGameState.players.remote;
  
  // Actualizar posición con interpolación suave
  if (data.position && remote.runner) {
    // Interpolación para movimiento suave
    const lerpFactor = 0.3; // Factor de suavizado (0-1, más alto = más rápido)
    
    remote.runner.position.x += (data.position.x - remote.runner.position.x) * lerpFactor;
    remote.runner.position.y += (data.position.y - remote.runner.position.y) * lerpFactor;
    remote.runner.position.z += (data.position.z - remote.runner.position.z) * lerpFactor;
  }
  
  // Actualizar carril (esto ayuda con el movimiento lateral)
  if (data.lane !== undefined) {
    remote.currentLane = data.lane;
    remote.targetLaneX = [-3, 0, 3][data.lane]; // GAME_CONFIG.lanes
  }
  
  // Actualizar estado de salto
  if (data.isJumping !== undefined) {
    remote.isJumping = data.isJumping;
  }
  
  // Actualizar puntuación en HUD según posición
  if (data.score !== undefined) {
    remote.score = data.score;
    updateHUDScores(); // Usar función centralizada
  }
  
  if (data.fragments !== undefined) {
    remote.fragments = data.fragments;
    updateHUDScores(); // Usar función centralizada
  }
  
  // Actualizar estado de vida
  if (data.isAlive !== undefined && data.isAlive !== remote.isAlive) {
    remote.isAlive = data.isAlive;
    updatePlayerStatusUI('remote', data.isAlive);
    
    if (!data.isAlive) {
      // El jugador remoto murió
      console.log('💀 Jugador remoto ha muerto');
    }
  }
}

// ============================================
// ACTUALIZAR UI DE ESTADO DEL JUGADOR
// ============================================
function updatePlayerStatusUI(player, isAlive) {
  const statusEl = document.getElementById(`${player}-status`);
  
  if (isAlive) {
    statusEl.className = 'player-status alive';
    statusEl.textContent = '✓ VIVO';
  } else {
    statusEl.className = 'player-status dead';
    statusEl.textContent = '✗ MUERTO';
  }
}

// ============================================
// MANEJAR GAME OVER
// ============================================
export function handleGameOver(winnerId) {
  mpGameState.isGameOver = true;
  mpGameState.isPaused = true;
  
  const isLocalWinner = winnerId === mpGameState.localPlayerId;
  const isDraw = winnerId === 'draw';
  
  // Obtener nombres de jugadores
  const localName = document.getElementById('local-player-name').textContent;
  const remoteName = document.getElementById('remote-player-name').textContent;
  
  // Mostrar overlay
  const overlay = document.getElementById('gameover-overlay');
  const content = document.getElementById('gameover-content');
  const title = document.getElementById('gameover-title');
  const message = document.getElementById('gameover-message');
  
  // Configurar mensaje
  if (isDraw) {
    content.className = 'gameover-content draw';
    title.textContent = '¡EMPATE!';
    message.textContent = 'Ambos jugadores tuvieron el mismo desempeño';
  } else if (isLocalWinner) {
    content.className = 'gameover-content winner';
    title.textContent = '¡VICTORIA!';
    message.textContent = `${localName} ha ganado la partida`;
  } else {
    content.className = 'gameover-content loser';
    title.textContent = 'DERROTA';
    message.textContent = `${remoteName} ha ganado la partida`;
  }
  
  // Mostrar puntuaciones finales
  document.getElementById('final-local-score').textContent = mpGameState.players.local.score;
  document.getElementById('final-local-fragments').textContent = mpGameState.players.local.fragments;
  document.getElementById('final-remote-score').textContent = mpGameState.players.remote.score;
  document.getElementById('final-remote-fragments').textContent = mpGameState.players.remote.fragments;
  
  overlay.style.display = 'flex';
  
  console.log('🏁 Game Over mostrado:', {
    winner: isLocalWinner ? 'local' : 'remote',
    localScore: mpGameState.players.local.score,
    remoteScore: mpGameState.players.remote.score
  });
}

// ============================================
// LOOP DE ANIMACIÓN
// ============================================
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  
  if (mpGameState.isPaused || !mpGameState.isGameStarted) {
    return;
  }

  const delta = mpGameState.clock.getDelta();
  
  // Actualizar animaciones de ambos runners
  if (mpGameState.players.local.mixer) {
    mpGameState.players.local.mixer.update(delta);
  }
  if (mpGameState.players.remote.mixer) {
    mpGameState.players.remote.mixer.update(delta);
  }

  // Actualizar todos los objetos del juego
  updateAllMultiplayer(delta);

  // Generar nuevos objetos (solo si jugador local está vivo)
  if (mpGameState.players.local.isAlive) {
    spawnObjectsMultiplayer();
  }
  
  // Actualizar puntuación por distancia (solo jugador local)
  updateScoreByDistance();
  
  // Sincronizar posición del jugador local
  const localRunner = mpGameState.players.local.runner;
  if (localRunner && mpGameState.players.local.isAlive) {
    multiplayerSync.updateLocalPosition(
      localRunner.position.x,
      localRunner.position.y,
      localRunner.position.z,
      mpGameState.players.local.currentLane,
      mpGameState.players.local.isJumping
    );
  }
  
  // Renderizar escena
  if (mpGameState.renderer && mpGameState.scene && mpGameState.camera) {
    mpGameState.renderer.render(mpGameState.scene, mpGameState.camera);
  }
}

// ============================================
// INICIAR CUANDO EL DOM ESTÉ LISTO
// ============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================
// LIMPIAR AL SALIR
// ============================================
window.addEventListener('beforeunload', () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  multiplayerSync.cleanup();
});

// ============================================
// FUNCIONES AUXILIARES DE SCENE SETUP
// ============================================

// Variables para puntuación por distancia
let lastScoreUpdate = Date.now();
const SCORE_UPDATE_INTERVAL = 100; // cada 100ms = 1 punto

function updateScoreByDistance() {
  const now = Date.now();
  if (now - lastScoreUpdate >= SCORE_UPDATE_INTERVAL) {
    if (mpGameState.players.local.isAlive) {
      mpGameState.addScore(1, 'local');
      
      // Actualizar HUD según quién es el creador
      updateHUDScores();
      
      // Sincronizar score cada 10 puntos para no sobrecargar Firebase
      if (mpGameState.players.local.score % 10 === 0) {
        multiplayerSync.updateLocalScore(
          mpGameState.players.local.score,
          mpGameState.players.local.fragments
        );
      }
    }
    lastScoreUpdate = now;
  }
}

// Función para actualizar HUD según posición
function updateHUDScores() {
  if (isLocalCreator) {
    // Soy creador (azul, izquierda) → mis puntos van a la izquierda
    document.getElementById('local-score').textContent = mpGameState.players.local.score;
    document.getElementById('local-fragments').textContent = mpGameState.players.local.fragments;
    document.getElementById('remote-score').textContent = mpGameState.players.remote.score;
    document.getElementById('remote-fragments').textContent = mpGameState.players.remote.fragments;
  } else {
    // Me uní (rojo, derecha) → mis puntos van a la DERECHA
    document.getElementById('remote-score').textContent = mpGameState.players.local.score;
    document.getElementById('remote-fragments').textContent = mpGameState.players.local.fragments;
    document.getElementById('local-score').textContent = mpGameState.players.remote.score;
    document.getElementById('local-fragments').textContent = mpGameState.players.remote.fragments;
  }
}

// Función auxiliar para agregar emissive a modelos
function addEmissiveToModel(model, color, intensity) {
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.emissive = new THREE.Color(color);
      child.material.emissiveIntensity = intensity;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// Sistema de spawn para multiplayer
function spawnObjectsMultiplayer() {
  if (!mpGameState.isGameStarted || !mpGameState.levelConfig || mpGameState.isGameOver) return;
  
  const GAME_CONFIG = {
    lanes: [-3, 0, 3],
    spawnDistance: -80
  };
  
  const spawnRates = mpGameState.levelConfig.spawnRates;
  
  // Spawn obstáculos
  if (Math.random() < spawnRates.obstacle) {
    spawnObstacleMP();
  }

  // Spawn monedas
  if (Math.random() < spawnRates.coin) {
    spawnCoinMP();
  }

  // Spawn powerups buenos
  if (Math.random() < spawnRates.powerupGood) {
    spawnPowerupGoodMP();
  }

  // Spawn powerups malos
  if (Math.random() < spawnRates.powerupBad) {
    spawnPowerupBadMP();
  }
  
  // Spawn bombas
  if (Math.random() < spawnRates.bomb) {
    spawnBombMP();
  }
}

function spawnObstacleMP() {
  const levelConfig = mpGameState.levelConfig;
  const GAME_CONFIG = { lanes: [-3, 0, 3], spawnDistance: -80 };
  
  loader.load(
    levelConfig.obstacle.path,
    (model) => {
      const obstacle = model.scene;
      obstacle.scale.set(
        levelConfig.obstacle.scale.x,
        levelConfig.obstacle.scale.y,
        levelConfig.obstacle.scale.z
      );
      
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      obstacle.position.set(randomLane, levelConfig.obstacle.yOffset, GAME_CONFIG.spawnDistance);
      
      obstacle.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      if (levelConfig.obstacle.emissiveColor) {
        addEmissiveToModel(obstacle, levelConfig.obstacle.emissiveColor, levelConfig.obstacle.emissiveIntensity);
      }
      
      mpGameState.scene.add(obstacle);
      mpGameState.obstacles.push({ mesh: obstacle, type: 'obstacle', lane: randomLane });
    },
    undefined,
    (error) => {
      const tempGeometry = new THREE.BoxGeometry(1.5, 2, 1.5);
      const tempMaterial = new THREE.MeshStandardMaterial({ color: "#ff4757" });
      const tempObstacle = new THREE.Mesh(tempGeometry, tempMaterial);
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      tempObstacle.position.set(randomLane, 1, GAME_CONFIG.spawnDistance);
      tempObstacle.castShadow = true;
      mpGameState.scene.add(tempObstacle);
      mpGameState.obstacles.push({ mesh: tempObstacle, type: 'obstacle', lane: randomLane });
    }
  );
}

function spawnCoinMP() {
  const levelConfig = mpGameState.levelConfig;
  const GAME_CONFIG = { lanes: [-3, 0, 3], spawnDistance: -80 };
  
  loader.load(
    levelConfig.coin.path,
    (model) => {
      const coin = model.scene;
      coin.scale.set(levelConfig.coin.scale.x, levelConfig.coin.scale.y, levelConfig.coin.scale.z);
      
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      coin.position.set(randomLane, levelConfig.coin.yOffset, GAME_CONFIG.spawnDistance);
      
      addEmissiveToModel(coin, levelConfig.coin.emissiveColor, levelConfig.coin.emissiveIntensity);
      
      mpGameState.scene.add(coin);
      mpGameState.coins.push({ 
        mesh: coin, 
        type: 'coin', 
        lane: randomLane, 
        rotation: 0,
        shouldRotate: levelConfig.coin.rotate 
      });
    },
    undefined,
    (error) => {
      const tempGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16);
      const tempMaterial = new THREE.MeshStandardMaterial({ 
        color: "#ffd700",
        metalness: 0.8,
        emissive: 0xffd700,
        emissiveIntensity: 1.5
      });
      const tempCoin = new THREE.Mesh(tempGeometry, tempMaterial);
      tempCoin.rotation.x = Math.PI / 2;
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      tempCoin.position.set(randomLane, 1, GAME_CONFIG.spawnDistance);
      tempCoin.castShadow = true;
      mpGameState.scene.add(tempCoin);
      mpGameState.coins.push({ 
        mesh: tempCoin, 
        type: 'coin', 
        lane: randomLane, 
        rotation: 0,
        shouldRotate: true 
      });
    }
  );
}

function spawnPowerupGoodMP() {
  const levelConfig = mpGameState.levelConfig;
  const GAME_CONFIG = { lanes: [-3, 0, 3], spawnDistance: -80 };
  
  loader.load(
    levelConfig.powerupGood.path,
    (model) => {
      const powerup = model.scene;
      powerup.scale.set(levelConfig.powerupGood.scale.x, levelConfig.powerupGood.scale.y, levelConfig.powerupGood.scale.z);
      
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      powerup.position.set(randomLane, levelConfig.powerupGood.yOffset, GAME_CONFIG.spawnDistance);
      
      addEmissiveToModel(powerup, levelConfig.powerupGood.emissiveColor, levelConfig.powerupGood.emissiveIntensity);
      
      mpGameState.scene.add(powerup);
      mpGameState.powerupsGood.push({ 
        mesh: powerup, 
        type: 'powerupGood', 
        lane: randomLane, 
        rotation: 0,
        shouldFloat: levelConfig.powerupGood.float,
        baseY: levelConfig.powerupGood.yOffset
      });
    }
  );
}

function spawnPowerupBadMP() {
  const levelConfig = mpGameState.levelConfig;
  const GAME_CONFIG = { lanes: [-3, 0, 3], spawnDistance: -80 };
  
  loader.load(
    levelConfig.powerupBad.path,
    (model) => {
      const powerup = model.scene;
      powerup.scale.set(levelConfig.powerupBad.scale.x, levelConfig.powerupBad.scale.y, levelConfig.powerupBad.scale.z);
      
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      powerup.position.set(randomLane, levelConfig.powerupBad.yOffset, GAME_CONFIG.spawnDistance);
      
      addEmissiveToModel(powerup, levelConfig.powerupBad.emissiveColor, levelConfig.powerupBad.emissiveIntensity);
      
      mpGameState.scene.add(powerup);
      mpGameState.powerupsBad.push({ 
        mesh: powerup, 
        type: 'powerupBad', 
        lane: randomLane, 
        rotation: 0,
        shouldFloat: levelConfig.powerupBad.float,
        baseY: levelConfig.powerupBad.yOffset
      });
    }
  );
}

function spawnBombMP() {
  const levelConfig = mpGameState.levelConfig;
  const GAME_CONFIG = { lanes: [-3, 0, 3], spawnDistance: -80 };
  
  loader.load(
    levelConfig.bomb.path,
    (model) => {
      const bomb = model.scene;
      bomb.scale.set(levelConfig.bomb.scale.x, levelConfig.bomb.scale.y, levelConfig.bomb.scale.z);
      
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      bomb.position.set(randomLane, levelConfig.bomb.yOffset, GAME_CONFIG.spawnDistance);
      
      addEmissiveToModel(bomb, levelConfig.bomb.emissiveColor, levelConfig.bomb.emissiveIntensity);
      
      mpGameState.scene.add(bomb);
      mpGameState.bombs.push({ 
        mesh: bomb, 
        type: 'bomb', 
        lane: randomLane, 
        rotation: 0,
        shouldFloat: true,
        baseY: levelConfig.bomb.yOffset
      });
    }
  );
}

function createCameraForMultiplayer(container) {
  mpGameState.camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  mpGameState.camera.position.set(0, 5, 10);
  mpGameState.camera.lookAt(0, 2, 0);
}

function createRendererForMultiplayer(container) {
  mpGameState.renderer = new THREE.WebGLRenderer({ antialias: true });
  mpGameState.renderer.setSize(container.clientWidth, container.clientHeight);
  mpGameState.renderer.shadowMap.enabled = true;
  mpGameState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(mpGameState.renderer.domElement);
}

function createLightsForMultiplayer() {
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x8B7355, 0.6);
  mpGameState.scene.add(hemisphereLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  mpGameState.scene.add(directionalLight);
}

function createGroundSegmentsForMultiplayer() {
  const levelConfig = mpGameState.levelConfig;
  const segmentGeometry = new THREE.PlaneGeometry(10, 50);
  const segmentMaterial = new THREE.MeshStandardMaterial({ 
    color: levelConfig.terrain.road,
    roughness: 0.8
  });

  for (let i = 0; i < 5; i++) {
    const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
    segment.rotation.x = -Math.PI / 2;
    segment.position.z = -50 * i;
    segment.receiveShadow = true;
    mpGameState.scene.add(segment);
    mpGameState.groundSegments.push(segment);
  }
}

function createGrassAreasForMultiplayer() {
  const levelConfig = mpGameState.levelConfig;
  const grassGeometry = new THREE.PlaneGeometry(10, 250);
  const grassMaterial = new THREE.MeshStandardMaterial({ 
    color: levelConfig.terrain.grass,
    roughness: 1.0
  });

  const grassLeft = new THREE.Mesh(grassGeometry, grassMaterial);
  grassLeft.rotation.x = -Math.PI / 2;
  grassLeft.position.set(-10, 0, -100);
  grassLeft.receiveShadow = true;
  mpGameState.scene.add(grassLeft);

  const grassRight = new THREE.Mesh(grassGeometry, grassMaterial);
  grassRight.rotation.x = -Math.PI / 2;
  grassRight.position.set(10, 0, -100);
  grassRight.receiveShadow = true;
  mpGameState.scene.add(grassRight);
}

function createLaneLinesForMultiplayer() {
  const levelConfig = mpGameState.levelConfig;
  const lineGeometry = new THREE.PlaneGeometry(0.1, 250);
  const lineMaterial = new THREE.MeshBasicMaterial({ 
    color: levelConfig.terrain.lines,
    transparent: true,
    opacity: 0.5
  });

  const lineLeft = new THREE.Mesh(lineGeometry, lineMaterial);
  lineLeft.rotation.x = -Math.PI / 2;
  lineLeft.position.set(-1.5, 0.01, -100);
  mpGameState.scene.add(lineLeft);

  const lineRight = new THREE.Mesh(lineGeometry, lineMaterial);
  lineRight.rotation.x = -Math.PI / 2;
  lineRight.position.set(1.5, 0.01, -100);
  mpGameState.scene.add(lineRight);
}

function createTreesForMultiplayer() {
  const levelConfig = mpGameState.levelConfig;
  
  const treePositions = [
    { x: -9, side: 'left' },
    { x: 9, side: 'right' }
  ];

  for (let z = 0; z > -200; z -= 15) {
    treePositions.forEach(pos => {
      loader.load(
        levelConfig.tree.path,
        (model) => {
          const tree = model.scene;
          tree.scale.set(
            levelConfig.tree.scale.x,
            levelConfig.tree.scale.y,
            levelConfig.tree.scale.z
          );
          tree.position.set(pos.x, levelConfig.tree.yOffset, z);
          tree.castShadow = true;
          tree.receiveShadow = true;
          mpGameState.scene.add(tree);
          mpGameState.trees.push({ mesh: tree, x: pos.x });
        },
        undefined,
        (error) => {
          // Árbol temporal si falla la carga
          const tempTreeGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
          const tempTreeMaterial = new THREE.MeshStandardMaterial({ color: "#8B4513" });
          const tempTree = new THREE.Mesh(tempTreeGeometry, tempTreeMaterial);
          tempTree.position.set(pos.x, 1.5, z);
          
          const foliageGeometry = new THREE.SphereGeometry(1.5, 8, 8);
          const foliageMaterial = new THREE.MeshStandardMaterial({ color: "#228B22" });
          const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
          foliage.position.y = 2;
          tempTree.add(foliage);
          
          tempTree.castShadow = true;
          tempTree.receiveShadow = true;
          
          mpGameState.scene.add(tempTree);
          mpGameState.trees.push({ mesh: tempTree, x: pos.x });
        }
      );
    });
  }
}