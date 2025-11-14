// ============================================
// SISTEMA DE ACTUALIZACIÓN DE OBJETOS
// ============================================

import * as THREE from "three";
import { GAME_CONFIG } from './config.js';
import gameState from './gameState.js';
import { showGameOver, createExplosion, createSparks, createShatter, updateExplosions } from './gameOver.js';

export function updateRunner(delta) {
  if (!gameState.runner) return;

  // Movimiento lateral suave entre carriles
  const currentX = gameState.runner.position.x;
  if (Math.abs(currentX - gameState.targetLaneX) > 0.01) {
    gameState.runner.position.x += (gameState.targetLaneX - currentX) * GAME_CONFIG.laneChangeSpeed;
  } else {
    gameState.runner.position.x = gameState.targetLaneX;
  }
  
  // Actualizar salto
  gameState.updateJump(delta);
}

export function updateGround() {
  gameState.groundSegments.forEach(segment => {
    segment.position.z += gameState.gameSpeed;
    if (segment.position.z > 100) {
      segment.position.z -= 250;
    }
  });
}

export function updateTrees() {
  gameState.trees.forEach(tree => {
    tree.mesh.position.z += gameState.gameSpeed;
    if (tree.mesh.position.z > 20) {
      tree.mesh.position.z -= 220;
    }
  });
}

function checkCollision(objectPos, runnerPos, tolerance = 1.5) {
  const zDiff = Math.abs(objectPos.z - runnerPos.z);
  const xDiff = Math.abs(objectPos.x - runnerPos.x);
  return zDiff < tolerance && xDiff < 1;
}

export function updateObstacles() {
  for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
    const obj = gameState.obstacles[i];
    
    if (obj.type === 'decoration') {
      obj.mesh.position.z += gameState.gameSpeed;
      if (obj.mesh.position.z > 20) {
        obj.mesh.position.z -= 240;
      }
    } else {
      obj.mesh.position.z += gameState.gameSpeed;
      
      // Detectar colisión solo si no está saltando o está muy bajo
      if (gameState.runner && !gameState.isJumping && !gameState.isGameOver) {
        if (checkCollision(obj.mesh.position, gameState.runner.position, 2)) {
          console.log('¡Colisión con obstáculo!');
          gameState.isGameOver = true;
          
          // Reproducir animación de muerte y luego mostrar game over
          gameState.playDeathAnimation(() => {
            showGameOver('Chocaste con un obstáculo');
          });
        }
      }

      if (obj.mesh.position.z > GAME_CONFIG.despawnDistance) {
        gameState.scene.remove(obj.mesh);
        gameState.obstacles.splice(i, 1);
      }
    }
  }
}

export function updateCoins() {
  for (let i = gameState.coins.length - 1; i >= 0; i--) {
    const coin = gameState.coins[i];
    coin.mesh.position.z += gameState.gameSpeed;
    
    if (coin.shouldRotate) {
      coin.rotation += 0.05;
      coin.mesh.rotation.y = coin.rotation;
    }

    if (gameState.runner && !gameState.isGameOver && checkCollision(coin.mesh.position, gameState.runner.position)) {
      gameState.scene.remove(coin.mesh);
      gameState.coins.splice(i, 1);
      gameState.updateFragments(GAME_CONFIG.scores.coinFragments);
      gameState.updateScore(GAME_CONFIG.scores.coin);
      gameState.showHUDEffect('+100', '#ffd700');
      console.log('¡Moneda recogida! +' + GAME_CONFIG.scores.coin + ' puntos');
      continue;
    }

    if (coin.mesh.position.z > GAME_CONFIG.despawnDistance) {
      gameState.scene.remove(coin.mesh);
      gameState.coins.splice(i, 1);
    }
  }
}

