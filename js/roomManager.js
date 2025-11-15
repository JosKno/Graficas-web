// ============================================
// ROOM MANAGER - GESTIÓN DE SALAS MULTIPLAYER
// ============================================

import { 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    onValue, 
    off,
    push,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

class RoomManager {
    constructor(database) {
        this.db = database;
        this.currentRoom = null;
        this.currentRoomId = null;
        this.listeners = {};
    }

    // ============================================
    // CREAR SALA
    // ============================================
    async createRoom(userId, userName, userEmail, level = 1) {
        try {
            // Generar ID único para la sala
            const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const roomData = {
                roomId: roomId,
                createdAt: Date.now(),
                createdBy: userId,
                level: level,
                status: 'waiting',
                maxPlayers: 2,
                players: {
                    [userId]: {
                        uid: userId,
                        name: userName,
                        email: userEmail,
                        ready: false,
                        score: 0,
                        fragments: 0,
                        isAlive: true,
                        color: 'blue',
                        position: { x: -3, y: 0, z: 5 },
                        lane: 0,
                        isJumping: false,
                        joinedAt: Date.now()
                    }
                },
                winner: null,
                finishedAt: null
            };

            // Guardar sala en Firebase
            const roomRef = ref(this.db, `rooms/${roomId}`);
            await set(roomRef, roomData);

            console.log('✅ Sala creada:', roomId);
            
            this.currentRoomId = roomId;
            this.currentRoom = roomData;
            
            return {
                success: true,
                roomId: roomId,
                room: roomData
            };

        } catch (error) {
            console.error('❌ Error al crear sala:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================
    // BUSCAR SALAS DISPONIBLES
    // ============================================
    async findAvailableRooms(level = null) {
        try {
            const roomsRef = ref(this.db, 'rooms');
            const snapshot = await get(roomsRef);
            
            if (!snapshot.exists()) {
                return [];
            }

            const allRooms = snapshot.val();
            const availableRooms = [];

            // Filtrar salas disponibles
            for (const [roomId, room] of Object.entries(allRooms)) {
                const playerCount = Object.keys(room.players || {}).length;
                const isWaiting = room.status === 'waiting';
                const levelMatches = level === null || room.level === level;

                if (isWaiting && playerCount < room.maxPlayers && levelMatches) {
                    availableRooms.push({
                        roomId: roomId,
                        ...room
                    });
                }
            }

            console.log('🔍 Salas disponibles encontradas:', availableRooms.length);
            return availableRooms;

        } catch (error) {
            console.error('❌ Error al buscar salas:', error);
            return [];
        }
    }

    // ============================================
    // UNIRSE A SALA
    // ============================================
    async joinRoom(roomId, userId, userName, userEmail) {
        try {
            // Verificar que la sala existe
            const roomRef = ref(this.db, `rooms/${roomId}`);
            const snapshot = await get(roomRef);

            if (!snapshot.exists()) {
                return {
                    success: false,
                    error: 'Sala no encontrada'
                };
            }

            const room = snapshot.val();

            // Verificar que hay espacio
            const playerCount = Object.keys(room.players || {}).length;
            if (playerCount >= room.maxPlayers) {
                return {
                    success: false,
                    error: 'Sala llena'
                };
            }

            // Verificar que no está en progreso
            if (room.status !== 'waiting') {
                return {
                    success: false,
                    error: 'Partida ya comenzó'
                };
            }

            // Agregar jugador (Player 2 es rojo)
            const playerData = {
                uid: userId,
                name: userName,
                email: userEmail,
                ready: false,
                score: 0,
                fragments: 0,
                isAlive: true,
                color: 'red',
                position: { x: 0, y: 0, z: 5 },
                lane: 1,
                isJumping: false,
                joinedAt: Date.now()
            };

            const updates = {};
            updates[`rooms/${roomId}/players/${userId}`] = playerData;
            
            await update(ref(this.db), updates);

            console.log('✅ Unido a sala:', roomId);

            this.currentRoomId = roomId;
            this.currentRoom = room;

            return {
                success: true,
                roomId: roomId,
                playerData: playerData
            };

        } catch (error) {
            console.error('❌ Error al unirse a sala:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================
    // MARCAR JUGADOR COMO LISTO
    // ============================================
    async setPlayerReady(roomId, userId, ready = true) {
        try {
            const updates = {};
            updates[`rooms/${roomId}/players/${userId}/ready`] = ready;
            
            await update(ref(this.db), updates);
            console.log('✅ Estado ready actualizado:', ready);

            return { success: true };

        } catch (error) {
            console.error('❌ Error al actualizar ready:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // INICIAR PARTIDA
    // ============================================
    async startGame(roomId) {
        try {
            const updates = {};
            updates[`rooms/${roomId}/status`] = 'playing';
            updates[`rooms/${roomId}/startedAt`] = Date.now();
            
            await update(ref(this.db), updates);
            console.log('✅ Partida iniciada');

            return { success: true };

        } catch (error) {
            console.error('❌ Error al iniciar partida:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // ACTUALIZAR POSICIÓN DEL JUGADOR
    // ============================================
    async updatePlayerPosition(roomId, userId, position, lane, isJumping) {
        try {
            const updates = {};
            updates[`rooms/${roomId}/players/${userId}/position`] = position;
            updates[`rooms/${roomId}/players/${userId}/lane`] = lane;
            updates[`rooms/${roomId}/players/${userId}/isJumping`] = isJumping;
            
            await update(ref(this.db), updates);

            return { success: true };

        } catch (error) {
            console.error('❌ Error al actualizar posición:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // ACTUALIZAR PUNTUACIÓN
    // ============================================
    async updatePlayerScore(roomId, userId, score, fragments) {
        try {
            const updates = {};
            updates[`rooms/${roomId}/players/${userId}/score`] = score;
            updates[`rooms/${roomId}/players/${userId}/fragments`] = fragments;
            
            await update(ref(this.db), updates);

            return { success: true };

        } catch (error) {
            console.error('❌ Error al actualizar score:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // MARCAR JUGADOR COMO MUERTO
    // ============================================
    async setPlayerDead(roomId, userId) {
        try {
            const updates = {};
            updates[`rooms/${roomId}/players/${userId}/isAlive`] = false;
            updates[`rooms/${roomId}/players/${userId}/diedAt`] = Date.now();
            
            await update(ref(this.db), updates);
            console.log('💀 Jugador marcado como muerto');

            // Verificar si hay un ganador
            await this.checkForWinner(roomId);

            return { success: true };

        } catch (error) {
            console.error('❌ Error al marcar jugador muerto:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // VERIFICAR GANADOR
    // ============================================
    async checkForWinner(roomId) {
        try {
            const roomRef = ref(this.db, `rooms/${roomId}`);
            const snapshot = await get(roomRef);

            if (!snapshot.exists()) return;

            const room = snapshot.val();
            const players = room.players;

            // Contar jugadores vivos
            const alivePlayers = Object.entries(players).filter(([uid, player]) => player.isAlive);

            if (alivePlayers.length === 1) {
                // Hay un ganador
                const [winnerId, winner] = alivePlayers[0];

                const updates = {};
                updates[`rooms/${roomId}/status`] = 'finished';
                updates[`rooms/${roomId}/winner`] = winnerId;
                updates[`rooms/${roomId}/winnerName`] = winner.name;
                updates[`rooms/${roomId}/finishedAt`] = Date.now();

                await update(ref(this.db), updates);

                console.log('🏆 Ganador:', winner.name);

                return {
                    success: true,
                    winner: {
                        uid: winnerId,
                        name: winner.name,
                        score: winner.score
                    }
                };
            }

            return { success: true, winner: null };

        } catch (error) {
            console.error('❌ Error al verificar ganador:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // ESCUCHAR CAMBIOS EN LA SALA
    // ============================================
    listenToRoom(roomId, callback) {
        const roomRef = ref(this.db, `rooms/${roomId}`);
        
        const unsubscribe = onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const room = snapshot.val();
                callback(room);
            } else {
                callback(null);
            }
        });

        // Guardar listener para limpieza posterior
        this.listeners[roomId] = unsubscribe;

        return unsubscribe;
    }

    // ============================================
    // ESCUCHAR CAMBIOS EN UN JUGADOR ESPECÍFICO
    // ============================================
    listenToPlayer(roomId, playerId, callback) {
        const playerRef = ref(this.db, `rooms/${roomId}/players/${playerId}`);
        
        const unsubscribe = onValue(playerRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            }
        });

        this.listeners[`player_${playerId}`] = unsubscribe;

        return unsubscribe;
    }

    // ============================================
    // SALIR DE LA SALA
    // ============================================
    async leaveRoom(roomId, userId) {
        try {
            // Eliminar jugador de la sala
            const playerRef = ref(this.db, `rooms/${roomId}/players/${userId}`);
            await remove(playerRef);

            // Verificar si quedan jugadores
            const roomRef = ref(this.db, `rooms/${roomId}`);
            const snapshot = await get(roomRef);

            if (snapshot.exists()) {
                const room = snapshot.val();
                const playerCount = Object.keys(room.players || {}).length;

                if (playerCount === 0) {
                    // Eliminar sala si no hay jugadores
                    await remove(roomRef);
                    console.log('🗑️ Sala eliminada (sin jugadores)');
                }
            }

            // Limpiar listeners
            this.stopListening(roomId);

            this.currentRoomId = null;
            this.currentRoom = null;

            console.log('✅ Salido de la sala');
            return { success: true };

        } catch (error) {
            console.error('❌ Error al salir de sala:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // DETENER LISTENERS
    // ============================================
    stopListening(roomId) {
        if (this.listeners[roomId]) {
            off(ref(this.db, `rooms/${roomId}`));
            delete this.listeners[roomId];
        }

        // Limpiar listeners de jugadores
        Object.keys(this.listeners).forEach(key => {
            if (key.startsWith('player_')) {
                delete this.listeners[key];
            }
        });
    }

    // ============================================
    // LIMPIAR SALAS ANTIGUAS (Mantenimiento)
    // ============================================
    async cleanOldRooms(maxAgeMinutes = 60) {
        try {
            const roomsRef = ref(this.db, 'rooms');
            const snapshot = await get(roomsRef);

            if (!snapshot.exists()) return;

            const allRooms = snapshot.val();
            const now = Date.now();
            const maxAge = maxAgeMinutes * 60 * 1000;
            let cleaned = 0;

            for (const [roomId, room] of Object.entries(allRooms)) {
                const age = now - room.createdAt;
                
                if (age > maxAge || room.status === 'finished') {
                    await remove(ref(this.db, `rooms/${roomId}`));
                    cleaned++;
                }
            }

            console.log(`🧹 Salas limpiadas: ${cleaned}`);
            return { success: true, cleaned };

        } catch (error) {
            console.error('❌ Error al limpiar salas:', error);
            return { success: false, error: error.message };
        }
    }
}

// Exportar instancia singleton
let roomManagerInstance = null;

export function initRoomManager(database) {
    if (!roomManagerInstance) {
        roomManagerInstance = new RoomManager(database);
    }
    return roomManagerInstance;
}

export function getRoomManager() {
    if (!roomManagerInstance) {
        throw new Error('RoomManager no inicializado. Llama a initRoomManager primero.');
    }
    return roomManagerInstance;
}

export default RoomManager;