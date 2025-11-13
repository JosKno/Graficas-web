// ============================================
// CONFIGURACIÓN DEL JUEGO - MULTI NIVEL
// ============================================

// ============================================
// NIVEL 1 - BOSQUE
// ============================================
export const LEVEL_1_CONFIG = {
  name: "Bosque Místico",
  obstacle: {
    path: "./modelos/rock/rock.gltf",
    scale: { x: 0.0125, y: 0.0125, z: 0.0125 },
    yOffset: 0
  },
  coin: {
    path: "./modelos/coin/scene.gltf",
    scale: { x: 0.05, y: 0.05, z: 0.05 },
    yOffset: 1.5,
    rotate: true,
    emissiveColor: 0xffd700,
    emissiveIntensity: 1.5
  },
  powerupGood: {
    path: "./modelos/power_up/scene.gltf",
    scale: { x: 0.35, y: 0.35, z: 0.35 },
    yOffset: 1.5,
    float: true,
    emissiveColor: 0x00ff00,
    emissiveIntensity: 2.0
  },
  powerupBad: {
    path: "./modelos/poison/scene.gltf",
    scale: { x: 0.5, y: 0.5, z: 0.5 },
    yOffset: 1.5,
    float: true,
    emissiveColor: 0xff0000,
    emissiveIntensity: 2.0
  },
  tree: {
    path: "./modelos/pino/pino.gltf",
    scale: { x: 0.03, y: 0.03, z: 0.03 },
    yOffset: 0
  },
  runner: {
    path: "./modelos/runner/scene.gltf",
    scale: { x: 0.02, y: 0.02, z: 0.02 },
    yOffset: 0
  },
  background: "./img/cielo.png",
  terrain: {
    road: "#8B4513",    // Café tierra
    grass: "#228B22",   // Verde pasto
    lines: "#FFFFFF"    // Blanco
  },
  fog: {
    color: "#87CEEB",
    near: 30,
    far: 100
  },
  gameSpeed: 0.25,
  spawnRates: {
    obstacle: 0.01,
    coin: 0.025,
    powerupGood: 0.0015,
    powerupBad: 0.0005
  }
};

// ============================================
// NIVEL 2 - CIUDAD FUTURISTA
// ============================================
export const LEVEL_2_CONFIG = {
  name: "Ciudad Neón",
  obstacle: {
    path: "./modelos/barrera/scene.gltf",
    scale: { x: 0.8, y: 1.25, z: 0.8 },
    yOffset: 1,
    emissiveColor: 0x00ffff,      // Cyan neón brillante
    emissiveIntensity: 1.5
    
  },
  coin: {
    path: "./modelos/coin/scene.gltf",
    scale: { x: 0.05, y: 0.05, z: 0.05 },
    yOffset: 1.5,
    rotate: true,
    emissiveColor: 0xffd700,
    emissiveIntensity: 1.5
  },
  powerupGood: {
    path: "./modelos/power_up/scene.gltf",
    scale: { x: 0.35, y: 0.35, z: 0.35 },
    yOffset: 1.5,
    float: true,
    emissiveColor: 0x00ff00,
    emissiveIntensity: 2.0
  },
  powerupBad: {
    path: "./modelos/poison/scene.gltf",
    scale: { x: 0.5, y: 0.5, z: 0.5 },
    yOffset: 1.5,
    float: true,
    emissiveColor: 0xff0000,
    emissiveIntensity: 2.0
  },
  tree: {
    path: "./modelos/torre/scene.gltf", // Edificios/Torres
    scale: { x: 0.35, y: 0.35, z: 0.35 },
    yOffset: 0,
    emissiveColor: 0x9B59B6,      // Morado neón
    emissiveIntensity: 0.2
  },
   runner: {
    path: "./modelos/runner/scene.gltf",
    scale: { x: 0.02, y: 0.02, z: 0.02 },
    yOffset: 0
  },
  background: "./img/fondociu.jpg",
  terrain: {
    road: "#2C3E50",    // Asfalto oscuro
    grass: "#34495E",   // Acera gris oscura
    lines: "#00FFFF"    // Cyan neón
  },
  fog: {
    color: "#1a1a2e",   // Noche oscura
    near: 30,
    far: 100
  },
  // Efectos especiales para este nivel
  neonEffect: true,        // Activa efectos neón
  ambientLightColor: 0x4a148c,  // Luz ambiental morada
  ambientLightIntensity: 0.3,
  gameSpeed: 0.30,  // 33% más rápido
  spawnRates: {
    obstacle: 0.015,      // 40% más obstáculos
    coin: 0.025,
    powerupGood: 0.001,
    powerupBad: 0.0010    // 100% más power-ups malos
  }
};