export function updatePowerupsGood() {
  for (let i = gameState.powerupsGood.length - 1; i >= 0; i--) {
    const powerup = gameState.powerupsGood[i];
    powerup.mesh.position.z += gameState.gameSpeed;
    powerup.rotation += 0.03;
    powerup.mesh.rotation.y = powerup.rotation;

    if (powerup.shouldFloat) {
      powerup.mesh.position.y = powerup.baseY + Math.sin(Date.now() * 0.003) * 0.3;
    }

    if (gameState.runner && !gameState.isGameOver && checkCollision(powerup.mesh.position, gameState.runner.position)) {
      // Crear CHISPAS verdes
      const sparks = createSparks(powerup.mesh.position, 0x00ff00);
      gameState.scene.add(sparks.particles);
      gameState.explosions.push(sparks);
      
      gameState.scene.remove(powerup.mesh);
      gameState.powerupsGood.splice(i, 1);
      gameState.updateScore(GAME_CONFIG.scores.powerupGood);
      gameState.showHUDEffect('+500', '#00ff00');
      console.log('¡PowerUp recogido! +' + GAME_CONFIG.scores.powerupGood + ' puntos');
      continue;
    }

    if (powerup.mesh.position.z > GAME_CONFIG.despawnDistance) {
      gameState.scene.remove(powerup.mesh);
      gameState.powerupsGood.splice(i, 1);
    }
  }
}

export function updatePowerupsBad() {
  for (let i = gameState.powerupsBad.length - 1; i >= 0; i--) {
    const powerup = gameState.powerupsBad[i];
    powerup.mesh.position.z += gameState.gameSpeed;
    powerup.rotation += 0.03;
    powerup.mesh.rotation.x = powerup.rotation;
    powerup.mesh.rotation.y = powerup.rotation;

    if (powerup.shouldFloat) {
      powerup.mesh.position.y = powerup.baseY + Math.sin(Date.now() * 0.003) * 0.3;
    }

    if (gameState.runner && !gameState.isGameOver && checkCollision(powerup.mesh.position, gameState.runner.position)) {
      // Crear FRAGMENTOS rojos (efecto de destrucción)
      const shatter = createShatter(powerup.mesh.position, 0xff0000);
      gameState.scene.add(shatter.particles);
      gameState.explosions.push(shatter);
      
      gameState.scene.remove(powerup.mesh);
      gameState.powerupsBad.splice(i, 1);
      gameState.updateScore(GAME_CONFIG.scores.powerupBad);
      gameState.showHUDEffect('-1000', '#ff0000');
      console.log('¡PowerUp malo! ' + GAME_CONFIG.scores.powerupBad + ' puntos');
      continue;
    }

    if (powerup.mesh.position.z > GAME_CONFIG.despawnDistance) {
      gameState.scene.remove(powerup.mesh);
      gameState.powerupsBad.splice(i, 1);
    }
  }
}

export function updateBombs() {
  for (let i = gameState.bombs.length - 1; i >= 0; i--) {
    const bomb = gameState.bombs[i];
    bomb.mesh.position.z += gameState.gameSpeed;
    bomb.rotation += 0.05;
    bomb.mesh.rotation.y = bomb.rotation;

    if (gameState.runner && !gameState.isGameOver && checkCollision(bomb.mesh.position, gameState.runner.position, 1.8)) {
      // Crear explosión grande
      const explosion = createExplosion(bomb.mesh.position, 0xff4500);
      gameState.scene.add(explosion.particles);
      gameState.explosions.push(explosion);
      
      gameState.scene.remove(bomb.mesh);
      gameState.bombs.splice(i, 1);
      gameState.isGameOver = true;
      
      console.log('¡Explosión de bomba!');
      
      // Reproducir animación de muerte y luego mostrar game over
      gameState.playDeathAnimation(() => {
        showGameOver('¡Explotaste con una bomba!');
      });
      
      continue;
    }

    if (bomb.mesh.position.z > GAME_CONFIG.despawnDistance) {
      gameState.scene.remove(bomb.mesh);
      gameState.bombs.splice(i, 1);
    }
  }
}

export function updateAll(delta) {
  if (!gameState.isGameStarted) return;
  
  // Actualizar explosiones/partículas SIEMPRE (incluso durante game over)
  updateExplosions(gameState.explosions, gameState.scene, delta);
  
  // Si hay game over, solo actualizar partículas y animaciones, no el resto del juego
  if (gameState.isGameOver) return;
  
  updateRunner(delta);
  updateGround();
  updateTrees();
  updateObstacles();
  updateCoins();
  updatePowerupsGood();
  updatePowerupsBad();
  updateBombs();

  // Incrementar puntuación por distancia
  gameState.score += GAME_CONFIG.scores.distancePerFrame;
  if (gameState.score % GAME_CONFIG.scores.distanceUpdateInterval === 0) {
    gameState.updateHUD();
  }
}