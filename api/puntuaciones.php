<?php
// ============================================
// API REST PARA PUNTUACIONES
// ============================================

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Manejar preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// ============================================
// OBTENER TOP 5 PUNTUACIONES POR NIVEL
// ============================================
if ($method == 'GET' && $action == 'top') {
    $nivel = isset($_GET['nivel']) ? intval($_GET['nivel']) : 0;
    
    if ($nivel < 1 || $nivel > 3) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Nivel inválido. Debe ser 1, 2 o 3.'
        ]);
        exit();
    }
    
    try {
        $query = "SELECT id, nivel, puntuacion, fragmentos, nombre_jugador, 
                  DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') as fecha_formateada
                  FROM puntuaciones 
                  WHERE nivel = :nivel 
                  ORDER BY puntuacion DESC 
                  LIMIT 5";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':nivel', $nivel);
        $stmt->execute();
        
        $puntuaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'nivel' => $nivel,
            'puntuaciones' => $puntuaciones
        ]);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener puntuaciones: ' . $e->getMessage()
        ]);
    }
}

// ============================================
// OBTENER TODAS LAS MEJORES PUNTUACIONES (PARA HTML)
// ============================================
else if ($method == 'GET' && $action == 'all_top') {
    try {
        $result = [];
        
        for ($nivel = 1; $nivel <= 3; $nivel++) {
            $query = "SELECT id, nivel, puntuacion, fragmentos, nombre_jugador, 
                      DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') as fecha_formateada
                      FROM puntuaciones 
                      WHERE nivel = :nivel 
                      ORDER BY puntuacion DESC 
                      LIMIT 5";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':nivel', $nivel);
            $stmt->execute();
            
            $result['nivel_' . $nivel] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'puntuaciones' => $result
        ]);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener puntuaciones: ' . $e->getMessage()
        ]);
    }
}

// ============================================
// GUARDAR NUEVA PUNTUACIÓN
// ============================================
else if ($method == 'POST' && $action == 'save') {
    $data = json_decode(file_get_contents("php://input"));
    
    // Validaciones
    if (empty($data->nivel) || empty($data->puntuacion) || empty($data->nombre_jugador)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Datos incompletos. Se requiere: nivel, puntuacion, nombre_jugador'
        ]);
        exit();
    }
    
    $nivel = intval($data->nivel);
    $puntuacion = intval($data->puntuacion);
    $fragmentos = isset($data->fragmentos) ? intval($data->fragmentos) : 0;
    $nombre_jugador = htmlspecialchars(strip_tags($data->nombre_jugador));
    $firebase_uid = isset($data->firebase_uid) ? htmlspecialchars(strip_tags($data->firebase_uid)) : null;
    
    // Validar nivel
    if ($nivel < 1 || $nivel > 3) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Nivel inválido. Debe ser 1, 2 o 3.'
        ]);
        exit();
    }
    
    // Validar puntuación
    if ($puntuacion < 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'La puntuación no puede ser negativa.'
        ]);
        exit();
    }
    
    // Validar nombre
    if (strlen($nombre_jugador) < 2 || strlen($nombre_jugador) > 100) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'El nombre debe tener entre 2 y 100 caracteres.'
        ]);
        exit();
    }
    
    try {
        $query = "INSERT INTO puntuaciones 
                  (nivel, puntuacion, fragmentos, nombre_jugador, firebase_uid) 
                  VALUES 
                  (:nivel, :puntuacion, :fragmentos, :nombre_jugador, :firebase_uid)";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':nivel', $nivel);
        $stmt->bindParam(':puntuacion', $puntuacion);
        $stmt->bindParam(':fragmentos', $fragmentos);
        $stmt->bindParam(':nombre_jugador', $nombre_jugador);
        $stmt->bindParam(':firebase_uid', $firebase_uid);
        
        if ($stmt->execute()) {
            $id = $db->lastInsertId();
            
            // Verificar si entró al top 5
            $query_top = "SELECT COUNT(*) as total FROM puntuaciones 
                          WHERE nivel = :nivel AND puntuacion > :puntuacion";
            $stmt_top = $db->prepare($query_top);
            $stmt_top->bindParam(':nivel', $nivel);
            $stmt_top->bindParam(':puntuacion', $puntuacion);
            $stmt_top->execute();
            $posicion = $stmt_top->fetch(PDO::FETCH_ASSOC)['total'] + 1;
            
            $es_top_5 = $posicion <= 5;
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Puntuación guardada correctamente',
                'id' => $id,
                'posicion' => $posicion,
                'es_top_5' => $es_top_5
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'No se pudo guardar la puntuación'
            ]);
        }
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al guardar puntuación: ' . $e->getMessage()
        ]);
    }
}

// ============================================
// OBTENER PUNTUACIONES DE UN USUARIO (FIREBASE)
// ============================================
else if ($method == 'GET' && $action == 'user') {
    $firebase_uid = isset($_GET['firebase_uid']) ? $_GET['firebase_uid'] : '';
    
    if (empty($firebase_uid)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Se requiere firebase_uid'
        ]);
        exit();
    }
    
    try {
        $query = "SELECT id, nivel, puntuacion, fragmentos, nombre_jugador, 
                  DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') as fecha_formateada
                  FROM puntuaciones 
                  WHERE firebase_uid = :firebase_uid 
                  ORDER BY fecha DESC 
                  LIMIT 20";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':firebase_uid', $firebase_uid);
        $stmt->execute();
        
        $puntuaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'puntuaciones' => $puntuaciones
        ]);
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener puntuaciones: ' . $e->getMessage()
        ]);
    }
}

// ============================================
// ACCIÓN NO VÁLIDA
// ============================================
else {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Endpoint no encontrado'
    ]);
}
?>