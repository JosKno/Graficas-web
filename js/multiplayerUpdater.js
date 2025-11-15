// ============================================
// SISTEMA DE ACTUALIZACIÓN MULTIPLAYER
// ============================================

import * as THREE from "three";
import { GAME_CONFIG } from '../config.js';
import mpGameState from './multiplayerGameState.js';
import { getMultiplayerSync } from './multiplayerSync.js';
import { createExplosion, createSparks, updateExplosions } from '../gameOver.js';
import { handleGameOver } from './mainMultiplayer.js';

const multiplayerSync = getMultiplayerSync();

// ============================================
// ACTUALIZAR TODO
// ============================================
export function updateAllMultiplayer(delta) {
  updateRunners(delta);
  updateGround();
  updateTrees();
  updateObstacles();
  updateCoins();
  updatePowerupsGood();
  updatePowerupsBad();
  updateBombs();
  updateExplosions(delta);
}

// ============================================
// ACTUALIZAR AMBOS RUNNERS
// ============================================
function updateRunners(delta) {
  // Actualizar runner local
  updateRunner(delta, 'local');
  
  // Actualizar runner remoto (solo visualmente, sin físicas locales)
  updateRunner(delta, 'remote');
}

function updateRunner(delta, playerType) {
  const player = mpGameState.players[playerType];
  if (!player.runner || !player.isAlive) return;

  // Movimiento lateral suave entre carriles
  const currentX = player.runner.position.x;
  if (Math.abs(currentX - player.targetLaneX) > 0.01) {
    player.runner.position.x += (player.targetLaneX - currentX) * GAME_CONFIG.laneChangeSpeed;
  } else {
    player.runner.position.x = player.targetLaneX;
  }
  
  // Actualizar salto (solo para jugador local, el remoto se sincroniza)
  if (playerType === 'local') {
    mpGameState.updateJump(delta, 'local');
  }
}

// ============================================
// ACTUALIZAR TERRENO
// ============================================
function updateGround() {
  mpGameState.groundSegments.forEach(segment => {
    segment.position.z += mpGameState.gameSpeed;
    if (segment.position.z > 100) {
      segment.position.z -= 250;
    }
  });
}

// ============================================
// ACTUALIZAR ÁRBOLES/DECORACIONES
// ============================================
function updateTrees() {
  mpGameState.trees.forEach(tree => {
    tree.mesh.position.z += mpGameState.gameSpeed;
    if (tree.mesh.position.z > 20) {
      tree.mesh.position.z -= 220;
    }
  });
}

// ============================================
// DETECTAR COLISIÓN
// ============================================
function checkCollision(objectPos, runnerPos, tolerance = 1.5) {
  const zDiff = Math.abs(objectPos.z - runnerPos.z);
  const xDiff = Math.abs(objectPos.x - runnerPos.x);
  return zDiff < tolerance && xDiff < 1;
}

// ============================================
// ACTUALIZAR OBSTÁCULOS
// ============================================
function updateObstacles() {
  for (let i = mpGameState.obstacles.length - 1; i >= 0; i--) {
    const obj = mpGameState.obstacles[i];
    
    obj.mesh.position.z += mpGameState.gameSpeed;
    
    // Detectar colisión SOLO con jugador local (no con remoto)
    const localPlayer = mpGameState.players.local;
    if (localPlayer.runner && !localPlayer.isJumping && localPlayer.isAlive && !mpGameState.isGameOver) {
      if (checkCollision(obj.mesh.position, localPlayer.runner.position, 2)) {
        console.log('¡Colisión local con obstáculo!');
        
        // Efectos visuales
        createExplosion(obj.mesh.position, mpGameState.scene);
        createSparks(obj.mesh.position, mpGameState.scene);
        
        // Matar jugador local
        mpGameState.killPlayer('local');
        
        // Actualizar HUD
        updatePlayerStatusUI('local', false);
        
        // Notificar a Firebase que este jugador murió
        multiplayerSync.updateLocalAliveStatus(false);
        
        // Declarar al jugador remoto como ganador INMEDIATAMENTE
        multiplayerSync.declareWinner(mpGameState.remotePlayerId);
        
        // Mostrar Game Over LOCALMENTE también
        setTimeout(() => {
          handleGameOver(mpGameState.remotePlayerId);
        }, 500);
        
        // Remover obstáculo
        mpGameState.scene.remove(obj.mesh);
        mpGameState.obstacles.splice(i, 1);
        continue;
      }
    }
    
    // Remover si está muy lejos
    if (obj.mesh.position.z > 20) {
      mpGameState.scene.remove(obj.mesh);
      mpGameState.obstacles.splice(i, 1);
    }
  }
}

// ============================================
// ACTUALIZAR MONEDAS
// ============================================
function updateCoins() {
  for (let i = mpGameState.coins.length - 1; i >= 0; i--) {
    const coin = mpGameState.coins[i];
    
    coin.mesh.position.z += mpGameState.gameSpeed;
    
    // Rotación
    if (coin.shouldRotate) {
      coin.rotation += 0.05;
      coin.mesh.rotation.y = coin.rotation;
    }
    
    // Colisión SOLO con jugador local
    const localPlayer = mpGameState.players.local;
    if (localPlayer.runner && localPlayer.isAlive) {
      if (checkCollision(coin.mesh.position, localPlayer.runner.position, 1.5)) {
        console.log('¡Moneda recolectada!');
        
        // Añadir puntuación
        mpGameState.addScore(GAME_CONFIG.scores.coin, 'local');
        mpGameState.addFragments(GAME_CONFIG.scores.coinFragments, 'local');
        
        // Actualizar HUD
        document.getElementById('local-score').textContent = localPlayer.score;
        document.getElementById('local-fragments').textContent = localPlayer.fragments;
        
        // Sincronizar con Firebase
        multiplayerSync.updateLocalScore(localPlayer.score, localPlayer.fragments);
        
        // Remover moneda
        mpGameState.scene.remove(coin.mesh);
        mpGameState.coins.splice(i, 1);
        continue;
      }
    }
    
    if (coin.mesh.position.z > 20) {
      mpGameState.scene.remove(coin.mesh);
      mpGameState.coins.splice(i, 1);
    }
  }
}

