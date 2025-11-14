-- ============================================
-- BASE DE DATOS PARA CHRONO-DASH
-- ============================================

CREATE DATABASE IF NOT EXISTS chrono_dash;
USE chrono_dash;

-- Tabla de puntuaciones
CREATE TABLE IF NOT EXISTS puntuaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nivel INT NOT NULL,                      -- 1, 2, o 3
    puntuacion INT NOT NULL,                 -- Puntuación obtenida
    fragmentos INT DEFAULT 0,                -- Fragmentos recolectados
    firebase_uid VARCHAR(255) NULL,          -- UID de Firebase (NULL si juega como invitado)
    nombre_jugador VARCHAR(100) NOT NULL,    -- Nombre del jugador
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nivel (nivel),
    INDEX idx_puntuacion (puntuacion),
    INDEX idx_firebase_uid (firebase_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de partidas multijugador (opcional para estadísticas)
CREATE TABLE IF NOT EXISTS partidas_multiplayer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jugador1_uid VARCHAR(255) NOT NULL,
    jugador2_uid VARCHAR(255) NOT NULL,
    ganador_uid VARCHAR(255) NOT NULL,
    puntuacion_j1 INT NOT NULL,
    puntuacion_j2 INT NOT NULL,
    duracion INT,                            -- Duración en segundos
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_jugador1 (jugador1_uid),
    INDEX idx_jugador2 (jugador2_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar datos de ejemplo
INSERT INTO puntuaciones (nivel, puntuacion, fragmentos, nombre_jugador) VALUES
(1, 12450, 124, 'JOSÉ ALBERTO'),
(1, 9875, 98, 'DIEGO'),
(1, 8500, 85, 'JOSUE'),
(1, 7250, 72, 'JUGADOR 4'),
(1, 6100, 61, 'JUGADOR 5'),
(2, 15200, 152, 'JOSÉ ALBERTO'),
(2, 11300, 113, 'DIEGO'),
(2, 9800, 98, 'JOSUE'),
(2, 8400, 84, 'JUGADOR 4'),
(2, 7600, 76, 'JUGADOR 5'),
(3, 18500, 185, 'JOSÉ ALBERTO'),
(3, 13200, 132, 'DIEGO'),
(3, 11500, 115, 'JOSUE'),
(3, 9700, 97, 'JUGADOR 4'),
(3, 8300, 83, 'JUGADOR 5');