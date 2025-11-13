// ============================================
// SISTEMA DE CONTROLES
// ============================================

import gameState from './gameState.js';

export function setupControls() {
  // Controles de teclado
  document.addEventListener('keydown', (e) => {
    if (gameState.isGameOver) return;
    
    // Tecla ESC para pausar
    if (e.key === 'Escape') {
      e.preventDefault();
      togglePause();
      return;
    }
    
    if (gameState.isPaused || !gameState.isGameStarted) return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      gameState.changeLane('left');
    } 
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      gameState.changeLane('right');
    }
    else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault(); // Prevenir scroll de la página
      gameState.startJump();
    }
  });

  // Touch controls para móvil
  let touchStartX = 0;
  let touchStartY = 0;
  
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  document.addEventListener('touchend', (e) => {
    if (gameState.isPaused || !gameState.isGameStarted) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Verificar si es swipe vertical (salto) o horizontal (cambio de carril)
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 50) {
      // Swipe hacia arriba = saltar
      if (diffY > 0) {
        gameState.startJump();
      }
    } else if (Math.abs(diffX) > 50) {
      // Swipe horizontal = cambiar carril
      if (diffX > 0) {
        gameState.changeLane('left');
      } else {
        gameState.changeLane('right');
      }
    }
  });
}

export function togglePause() {
  if (gameState.isGameOver) return;
  
  gameState.isPaused = !gameState.isPaused;
  const pauseMenu = document.getElementById('pause-menu');
  
  if (pauseMenu) {
    pauseMenu.style.display = gameState.isPaused ? 'flex' : 'none';
  }
}

export function setupPauseButton() {
  const pauseButton = document.getElementById('pause-button');
  const pauseMenu = document.getElementById('pause-menu');
  const resumeButton = document.getElementById('resume-button');
  const restartButton = document.getElementById('restart-button');

  if (!pauseButton || !pauseMenu || !resumeButton) {
    console.warn('No se encontraron elementos de pausa');
    return;
  }

  pauseButton.addEventListener('click', () => {
    togglePause();
  });

  resumeButton.addEventListener('click', () => {
    togglePause();
  });
  
  // Botón de reiniciar
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      window.location.reload();
    });
  }
}