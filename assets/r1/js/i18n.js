const translations = {
    it: {
        welcome: "In attesa del tuo comando...",
        setup_title: "Configurazione",
        setup_desc: "Configura il tuo Rabbit R1.",
        homey_name_placeholder: "Nome casa (opzionale)",
        scan_btn: "Scansiona QR Code",
        qr_overlay: "Inquadra il QR Code",
        cancel_scan: "Annulla Scan",
        status_ready: "Pronto. Tieni premuto PTT.",
        status_not_configured: "Non configurato",
        status_processing: "Invio comando...",
        status_waiting_homey: "In attesa di Homey...",
        status_completed: "Completato",
        status_timeout: "Timeout risposta",
        status_error_api: "Errore API",
        status_error_unknown: "Errore sconosciuto",
        error_no_response: "Nessuna risposta da Homey (Timeout).",
        error_no_comm: "Impossibile comunicare con Homey.",
        error_anomalous: "Risposta anomala da Homey.",
        error_no_camera: "Fotocamera non disponibile su questo dispositivo.",
        error_camera_access: "Errore accesso fotocamera.",
        error_invalid_qr: "QR Code non valido per Homey.",
        error_qr_read: "Errore lettura QR Code.",
        listening: "In ascolto...",
        processing: "Elaborazione..."
    },
    en: {
        welcome: "Waiting for your command...",
        setup_title: "Setup",
        setup_desc: "Configure your Rabbit R1.",
        homey_name_placeholder: "Home name (optional)",
        scan_btn: "Scan QR Code",
        qr_overlay: "Scan the QR Code",
        cancel_scan: "Cancel Scan",
        status_ready: "Ready. Hold PTT to talk.",
        status_not_configured: "Not configured",
        status_processing: "Sending command...",
        status_waiting_homey: "Waiting for Homey...",
        status_completed: "Completed",
        status_timeout: "Response timeout",
        status_error_api: "API Error",
        status_error_unknown: "Unknown error",
        error_no_response: "No response from Homey (Timeout).",
        error_no_comm: "Unable to communicate with Homey.",
        error_anomalous: "Anomalous response from Homey.",
        error_no_camera: "Camera not available on this device.",
        error_camera_access: "Camera access error.",
        error_invalid_qr: "Invalid QR Code for Homey.",
        error_qr_read: "Error reading QR Code.",
        listening: "Listening...",
        processing: "Processing..."
    }
};

const i18n = {
    get(key) {
        const lang = (navigator.language || "it").split('-')[0];
        const dic = translations[lang] || translations.en;
        return dic[key] || key;
    },
    
    // Helper per tradurre elementi con attributo data-i18n
    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.get(key);
            
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        });
    }
};
