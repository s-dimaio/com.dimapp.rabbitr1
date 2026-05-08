document.addEventListener('DOMContentLoaded', async () => {
    // Setup UI elements
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const chatContainer = document.getElementById('chatContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    // Screens
    const setupScreen = document.getElementById('setupScreen');
    const mainScreen = document.getElementById('mainScreen');
    const scannerScreen = document.getElementById('scannerScreen');
    const headerTitle = document.getElementById('headerTitle');
    const settingsBtn = document.getElementById('settingsBtn');
    const backToChatBtn = document.getElementById('backToChatBtn');

    // Inputs
    const homeyNameInput = document.getElementById('homeyNameInput');
    const homeyIpInput = { value: '' };
    const homeyTokenInput = { value: '' };

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');

        // Mostra il tasto impostazioni solo nella mainScreen
        if (screenId === 'mainScreen') {
            settingsBtn.style.display = 'flex';
            backToChatBtn.style.display = 'none';
        } else if (screenId === 'setupScreen' && Config.isConfigured) {
            settingsBtn.style.display = 'none';
            backToChatBtn.style.display = 'flex';
        } else {
            settingsBtn.style.display = 'none';
            backToChatBtn.style.display = 'none';
        }
    }

    function setStatus(status, text) {
        statusIndicator.className = 'status-indicator ' + status;
        if (text) statusText.textContent = text;
    }

    // Initial Translation
    i18n.translatePage();

    // Load config
    await Config.load();
    if (Config.isConfigured) {
        headerTitle.textContent = Config.homeyName;
        showScreen('mainScreen');
        setStatus('ready', i18n.get('status_ready'));
    } else {
        headerTitle.textContent = 'Homey Control';
        showScreen('setupScreen');
        setStatus('error', i18n.get('status_not_configured'));
    }

    // Setup Form Handlers
    const qrContainer = document.getElementById('qrContainer');
    const qrVideo = document.getElementById('qrVideo');
    let qrScannerInterval = null;
    let localMediaStream = null;

    // Check if camera API is available
    const cameraAvailable = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (!cameraAvailable) {
        console.log('getUserMedia not available.');
    } else {
        console.log('Camera API available, QR scan enabled.');
    }

    // Check Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        console.log('SpeechRecognition API IS available on this device!');
    } else {
        console.warn('SpeechRecognition API is NOT available.');
    }

    document.getElementById('setupBtn').addEventListener('click', () => {
        showScreen('scannerScreen');
        startQRScanner();
    });

    document.getElementById('cancelQrBtn').addEventListener('click', () => {
        stopQRScanner();
        showScreen('setupScreen');
    });

    // Gestione tastiera: chiudi al tasto Invio o click fuori
    homeyNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            homeyNameInput.blur();
        }
    });

    async function startQRScanner() {
        // Guard: should never be called if camera is not available
        if (!cameraAvailable) {
            console.error('startQRScanner called but camera API is unavailable.');
            showToast(i18n.get('error_no_camera'));
            showScreen('setupScreen');
            return;
        }

        try {
            localMediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            qrVideo.srcObject = localMediaStream;
            qrVideo.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen

            // Wait for video to start playing to get dimensions
            qrVideo.addEventListener('play', function() {
                const canvasElement = document.createElement("canvas");
                const canvas = canvasElement.getContext("2d");

                function tick() {
                    if (qrVideo.readyState === qrVideo.HAVE_ENOUGH_DATA) {
                        canvasElement.height = qrVideo.videoHeight;
                        canvasElement.width = qrVideo.videoWidth;
                        canvas.drawImage(qrVideo, 0, 0, canvasElement.width, canvasElement.height);
                        
                        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
                        // Make sure jsQR is loaded
                        if (typeof jsQR !== 'undefined') {
                            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: "dontInvert",
                            });
                            
                            if (code) {
                                handleQRScanned(code.data);
                                return; // Stop the tick loop
                            }
                        }
                    }
                    if (localMediaStream) { // Only continue if scanner wasn't stopped
                        requestAnimationFrame(tick);
                    }
                }
                
                requestAnimationFrame(tick);
            }, { once: true });

        } catch (err) {
            console.error('Camera access error:', err);
            stopQRScanner();
            showToast(i18n.get('error_camera_access'));
            showScreen('setupScreen');
        }
    }

    function stopQRScanner() {
        if (qrScannerInterval) {
            clearInterval(qrScannerInterval);
            qrScannerInterval = null;
        }
        if (localMediaStream) {
            localMediaStream.getTracks().forEach(track => track.stop());
            localMediaStream = null;
        }
    }

    const toastNotification = document.getElementById('toastNotification');
    let toastTimeout;

    function showToast(message, isError = true) {
        toastNotification.textContent = message;
        toastNotification.style.backgroundColor = isError ? '#E91E63' : '#4CAF50';
        toastNotification.classList.add('show');
        
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastNotification.classList.remove('show');
        }, 3000);
    }

    async function handleQRScanned(dataString) {
        stopQRScanner();
        
        try {
            const data = JSON.parse(dataString);
            if (data.i && data.t) {
                homeyIpInput.value = data.i;
                homeyTokenInput.value = data.t;
                
                // Leggi il nome scelto dall'utente o usa il default
                const chosenName = homeyNameInput.value.trim() || 'Homey Control';
                
                // Auto-salva e vai alla home
                await Config.save(data.i, data.t, chosenName);
                headerTitle.textContent = Config.homeyName;
                showScreen('mainScreen');
                setStatus('ready', i18n.get('status_ready'));
            } else {
                showToast(i18n.get('error_invalid_qr'));
                setTimeout(() => { startQRScanner(); }, 2500);
            }
        } catch(e) {
            showToast(i18n.get('error_qr_read'));
            setTimeout(() => { startQRScanner(); }, 2500);
        }
    }



    // --- Web Speech API (STT) Setup ---
    let speechRecognition = null;
    let finalTranscript = '';
    
    // --- Plugin Message Callback (THE CORE OF R1 VOICE) ---
    window.onPluginMessage = async function(data) {
        console.log('RECEIVED FROM R1 OS:', JSON.stringify(data));
        
        if (!Config.isConfigured) return;

        // Formato ufficiale: { "type": "sttEnded", "transcript": "ciao homey" }
        // ATTENZIONE: l'OS manda anche {"type": "sttStarted"}, dobbiamo ignorarlo.
        
        // Se arriva come stringa, la parsiamo
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) {}
        }

        if (data && data.type === 'sttEnded' && data.transcript) {
            const text = data.transcript.trim();
            if (text.length > 0) {
                appendCommand(text);
                setStatus('processing', i18n.get('status_processing'));
                await sendCommandAndPoll(text);
            } else {
                console.warn('Transcript was empty, ignoring.');
                setStatus('ready', i18n.get('error_no_response'));
            }
        } else {
            console.log('Ignoring non-transcription message:', data.type || data.message || 'unknown');
        }
    };

    // --- Chat Logic ---
    let conversationHistory = [];
    let currentResponseNode = null;

    function parseMarkdown(text) {
        if (!text) return '';
        // Sostituzione base per grassetto (**testo**)
        let parsed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Sostituzione base per corsivo (*testo*)
        parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Gestione a capo (\n)
        parsed = parsed.replace(/\n/g, '<br>');
        return parsed;
    }

    function typeWriter(element, text, speed = 30, callback = null) {
        const parsedText = parseMarkdown(text);
        let i = 0;
        
        function type() {
            if (i < parsedText.length) {
                if (parsedText.charAt(i) === '<') {
                    const tagEnd = parsedText.indexOf('>', i);
                    if (tagEnd !== -1) {
                        element.innerHTML += parsedText.substring(i, tagEnd + 1);
                        i = tagEnd + 1;
                    } else {
                        element.innerHTML += parsedText.charAt(i);
                        i++;
                    }
                } else {
                    element.innerHTML += parsedText.charAt(i);
                    i++;
                }
                
                scrollToBottom();
                setTimeout(type, speed);
            } else if (callback) {
                callback();
            }
        }
        
        element.innerHTML = '';
        type();
    }

    function appendCommand(text) {
        // Remove welcome message if present
        const welcomeMsg = document.getElementById('chatWelcome');
        if (welcomeMsg) welcomeMsg.remove();

        const cmdDiv = document.createElement('div');
        cmdDiv.className = 'chat-message chat-command';
        chatContainer.appendChild(cmdDiv);
        
        typeWriter(cmdDiv, text, 20, () => {
            // Create a placeholder for the response AFTER the command is typed
            currentResponseNode = document.createElement('div');
            currentResponseNode.className = 'chat-message chat-response';
            chatContainer.appendChild(currentResponseNode);
        });
    }

    function appendResponse(text, isError = false) {
        if (!currentResponseNode) {
            currentResponseNode = document.createElement('div');
            currentResponseNode.className = 'chat-message chat-response';
            chatContainer.appendChild(currentResponseNode);
        }

        if (isError) currentResponseNode.style.color = '#E91E63';
        
        typeWriter(currentResponseNode, text, 30, () => {
            conversationHistory.push({ command: '', response: text });
            currentResponseNode = null;
        });
    }

    function smoothScrollTo(element, target, duration) {
        const start = element.scrollTop;
        const change = target - start;
        const startTime = performance.now();

        function animateScroll(currentTime) {
            const elapsedTime = currentTime - startTime;
            if (elapsedTime < duration) {
                // Easing function: easeOutCubic
                const t = elapsedTime / duration;
                const easeOutCubic = 1 - Math.pow(1 - t, 3);
                element.scrollTop = start + change * easeOutCubic;
                requestAnimationFrame(animateScroll);
            } else {
                element.scrollTop = target;
            }
        }
        requestAnimationFrame(animateScroll);
    }

    function scrollToBottom() {
        // Usiamo un timeout per assicurarci che il browser abbia calcolato l'altezza del nuovo elemento
        setTimeout(() => {
            const targetScroll = chatContainer.scrollHeight - chatContainer.clientHeight;
            // Rallentiamo lo scroll a 800ms (regolabile)
            smoothScrollTo(chatContainer, targetScroll, 800);
        }, 50);
    }

    function showLoading() {
        loadingIndicator.classList.remove('hidden');
        scrollToBottom();
    }

    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }

    // --- Interaction Logic ---
    function startListening() {
        if (!Config.isConfigured) return;
        
        setStatus('listening', i18n.get('listening'));

        // Bridge Nativo Rabbit R1
        if (typeof CreationVoiceHandler !== 'undefined') {
            try {
                CreationVoiceHandler.postMessage('start');
                console.log('CreationVoiceHandler: START sent');
            } catch(e) {
                console.error('Error calling CreationVoiceHandler start:', e);
            }
        } else {
            console.warn('CreationVoiceHandler NOT found (normal in browser)');
        }
    }

    function stopListening() {
        if (!Config.isConfigured) return;
        
        setStatus('processing', i18n.get('processing'));
        
        // Bridge Nativo Rabbit R1
        if (typeof CreationVoiceHandler !== 'undefined') {
            try {
                CreationVoiceHandler.postMessage('stop');
                console.log('CreationVoiceHandler: STOP sent');
            } catch(e) {
                console.error('Error calling CreationVoiceHandler stop:', e);
            }
        }
    }

    // --- Hardware & UI Events ---
    window.addEventListener('sideClick', () => {
        console.log('Hardware Event: sideClick - Exiting to home');
        if (typeof closeWebView !== 'undefined') {
            try {
                closeWebView.postMessage("");
            } catch(e) {
                console.error("Error closing webview:", e);
            }
        }
    });

    settingsBtn.addEventListener('click', () => {
        console.log('UI Event: Settings button clicked');
        // Non cancelliamo la config, permettiamo solo di sovrascriverla scansionando un nuovo QR
        homeyNameInput.value = Config.homeyName;
        showScreen('setupScreen');
    });

    backToChatBtn.addEventListener('click', async () => {
        console.log('UI Event: Back to Chat button clicked');
        
        const newName = homeyNameInput.value.trim() || 'Homey Control';
        if (newName !== Config.homeyName && Config.isConfigured) {
            console.log('UI Event: Homey name updated to:', newName);
            await Config.save(Config.homeyIp, Config.token, newName);
            headerTitle.textContent = Config.homeyName;
        }

        showScreen('mainScreen');
    });

    window.addEventListener('longPressStart', () => {
        console.log('Hardware Event: longPressStart');
        startListening();
    });

    window.addEventListener('longPressEnd', () => {
        console.log('Hardware Event: longPressEnd');
        stopListening();
    });

    // --- Core Logic ---
    function generateUUID() { // Simple UUID generator
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async function sendCommandAndPoll(text) {
        const requestId = generateUUID();

        try {
            let baseUrl = Config.homeyIp;
            if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
            
            const apiUrl = `${baseUrl}/api/app/com.dimapp.rabbitr1/command`;
            
            console.log(`Sending command to API: ${apiUrl}`);
            setStatus('processing', i18n.get('status_waiting_homey'));
            showLoading();

            const payload = {
                command: text,
                token: Config.token,
                requestId: requestId
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            hideLoading();

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.response) {
                setStatus('ready', i18n.get('status_completed'));
                appendResponse(data.response);
                TTS.speak(data.response);
            } else if (data.status === 'timeout') {
                setStatus('error', i18n.get('status_timeout'));
                appendResponse(i18n.get('error_no_response'), true);
            } else if (data.status === 'error') {
                setStatus('error', i18n.get('status_error_api'));
                appendResponse(data.error || i18n.get('status_error_unknown'), true);
            } else {
                setStatus('error', i18n.get('status_error_unknown'));
                appendResponse(i18n.get('error_anomalous'), true);
            }

        } catch (error) {
            hideLoading();
            console.error("API error:", error.message || error);
            setStatus('error', i18n.get('status_error_api'));
            appendResponse(i18n.get('error_no_comm'), true);
        }
    }
});
