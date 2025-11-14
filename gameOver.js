// ============================================
// SISTEMA DE GAME OVER
// ============================================

import * as THREE from "three";
import gameState from './gameState.js';

// Función para guardar puntuación automáticamente
async function guardarPuntuacionAutomatica() {
  try {
    // Obtener nivel actual desde window
    const nivel = window.CURRENT_LEVEL || 1;
    
    // Obtener nombre del jugador (por ahora "INVITADO", luego será de Firebase)
    const nombreJugador = localStorage.getItem('playerName') || 'INVITADO';
    const firebaseUid = localStorage.getItem('firebaseUid') || null;
    
    // Llamar a la API
    const API_URL = 'http://localhost/Pantallas/api/puntuaciones.php';
    const response = await fetch(`${API_URL}?action=save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nivel: nivel,
        puntuacion: gameState.score,
        fragmentos: gameState.fragments,
        nombre_jugador: nombreJugador,
        firebase_uid: firebaseUid
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Puntuación guardada:', data);
      if (data.es_top_5) {
        console.log(`🏆 ¡Nuevo récord! Posición: ${data.posicion}`);
      }
    } else {
      console.error('❌ Error al guardar:', data.message);
    }
  } catch (error) {
    console.error('❌ Error al guardar puntuación:', error);
  }
}

export function showGameOver(reason = 'Colisión') {
  gameState.isGameOver = true;
  gameState.isPaused = true;

  // Guardar puntuación automáticamente
  guardarPuntuacionAutomatica();

  // Crear overlay de game over
  const gameOverOverlay = document.createElement('div');
  gameOverOverlay.id = 'gameover-overlay';
  gameOverOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: 'Rajdhani', sans-serif;
    animation: fadeInGameOver 0.5s ease-in;
  `;

  const gameOverBox = document.createElement('div');
  gameOverBox.style.cssText = `
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 40px 60px;
    text-align: center;
    border: 2px solid rgba(255, 255, 255, 0.3);
    animation: scaleIn 0.5s ease-out;
  `;

  gameOverBox.innerHTML = `
    <h1 style="color: #ff4757; font-size: 60px; margin: 0 0 10px 0; text-shadow: 0 0 20px rgba(255, 71, 87, 0.8);">
      ¡GAME OVER!
    </h1>
    <p style="color: rgba(255, 255, 255, 0.7); font-size: 18px; margin: 0 0 30px 0;">
      ${reason}
    </p>
    <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
      <p style="color: #fff; font-size: 24px; margin: 0 0 10px 0;">PUNTUACIÓN FINAL</p>
      <p style="color: #ffd700; font-size: 48px; font-weight: 700; margin: 0;">
        ${gameState.score}
      </p>
      <p style="color: rgba(255, 255, 255, 0.7); font-size: 18px; margin: 10px 0 0 0;">
        Fragmentos: ${gameState.fragments}
      </p>
    </div>
    <div style="display: flex; gap: 20px; justify-content: center;">
      <button id="retry-button" style="
        background: #00d2ff;
        border: none;
        color: #fff;
        font-family: 'Rajdhani', sans-serif;
        font-size: 20px;
        font-weight: 700;
        padding: 15px 40px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(0, 210, 255, 0.3);
      ">
        INTENTAR DE NUEVO
      </button>
      <button id="exit-button" style="
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: #fff;
        font-family: 'Rajdhani', sans-serif;
        font-size: 20px;
        font-weight: 700;
        padding: 15px 40px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        SALIR
      </button>
    </div>
  `;

  gameOverOverlay.appendChild(gameOverBox);
  document.body.appendChild(gameOverOverlay);

  // Agregar estilos de animación
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInGameOver {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes scaleIn {
      from { 
        transform: scale(0.8);
        opacity: 0;
      }
      to { 
        transform: scale(1);
        opacity: 1;
      }
    }
    
    #retry-button:hover {
      background: #00b8e6 !important;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 210, 255, 0.5) !important;
    }
    
    #exit-button:hover {
      background: rgba(255, 255, 255, 0.3) !important;
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(style);

  // Event listeners
  document.getElementById('retry-button').addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('exit-button').addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

export function createExplosion(position, color = 0xff4500) {
  // Explosión estándar (bomba y obstáculos)
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 50;
  const positions = new Float32Array(particlesCount * 3);
  const velocities = [];

  for(let i = 0; i < particlesCount; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;

    velocities.push({
      x: (Math.random() - 0.5) * 0.3,
      y: Math.random() * 0.3,
      z: (Math.random() - 0.5) * 0.3
    });
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.3,
    color: color,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  
  return { particles, velocities, life: 1.0, type: 'explosion' };
}

export function createSparks(position, color = 0x00ff00) {
  // Chispas para PowerUp bueno
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 30;
  const positions = new Float32Array(particlesCount * 3);
  const velocities = [];

  for(let i = 0; i < particlesCount; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;

    // Velocidades más rápidas y en todas direcciones (chispas)
    velocities.push({
      x: (Math.random() - 0.5) * 0.5,
      y: Math.random() * 0.6 + 0.2,  // Más hacia arriba
      z: (Math.random() - 0.5) * 0.5
    });
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.15,  // Más pequeñas que explosión
    color: color,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  
  return { particles, velocities, life: 0.8, type: 'sparks' };
}

export function createShatter(position, color = 0xff0000) {
  // Partículas que se destruyen para PowerUp malo
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 40;
  const positions = new Float32Array(particlesCount * 3);
  const velocities = [];
  const sizes = new Float32Array(particlesCount);

  for(let i = 0; i < particlesCount; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;

    // Velocidades explosivas hacia afuera
    const angle = (i / particlesCount) * Math.PI * 2;
    const speed = Math.random() * 0.4 + 0.2;
    velocities.push({
      x: Math.cos(angle) * speed,
      y: Math.random() * 0.3 + 0.1,
      z: Math.sin(angle) * speed
    });

    // Tamaños variables para efecto de fragmentos
    sizes[i] = Math.random() * 0.3 + 0.2;
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.25,
    color: color,
    transparent: true,
    opacity: 1,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  
  return { particles, velocities, life: 1.2, type: 'shatter' };
}

export function updateExplosions(explosions, scene, delta) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    const positions = explosion.particles.geometry.attributes.position.array;

    // Actualizar posiciones
    for (let j = 0; j < explosion.velocities.length; j++) {
      positions[j * 3] += explosion.velocities[j].x;
      positions[j * 3 + 1] += explosion.velocities[j].y;
      positions[j * 3 + 2] += explosion.velocities[j].z;

      // Gravedad diferente según tipo
      if (explosion.type === 'sparks') {
        explosion.velocities[j].y -= delta * 3;  // Caen más rápido (chispas)
      } else if (explosion.type === 'shatter') {
        explosion.velocities[j].y -= delta * 2.5;  // Gravedad media (fragmentos)
      } else {
        explosion.velocities[j].y -= delta * 2;  // Gravedad normal (explosión)
      }
    }

    explosion.particles.geometry.attributes.position.needsUpdate = true;
    explosion.life -= delta;
    explosion.particles.material.opacity = explosion.life / (explosion.type === 'shatter' ? 1.2 : explosion.type === 'sparks' ? 0.8 : 1.0);

    // Remover si terminó
    if (explosion.life <= 0) {
      scene.remove(explosion.particles);
      explosion.particles.geometry.dispose();
      explosion.particles.material.dispose();
      explosions.splice(i, 1);
    }
  }
}