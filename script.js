document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('video');
    const captureBtn = document.getElementById('capture-btn');
    const countdown = document.getElementById('countdown');
    const recordingTimer = document.getElementById('recording-timer');
    const loadingScreen = document.getElementById('loading');
    const resultContainer = document.getElementById('result');
    const qrcodeContainer = document.getElementById('qrcode');
    const videosContainer = document.getElementById('videos');
    const clearVideosBtn = document.getElementById('clear-videos');
    const currentTimeDisplay = document.getElementById('current-time');

    const MAX_VIDEOS = 10;
    const VIDEO_DURATION = 10; // 10 segundos
    let stream = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    let recordingInterval = null;
    let secondsRecorded = 0;

    // Atualiza o relógio
    function updateClock() {
        const now = new Date();
        const timeString = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        currentTimeDisplay.textContent = timeString;
    }

    setInterval(updateClock, 1000);
    updateClock();

    // Carrega a galeria do localStorage
    loadVideos();

    // Inicia a câmera
    startCamera();

    captureBtn.addEventListener('click', startRecording);
    clearVideosBtn.addEventListener('click', clearVideos);

    // Evento para rolar para o topo quando clicar no botão
    captureBtn.addEventListener('click', function() {
        const cameraContainer = document.querySelector('.camera-container');
        const cameraRect = cameraContainer.getBoundingClientRect();
        const headerHeight = document.querySelector('.header').offsetHeight;

        if (cameraRect.top < headerHeight) {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    });

    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("Erro ao acessar a câmera:", err);
            alert("Não foi possível acessar a câmera. Por favor, conceda as permissões necessárias.");
        }
    }

    function startRecording() {
        resetCameraPosition();
        captureBtn.disabled = true;

        let counter = 3;

        countdown.textContent = counter;
        countdown.style.display = 'flex';

        const countdownInterval = setInterval(() => {
            counter--;
            countdown.textContent = counter;

            if (counter <= 0) {
                clearInterval(countdownInterval);
                countdown.style.display = 'none';
                startVideoRecording();
            }
        }, 1000);
    }

    function resetCameraPosition() {
        // Implementação para redefinir a posição da câmera se necessário
    }

    function startVideoRecording() {
        // Configurar o MediaRecorder
        recordedChunks = [];
        const options = { mimeType: 'video/webm;codecs=vp9,opus' };
        mediaRecorder = new MediaRecorder(stream, options);

        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = function() {
            finishRecording();
        };

        // Iniciar gravação
        mediaRecorder.start();
        captureBtn.textContent = "GRAVANDO...";
        captureBtn.classList.add('recording-btn');
        
        // Atualizar timer de gravação
        secondsRecorded = 0;
        recordingTimer.textContent = formatTime(secondsRecorded);
        recordingTimer.style.display = 'block';
        
        recordingInterval = setInterval(() => {
            secondsRecorded++;
            recordingTimer.textContent = formatTime(secondsRecorded);
            
            if (secondsRecorded >= VIDEO_DURATION) {
                stopRecording();
            }
        }, 1000);
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        clearInterval(recordingInterval);
        recordingTimer.style.display = 'none';
        captureBtn.classList.remove('recording-btn');
        captureBtn.textContent = "GRAVAR VÍDEO";
        captureBtn.disabled = false;
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    async function finishRecording() {
        loadingScreen.style.display = 'flex';

        // Criar blob do vídeo
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Salvar localmente
        saveToDevice(url);
        
        // Salvar na galeria
        saveVideoLocally(url);
        
        // Gerar QR Code
        generateQRCode(url);
        
        // Mostrar resultado
        showResult();
        
        loadingScreen.style.display = 'none';
    }

    function saveToDevice(url) {
        try {
            const a = document.createElement('a');
            a.href = url;
            a.download = `video_360_${new Date().getTime()}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Erro ao salvar vídeo:', error);
        }
    }

    function saveVideoLocally(url) {
        let videos = JSON.parse(localStorage.getItem('videos') || '[]');
        videos.unshift({
            url: url,
            timestamp: new Date().getTime()
        });

        if (videos.length > MAX_VIDEOS) {
            videos = videos.slice(0, MAX_VIDEOS);
        }

        localStorage.setItem('videos', JSON.stringify(videos));
        loadVideos();
    }

    function generateQRCode(url) {
        qrcodeContainer.innerHTML = '';
        const qrTimer = document.getElementById("qr-timer");
        const qrExpireLabel = document.getElementById("qr-expire-label");
        const qrTitle = document.getElementById("qr-title");
        const qrSubtitle = document.getElementById("qr-subtitle");
        const qrExpiredMsg = document.getElementById("qr-expired-msg");

        // Mostrar o título e legendas enquanto o QR está ativo
        qrTitle.style.display = 'block';
        qrSubtitle.style.display = 'block';
        qrExpireLabel.style.display = 'block';
        qrTimer.style.display = 'block';
        qrExpiredMsg.style.display = 'none';

        // Gera o QR Code
        new QRCode(qrcodeContainer, {
            text: url,
            width: 200,
            height: 200,
            colorDark: "#FFA500",
            colorLight: "#000000",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Inicia contagem regressiva
        let tempo = 30;
        qrTimer.textContent = `${tempo}s`;

        const interval = setInterval(() => {
            tempo--;
            qrTimer.textContent = `${tempo}s`;

            if (tempo <= 0) {
                clearInterval(interval);

                // Oculta elementos do QR
                qrcodeContainer.innerHTML = '';
                qrTitle.style.display = 'none';
                qrSubtitle.style.display = 'none';
                qrExpireLabel.style.display = 'none';
                qrTimer.style.display = 'none';

                // Mostra a nova mensagem
                qrExpiredMsg.style.display = 'block';

                // Rola até a câmera (logo abaixo do cabeçalho)
                const headerHeight = document.querySelector('.header').offsetHeight;
                const cameraContainer = document.querySelector('.camera-container');
                const cameraTop = cameraContainer.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: cameraTop,
                    behavior: 'smooth'
                });
            }
        }, 1000);
    }

    function showResult() {
        resultContainer.style.display = 'block';

        const header = document.querySelector('.header');
        const headerHeight = header.offsetHeight;
        const captureBtn = document.getElementById('capture-btn');
        const btnPosition = captureBtn.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        const qrPosition = resultContainer.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        const scrollToPosition = Math.min(btnPosition, qrPosition);

        window.scrollTo({
            top: scrollToPosition,
            behavior: 'smooth'
        });
    }

    function loadVideos() {
        const videos = JSON.parse(localStorage.getItem('videos') || '[]');
        videosContainer.innerHTML = '';

        videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            
            const videoElement = document.createElement('video');
            videoElement.src = video.url;
            videoElement.controls = false;
            
            const playIcon = document.createElement('div');
            playIcon.className = 'play-icon';
            playIcon.innerHTML = '▶';
            
            videoItem.appendChild(videoElement);
            videoItem.appendChild(playIcon);
            
            videoItem.addEventListener('click', function() {
                window.open(video.url, '_blank');
            });
            
            videosContainer.appendChild(videoItem);
        });
    }

    function clearVideos() {
        if (confirm('Tem certeza que deseja limpar toda a galeria de vídeos?')) {
            localStorage.removeItem('videos');
            videosContainer.innerHTML = '';
        }
    }
});
