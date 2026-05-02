const TTS = {
    speak(text) {
        console.log("TTS speaking:", text);
        if (typeof PluginMessageHandler !== 'undefined') {
            PluginMessageHandler.postMessage(JSON.stringify({
                message: text,
                useLLM: false,
                wantsR1Response: true
            }));
        } else {
            console.log("PluginMessageHandler non disponibile. Mock TTS: ", text);
        }
    }
};