// ============================================
// NIVEL 3 - VOLCÁN
// ============================================
export const LEVEL_3_CONFIG = {
  name: "Volcán Infernal",
  obstacle: {
    path: "./modelos/crystal/scene.gltf",
    scale: { x: 7, y: 10, z:8 },
    yOffset: 0
  },
  coin: {
    path: "./modelos/coin/scene.gltf",
    scale: { x: 0.05, y: 0.05, z: 0.05 },
    yOffset: 1.5,
    rotate: true,
    emissiveColor: 0xffd700,
    emissiveIntensity: 1.5
  },
  powerupGood: {
    path: "./modelos/power_up/scene.gltf",
    scale: { x: 0.35, y: 0.35, z: 0.35 },
    yOffset: 1.5,
    float: true,
    emissiveColor: 0x00ff00,
    emissiveIntensity: 2.0
  },
  powerupBad: {
    path: "./modelos/poison/scene.gltf",
    scale: { x: 0.5, y: 0.5, z: 0.5 },
    yOffset: 1.5,
    float: true,
    emissiveColor: 0xff0000,
    emissiveIntensity: 2.0
  },
  tree: {
    path: "./modelos/volcanito/scene.gltf", // Rocas volcánicas, cristales
    scale: { x: 1, y: 1, z: 1},
    yOffset: 0
  },
   runner: {
    path: "./modelos/runner/scene.gltf",
    scale: { x: 0.02, y: 0.02, z: 0.02 },
    yOffset: 0
  },
  background: "./img/fondovolo.jpg",
  terrain: {
    road: "#3D0000",    // Rojo oscuro lava solidificada
    grass: "#8B0000",   // Rojo sangre (lava lateral)
    lines: "#FF4500"    // Naranja fuego
  },
  fog: {
    color: "#FF4500",   // Naranja fuego
    near: 30,
    far: 100
  },
  gameSpeed: 0.35,  // 67% más rápido que nivel 1
  spawnRates: {
    obstacle: 0.02,      // 75% más obstáculos
    coin: 0.025,
    powerupGood: 0.0008,
    powerupBad: 0.0015    // 200% más power-ups malos
  }
};

// ============================================
// CONFIGURACIÓN GENERAL (No cambiar entre niveles)
// ============================================
export const GAME_CONFIG = {
  // Sistema de carriles
  lanes: [-3, 0, 3],
  startLane: 1,
  laneChangeSpeed: 0.15,
  
  // Distancias
  spawnDistance: -80,
  minSpawnGap: 15,
  despawnDistance: 20,
  
  // Puntuaciones
  scores: {
    coin: 100,
    coinFragments: 10,
    powerupGood: 500,
    powerupBad: -1000,
    distancePerFrame: 1,
    distanceUpdateInterval: 100
  },
  
  // Salto
 jump: {
    height: 3,     
    duration: 0.5,    
    gravity: 20       
  },
  
  // Contador inicial
  countdown: {
    duration: 3,
    startValue: 3
  },
  
  // Cámara
  camera: {
    fov: 75,
    position: { x: 0, y: 5, z: 10 },
    lookAt: { x: 0, y: 2, z: 0 }
  }
};

// ============================================
// FUNCIÓN PARA OBTENER CONFIGURACIÓN POR NIVEL
// ============================================
export function getLevelConfig(level) {
  switch(level) {
    case 1:
      return LEVEL_1_CONFIG;
    case 2:
      return LEVEL_2_CONFIG;
    case 3:
      return LEVEL_3_CONFIG;
    default:
      return LEVEL_1_CONFIG;
  }
}

// Variable global para el nivel actual
export let MODEL_CONFIG = LEVEL_1_CONFIG;

export function setCurrentLevel(level) {
  MODEL_CONFIG = getLevelConfig(level);
  return MODEL_CONFIG;
}