// ============================================
// MAIN MULTIPLAYER - ORQUESTADOR DEL JUEGO
// ============================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { getLevelConfig } from '../config.js';
import mpGameState from './multiplayerGameState.js';
import { getMultiplayerSync } from './multiplayerSync.js';
import { loadRunnerMultiplayer } from './multiplayerSceneSetup.js';
import { spawnObjects } from '../spawner.js';
import { updateAllMultiplayer } from './multiplayerUpdater.js';
import { showCountdown } from '../countdown.js';

let animationFrameId = null;
const multiplayerSync = getMultiplayerSync();
const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

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
  const roomInfo = await getRoomInfo(roomId);
  if (!roomInfo) {
    alert('Sala no encontrada');
    window.location.href = 'lobby.html';
    return;
  }

  // Validar que la sala tenga jugadores
  if (!roomInfo.players || typeof roomInfo.players !== 'object') {
    console.error('❌ Sala sin jugadores:', roomInfo);
    alert('Error: La sala no tiene jugadores configurados');
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

  // Obtener color del jugador
  const playerColor = roomInfo.players[localPlayerId]?.color || 'blue';
  
  console.log('🎨 Color asignado:', playerColor);

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
  const localName = roomInfo.players[localPlayerId].name || 'TÚ';
  const remoteName = roomInfo.players[remotePlayerId].name || 'OPONENTE';
  
  document.getElementById('local-player-name').textContent = localName.toUpperCase();
  document.getElementById('remote-player-name').textContent = remoteName.toUpperCase();
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
  });
}

// ============================================
// ACTUALIZAR JUGADOR REMOTO DESDE FIREBASE
// ============================================
function updateRemotePlayerFromData(data) {
  const remote = mpGameState.players.remote;
  
  // Actualizar posición
  if (data.position && remote.runner) {
    remote.runner.position.x = data.position.x;
    remote.runner.position.y = data.position.y;
    remote.runner.position.z = data.position.z;
  }
  
  // Actualizar carril
  if (data.lane !== undefined) {
    remote.currentLane = data.lane;
  }
  
  // Actualizar estado de salto
  if (data.isJumping !== undefined) {
    remote.isJumping = data.isJumping;
  }
  
  // Actualizar puntuación en HUD
  if (data.score !== undefined) {
    remote.score = data.score;
    document.getElementById('remote-score').textContent = data.score;
  }
  
  if (data.fragments !== undefined) {
    remote.fragments = data.fragments;
    document.getElementById('remote-fragments').textContent = data.fragments;
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
function handleGameOver(winnerId) {
  mpGameState.isGameOver = true;
  mpGameState.isPaused = true;
  
  const isLocalWinner = winnerId === mpGameState.localPlayerId;
  const isDraw = winnerId === 'draw';
  
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
    message.textContent = 'Has derrotado a tu oponente';
  } else {
    content.className = 'gameover-content loser';
    title.textContent = 'DERROTA';
    message.textContent = 'Tu oponente ha ganado esta vez';
  }
  
  // Mostrar puntuaciones finales
  document.getElementById('final-local-score').textContent = mpGameState.players.local.score;
  document.getElementById('final-local-fragments').textContent = mpGameState.players.local.fragments;
  document.getElementById('final-remote-score').textContent = mpGameState.players.remote.score;
  document.getElementById('final-remote-fragments').textContent = mpGameState.players.remote.fragments;
  
  overlay.style.display = 'flex';
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

  // Generar nuevos objetos
  spawnObjects();
  
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