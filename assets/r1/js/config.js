const Config = {
    homeyIp: '',
    token: '',
    homeyName: 'Homey Control',
    isConfigured: false,

    async _waitForStorage(timeout = 2000) {
        const start = Date.now();
        while (!window.creationStorage && Date.now() - start < timeout) {
            await new Promise(r => setTimeout(r, 100));
        }
        return !!window.creationStorage;
    },

    async load() {
        try {
            await this._waitForStorage();
            if (window.creationStorage && window.creationStorage.plain) {
                const stored = await window.creationStorage.plain.getItem('homey_config');
                console.log('Config: Storage found, data:', stored ? 'EXISTS' : 'EMPTY');
                if (stored) {
                    const data = JSON.parse(atob(stored));
                    this.homeyIp = data.homeyIp || '';
                    this.token = data.token || '';
                    this.homeyName = data.homeyName || 'Homey Control';
                    this.isConfigured = !!(this.homeyIp && this.token);
                    
                    console.log('Config: Data RESTORED from memory:', {
                        homeyIp: this.homeyIp,
                        homeyName: this.homeyName,
                        token: this.token.substring(0, 6) + '...'
                    });
                }
            } else {
                console.warn('Config: creationStorage not available after timeout');
            }
        } catch (e) {
            console.error('Config: Error loading:', e);
        }
    },

    async save(homeyIp, token, homeyName) {
        this.homeyIp = homeyIp;
        this.token = token;
        this.homeyName = homeyName || 'Homey Control';
        this.isConfigured = !!(homeyIp && token);
        
        try {
            if (window.creationStorage && window.creationStorage.plain) {
                const data = { homeyIp, token, homeyName: this.homeyName };
                console.log('Config: Saving to creationStorage...', {
                    homeyIp: homeyIp,
                    homeyName: this.homeyName,
                    token: token.substring(0, 4) + '...'
                });
                await window.creationStorage.plain.setItem('homey_config', btoa(JSON.stringify(data)));
                console.log('Config: Save COMPLETED');
            } else {
                console.warn('Config: Cannot save, creationStorage not available');
            }
        } catch (e) {
            console.error('Config: Error saving:', e);
        }
    }
};
