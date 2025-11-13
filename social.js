document.addEventListener('DOMContentLoaded', () => {
    const shareButton = document.getElementById('share-score-button');
    const socialStatus = document.getElementById('social-status');
    const scoreElement = document.querySelector('.scores-list li:first-child .score-value');
    const topScore = scoreElement ? scoreElement.getAttribute('data-score') : '0';
    const topName = document.querySelector('.scores-list li:first-child .score-name').textContent;

    const socialFeedElement = document.getElementById('social-feed');

    function postToSocialMedia(score, name) {
        socialStatus.textContent = 'Conectando...';
        
        // Simulación de una promesa para imitar una solicitud de red asíncrona
        return new Promise(resolve => {
            setTimeout(() => {
                const success = true; // Simulación siempre exitosa
                if (success) {
                    resolve({ status: 'success', message: `Puntuación de ${score} lista para compartir.` });
                } else {
                    resolve({ status: 'error', message: 'Error en la conexión con la API de publicación.' });
                }
            }, 500); // 0.5 segundos de retardo para simular la latencia
        });
    }


    // =========================================================================
    // LEE POSTS DE LA API PHP
    // =========================================================================
    async function fetchRealPosts() {
        try {
            // Asegúrate de usar la URL que te funcionó para la lectura:
            const response = await fetch('http://localhost/Pantallas/api/game-feed.php');
            
            if (!response.ok) {
                throw new Error(`Error de red: ${response.status}`);
            }

            const posts = await response.json(); 
            
            socialFeedElement.innerHTML = '';

            if (posts && posts.length > 0 && !posts.error) {
                posts.forEach(post => {
                    const postItem = document.createElement('div');
                    postItem.className = 'post-item';
                    postItem.innerHTML = `
                        <p class="post-user">@${post.user}</p>
                        <p class="post-content">${post.content}</p>
                    `;
                    socialFeedElement.appendChild(postItem);
                });
            } else {
                socialFeedElement.innerHTML = '<p class="social-text" style="color: #fff; font-size: 1rem;">No hay publicaciones disponibles o el servidor devolvió un error.</p>';
            }

        } catch (error) {
            console.error("Error al cargar el feed social:", error);
            socialFeedElement.innerHTML = '<p class="social-text" style="color: red; font-size: 1rem;">❌ No se pudo conectar al servidor';
        }
    }
    
    // Llama a la función al cargar la página
    fetchRealPosts();

    // =========================================================================
    // ABRE LA VENTANA DE COMPARTIR (Web Intent)
    // =========================================================================
    function openTwitterShare(score, name) {
        const text = `¡Mi nueva mejor puntuación en Chrono-Dash es de ${score} puntos! Vencido por ${name}. ¿Puedes superarme? #ChronoDash #InfinityRun #WebGl`;
        const url = encodeURIComponent(window.location.href);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`;
        
        // Abrir ventana de compartir
        window.open(twitterUrl, 'ShareScore', 'width=550,height=420');
        socialStatus.textContent += ' Se abrió la ventana de compartir.';
    }

    // =========================================================================
    // EJECUTA LA SIMULACIÓN Y LUEGO ABRE LA VENTANA
    // =========================================================================
    shareButton.addEventListener('click', async () => {
        // 1. Ejecuta la simulación de conexión a la API (POST)
        const result = await postToSocialMedia(topScore, topName);
        
        if (result.status === 'success') {
            socialStatus.style.color = '#00e0b3'; // Color verde de éxito
            socialStatus.textContent = result.message;
            // 2. Abre la ventana real de X/Twitter
            openTwitterShare(topScore, topName);
        } else {
            socialStatus.style.color = 'red';
            socialStatus.textContent = result.message;
        }
    });

});