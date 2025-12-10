     // --- Configurações ---
        const GAME_DURATION = 20;
        const SPAWN_RATE_INITIAL = 700;
        const SPAWN_RATE_MIN = 300;
        
        // --- Estado do Jogo ---
        let score = 0;
        let timeLeft = GAME_DURATION;
        let gameInterval = null;
        let timerInterval = null;
        let isPlaying = false;
        let currentSpawnRate = SPAWN_RATE_INITIAL;
        let highScore = localStorage.getItem('popGameHighScore') || 0;
        let startScreenTimeout = null; // Variável para controlar o timeout da tela inicial

        // --- Elementos DOM ---
        const gameArea = document.getElementById('game-area');
        const scoreDisplay = document.getElementById('score-display');
        const timerDisplay = document.getElementById('timer-display');
        const startScreen = document.getElementById('start-screen');
        const gameOverScreen = document.getElementById('game-over-screen');
        const finalScoreDisplay = document.getElementById('final-score');
        const highScoreDisplay = document.getElementById('high-score');
        const startBtn = document.getElementById('start-btn');

        // Inicializa High Score no ecrã
        highScoreDisplay.textContent = highScore;

        // --- Event Listeners ---
        startBtn.addEventListener('click', startGame);

        // Listener para penalidade ao clicar no fundo
        function handleBackgroundClick(e) {
            if (!isPlaying) return;
            
            // As bolinhas param a propagação do clique (e.stopPropagation),
            // então se este evento disparar no gameArea, é porque foi um erro.
            
            // Obtém coordenadas para mostrar o texto flutuante
            let clientX, clientY;
            if (e.changedTouches && e.changedTouches.length > 0) {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            // Penalidade
            score--;
            // Removida a limitação if (score < 0) score = 0;
            updateDisplay();

            // Feedback visual de erro
            showFloatingText(clientX, clientY, "-1", "#dc2626"); // Vermelho
            
            // Flash vermelho subtil no fundo
            gameArea.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
            setTimeout(() => {
                gameArea.style.backgroundColor = 'transparent';
            }, 150);
        }

        gameArea.addEventListener('mousedown', handleBackgroundClick);
        // Passive false é necessário para alguns comportamentos de toque
        gameArea.addEventListener('touchstart', handleBackgroundClick, {passive: false});


        function startGame() {
            if (isPlaying) return;
            
            // UI Setup: Esconde visualmente
            startScreen.classList.add('opacity-0', 'pointer-events-none');
            
            // Remove completamente o elemento após a transição para evitar cliques bloqueados
            clearTimeout(startScreenTimeout);
            startScreenTimeout = setTimeout(() => {
                startScreen.classList.add('hidden');
            }, 300); // 300ms combina com o duration-300 do CSS

            gameOverScreen.classList.add('hidden');
            
            // Reset Variáveis
            score = 0;
            timeLeft = GAME_DURATION;
            currentSpawnRate = SPAWN_RATE_INITIAL;
            isPlaying = true;
            
            updateDisplay();
            
            // Loop do Jogo
            gameLoop();
            timerInterval = setInterval(updateTimer, 1000);
        }

        // Função chamada pelo botão de Restart para voltar ao menu
        function quitToMenu() {
            if (!isPlaying) return; // Se já não estiver jogando (ex: game over), o botão não precisa fazer nada ou pode só resetar

            isPlaying = false;
            clearInterval(timerInterval);
            
            // Salva high score se o jogador sair com uma pontuação boa
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('popGameHighScore', highScore);
            }
            
            resetGame();
        }

        function resetGame() {
            gameOverScreen.classList.add('hidden');
            
            // Traz de volta a tela inicial
            clearTimeout(startScreenTimeout);
            startScreen.classList.remove('hidden');
            
            // Força um "reflow" para que a transição de opacidade funcione
            void startScreen.offsetWidth; 
            
            startScreen.classList.remove('opacity-0', 'pointer-events-none');
            
            clearAllBalls();
            highScoreDisplay.textContent = localStorage.getItem('popGameHighScore') || 0;
        }

        function updateDisplay() {
            scoreDisplay.textContent = score;
            // Muda a cor do placar se for negativo para dar um feedback visual extra
            if (score < 0) {
                scoreDisplay.classList.remove('text-coffee-dark');
                scoreDisplay.classList.add('text-red-600');
            } else {
                scoreDisplay.classList.add('text-coffee-dark');
                scoreDisplay.classList.remove('text-red-600');
            }
            timerDisplay.textContent = timeLeft;
        }

        function updateTimer() {
            timeLeft--;
            timerDisplay.textContent = timeLeft;

            // Aumenta dificuldade com o tempo
            if (timeLeft % 5 === 0 && currentSpawnRate > SPAWN_RATE_MIN) {
                currentSpawnRate -= 50;
            }

            if (timeLeft <= 0) {
                endGame();
            }
        }

        function gameLoop() {
            if (!isPlaying) return;
            
            createBall();
            
            // O próximo spawn acontece baseado na taxa atual (dificuldade dinâmica)
            setTimeout(gameLoop, currentSpawnRate);
        }

        function createBall() {
            const ball = document.createElement('div');
            ball.classList.add('ball');

            // Lógica de Tipo de Bolinha (RNG)
            const rng = Math.random();
            let type = 'normal';
            let size = 50; // Tamanho base
            let points = 1;
            let duration = 2500; // Tempo de vida

            if (rng > 0.90) { // 10% chance Ouro
                type = 'gold';
                ball.classList.add('ball-gold');
                size = 30; // TAMANHO REDUZIDO
                points = 5;
                duration = 1500;
            } else {
                type = 'normal';
                ball.classList.add('ball-normal');
            }

            ball.style.width = `${size}px`;
            ball.style.height = `${size}px`;

            // Posição Aleatória (garantindo que fica dentro do ecrã)
            // Subtrai o tamanho da bola e um padding extra
            const maxX = window.innerWidth - size - 20; 
            const maxY = window.innerHeight - size - 100; // Espaço para UI no topo
            const randomX = Math.max(10, Math.floor(Math.random() * maxX));
            const randomY = Math.max(80, Math.floor(Math.random() * maxY)); // Pula header

            ball.style.left = `${randomX}px`;
            ball.style.top = `${randomY}px`;

            // Evento de Clique/Toque (Melhor que mouseover para jogos ativos)
            const handleInteract = (e) => {
                e.preventDefault(); // Previne zoom duplo toque e eventos fantasma
                e.stopPropagation(); // IMPEDE que o clique chegue ao gameArea (evita perder ponto)
                
                // Obtém coordenadas
                let cx, cy;
                if (e.type === 'touchstart') {
                     cx = e.touches[0].clientX;
                     cy = e.touches[0].clientY;
                } else {
                     cx = e.clientX;
                     cy = e.clientY;
                }
                
                popBall(ball, type, points, cx, cy);
            };

            ball.addEventListener('mousedown', handleInteract);
            ball.addEventListener('touchstart', handleInteract, {passive: false});

            gameArea.appendChild(ball);

            // Autodestruição se não clicado
            const timeoutId = setTimeout(() => {
                if (ball.parentElement && isPlaying) {
                    ball.style.transform = "scale(0)";
                    ball.style.opacity = "0";
                    setTimeout(() => { if(ball.parentElement) ball.remove(); }, 300);
                }
            }, duration);

            // Armazena ID para limpar depois se necessário
            ball.dataset.timeoutId = timeoutId;
        }

        function popBall(ball, type, points, x, y) {
            if (!isPlaying) return;

            // Efeito visual
            createParticles(x, y, type);
            // Cores mais escuras para o texto flutuante para contraste no bege
            showFloatingText(x, y, points > 0 ? `+${points}` : `${points}`, '#16a34a');

            // Lógica de Pontuação
            score += points;
            updateDisplay();

            // Remove a bolinha
            clearTimeout(ball.dataset.timeoutId);
            ball.remove();
        }

        function createParticles(x, y, type) {
            const colors = type === 'gold' ? ['#ffd700', '#fef3c7'] : ['#3a9ad9', '#bae6fd'];

            for (let i = 0; i < 8; i++) {
                const particle = document.createElement('div');
                particle.classList.add('particle');
                
                const size = Math.random() * 8 + 4;
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                
                particle.style.left = `${x}px`;
                particle.style.top = `${y}px`;

                // Direção aleatória
                const angle = Math.random() * Math.PI * 2;
                const velocity = Math.random() * 60 + 20;
                const tx = Math.cos(angle) * velocity;
                const ty = Math.sin(angle) * velocity;

                particle.style.setProperty('--tx', `${tx}px`);
                particle.style.setProperty('--ty', `${ty}px`);

                gameArea.appendChild(particle);

                setTimeout(() => particle.remove(), 500);
            }
        }

        function showFloatingText(x, y, text, color) {
            const el = document.createElement('div');
            el.classList.add('floating-score');
            el.textContent = text;
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.style.color = color;
            gameArea.appendChild(el);
            setTimeout(() => el.remove(), 800);
        }

        function endGame() {
            isPlaying = false;
            clearInterval(timerInterval);
            
            // Verifica High Score
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('popGameHighScore', highScore);
            }

            finalScoreDisplay.textContent = score;
            gameOverScreen.classList.remove('hidden');
        }

        function clearAllBalls() {
            gameArea.innerHTML = '';
        }