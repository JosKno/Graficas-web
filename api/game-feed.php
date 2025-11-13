<?php
// Configura los encabezados para permitir CORS (necesario si el juego se ejecuta localmente o en un dominio diferente)
header("Access-Control-Allow-Origin: *"); 
header("Content-Type: application/json; charset=UTF-8");

// 🚨 1. REEMPLAZA ESTO CON TU BEARER TOKEN REAL OBTENIDO DEL DASHBOARD DE X/TWITTER
$bearer_token = 'AAAAAAAAAAAAAAAAAAAAAEJ14wEAAAAAG0SHoIPQobDxZT%2BH0ZXXMu3vCvs%3DmcHHh7sYVjUWUjWFMvUw0zI2YvH9v9Q5rkzkzsQ93UkKMHbBxw'; 
$game_account = 'ChronoDash85495'; // Nombre de una cuenta de Twitter que quieras leer (ej. la tuya)

// Endpoint de la API de Twitter/X v2 para buscar tweets (usando el Bearer Token)
$endpoint_url = "https://api.twitter.com/2/tweets/search/recent?query=from:{$game_account}&tweet.fields=created_at&expansions=author_id&user.fields=username&max_results=10"; 

// =========================================================================
// 2. Lógica para hacer la solicitud a la API de X/Twitter
// =========================================================================
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $endpoint_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    "Authorization: Bearer " . $bearer_token
));

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    // Manejo de errores de la API
    http_response_code(500);
    echo json_encode(array("error" => "Error al obtener posts de X/Twitter.", "http_code" => $http_code));
    exit;
}

// 3. Procesar y devolver la respuesta al frontend (JavaScript)
$data = json_decode($response, true);
$simplified_posts = [];
$users = [];

// Construir un mapa de usuarios para obtener los nombres de usuario
if (isset($data['includes']['users'])) {
    foreach ($data['includes']['users'] as $user) {
        $users[$user['id']] = $user['username'];
    }
}

if (isset($data['data'])) {
    foreach ($data['data'] as $post) {
        $simplified_posts[] = [
            'user' => $users[$post['author_id']] ?? 'UsuarioDesconocido', 
            'content' => $post['text'] ?? 'Contenido no disponible'
        ];
    }
}

// Devuelve los posts simplificados
echo json_encode($simplified_posts);

?>