// ============================================
// ACTUALIZAR POWER-UPS BUENOS
// ============================================
function updatePowerupsGood() {
  for (let i = mpGameState.powerupsGood.length - 1; i >= 0; i--) {
    const powerup = mpGameState.powerupsGood[i];
    
    powerup.mesh.position.z += mpGameState.gameSpeed;
    
    // Flotación
    if (powerup.shouldFloat) {
      powerup.rotation += 0.03;
      powerup.mesh.rotation.y = powerup.rotation;
      powerup.mesh.position.y = powerup.baseY + Math.sin(powerup.rotation * 2) * 0.3;
    }
    
    // Colisión con jugador local
    const localPlayer = mpGameState.players.local;
    if (localPlayer.runner && localPlayer.isAlive) {
      if (checkCollision(powerup.mesh.position, localPlayer.runner.position, 1.5)) {
        console.log('¡Power-up bueno recolectado!');
        
        mpGameState.addScore(GAME_CONFIG.scores.powerupGood, 'local');
        
        document.getElementById('local-score').textContent = localPlayer.score;
        
        multiplayerSync.updateLocalScore(localPlayer.score, localPlayer.fragments);
        
        mpGameState.scene.remove(powerup.mesh);
        mpGameState.powerupsGood.splice(i, 1);
        continue;
      }
    }
    
    if (powerup.mesh.position.z > 20) {
      mpGameState.scene.remove(powerup.mesh);
      mpGameState.powerupsGood.splice(i, 1);
    }
  }
}

// ============================================
// ACTUALIZAR POWER-UPS MALOS
// ============================================
function updatePowerupsBad() {
  for (let i = mpGameState.powerupsBad.length - 1; i >= 0; i--) {
    const powerup = mpGameState.powerupsBad[i];
    
    powerup.mesh.position.z += mpGameState.gameSpeed;
    
    if (powerup.shouldFloat) {
      powerup.rotation += 0.03;
      powerup.mesh.rotation.y = powerup.rotation;
      powerup.mesh.position.y = powerup.baseY + Math.sin(powerup.rotation * 2) * 0.3;
    }
    
    const localPlayer = mpGameState.players.local;
    if (localPlayer.runner && localPlayer.isAlive) {
      if (checkCollision(powerup.mesh.position, localPlayer.runner.position, 1.5)) {
        console.log('¡Power-up malo recolectado!');
        
        mpGameState.addScore(GAME_CONFIG.scores.powerupBad, 'local');
        
        document.getElementById('local-score').textContent = localPlayer.score;
        
        multiplayerSync.updateLocalScore(localPlayer.score, localPlayer.fragments);
        
        mpGameState.scene.remove(powerup.mesh);
        mpGameState.powerupsBad.splice(i, 1);
        continue;
      }
    }
    
    if (powerup.mesh.position.z > 20) {
      mpGameState.scene.remove(powerup.mesh);
      mpGameState.powerupsBad.splice(i, 1);
    }
  }
}

// ============================================
// ACTUALIZAR BOMBAS
// ============================================
function updateBombs() {
  for (let i = mpGameState.bombs.length - 1; i >= 0; i--) {
    const bomb = mpGameState.bombs[i];
    
    bomb.mesh.position.z += mpGameState.gameSpeed;
    
    if (bomb.shouldFloat) {
      bomb.rotation += 0.02;
      bomb.mesh.rotation.y = bomb.rotation;
      bomb.mesh.position.y = bomb.baseY + Math.sin(bomb.rotation * 3) * 0.2;
    }
    
    const localPlayer = mpGameState.players.local;
    if (localPlayer.runner && localPlayer.isAlive && !mpGameState.isGameOver) {
      if (checkCollision(bomb.mesh.position, localPlayer.runner.position, 2)) {
        console.log('¡Bomba explotada!');
        
        // Crear explosión grande
        createExplosion(bomb.mesh.position, mpGameState.scene, 3);
        createSparks(bomb.mesh.position, mpGameState.scene);
        
        // Matar jugador local
        mpGameState.killPlayer('local');
        updatePlayerStatusUI('local', false);
        multiplayerSync.updateLocalAliveStatus(false);
        
        // Declarar ganador inmediatamente
        multiplayerSync.declareWinner(mpGameState.remotePlayerId);
        
        // Mostrar Game Over LOCALMENTE también
        setTimeout(() => {
          handleGameOver(mpGameState.remotePlayerId);
        }, 500);
        
        mpGameState.scene.remove(bomb.mesh);
        mpGameState.bombs.splice(i, 1);
        continue;
      }
    }
    
    if (bomb.mesh.position.z > 20) {
      mpGameState.scene.remove(bomb.mesh);
      mpGameState.bombs.splice(i, 1);
    }
  }
}

// ============================================
// ACTUALIZAR UI DE ESTADO
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