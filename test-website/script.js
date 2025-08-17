import * as TTS from "@realtimex/piper-tts-web";

class PiperTTSTestSuite {
    constructor() {
        this.session = null;
        this.metrics = {
            modelLoadTime: 0,
            synthesisTime: 0,
            audioDuration: 0,
            totalTime: 0
        };
        this.elements = {};
        this.initElements();
        this.setupEventListeners();
    }

    initElements() {
        this.elements = {
            textInput: document.getElementById('textInput'),
            voiceSelect: document.getElementById('voiceSelect'),
            allowLocalModels: document.getElementById('allowLocalModels'),
            fallbackStrategy: document.getElementById('fallbackStrategy'),
            enableLogging: document.getElementById('enableLogging'),
            audioPlayer: document.getElementById('audioPlayer'),
            audioInfo: document.getElementById('audioInfo'),
            logsContainer: document.getElementById('logsContainer'),
            libraryStatus: document.getElementById('libraryStatus'),
            sessionStatus: document.getElementById('sessionStatus'),
            modelStatus: document.getElementById('modelStatus'),
            audioStatus: document.getElementById('audioStatus'),
            modelLoadTime: document.getElementById('modelLoadTime'),
            synthesisTime: document.getElementById('synthesisTime'),
            audioDuration: document.getElementById('audioDuration'),
            totalTime: document.getElementById('totalTime'),
            testBasicTTS: document.getElementById('testBasicTTS'),
            testSessionTTS: document.getElementById('testSessionTTS'),
            downloadModel: document.getElementById('downloadModel'),
            clearCache: document.getElementById('clearCache'),
            testOffline: document.getElementById('testOffline'),
            clearLogs: document.getElementById('clearLogs')
        };
    }

    setupEventListeners() {
        this.elements.testBasicTTS.addEventListener('click', () => this.testBasicTTS());
        this.elements.testSessionTTS.addEventListener('click', () => this.testSessionTTS());
        this.elements.downloadModel.addEventListener('click', () => this.downloadModel());
        this.elements.clearCache.addEventListener('click', () => this.clearCache());
        this.elements.testOffline.addEventListener('click', () => this.testOfflineMode());
        this.elements.clearLogs.addEventListener('click', () => this.clearLogs());
        this.elements.voiceSelect.addEventListener('change', () => this.onConfigChange());
        this.elements.allowLocalModels.addEventListener('change', () => this.onConfigChange());
        this.elements.fallbackStrategy.addEventListener('change', () => this.onConfigChange());
    }

    onConfigChange() {
        this.log('info', 'Configuration changed - session will be recreated on next synthesis');
        this.updateSessionStatus('config-changed');
        this.session = null;
    }

    async init() {
        this.log('info', '🚀 Initializing Piper TTS Test Suite...');
        this.updateLibraryStatus('loading');
        
        try {
            if (typeof TTS === 'undefined') {
                throw new Error('TTS library not loaded');
            }
            
            this.populateVoiceSelect();
            this.updateLibraryStatus('ready');
            this.log('success', '✅ Library loaded successfully');
        } catch (error) {
            this.updateLibraryStatus('error');
            this.log('error', `❌ Failed to initialize: ${error.message}`);
        }
    }

    populateVoiceSelect() {
        const voiceSelect = this.elements.voiceSelect;
        voiceSelect.innerHTML = '';
        
        const voicesByLanguage = {
            'English (US)': ['en_US-lessac-medium', 'en_US-ryan-medium', 'en_US-amy-medium', 'en_US-libritts-high', 'en_US-ljspeech-medium', 'en_US-bryce-medium', 'en_US-john-medium', 'en_US-norman-medium'],
            'English (GB)': ['en_GB-alan-medium', 'en_GB-cori-medium', 'en_GB-alba-medium', 'en_GB-jenny_dioco-medium'],
            'German': ['de_DE-thorsten-medium', 'de_DE-thorsten-high', 'de_DE-thorsten_emotional-medium', 'de_DE-mls-medium'],
            'French': ['fr_FR-siwis-medium', 'fr_FR-mls-medium', 'fr_FR-tom-medium', 'fr_FR-upmc-medium'],
            'Spanish (ES)': ['es_ES-davefx-medium', 'es_ES-sharvard-medium', 'es_ES-mls_10246-low'],
            'Spanish (MX)': ['es_MX-ald-medium', 'es_MX-claude-high'],
            'Italian': ['it_IT-riccardo-x_low', 'it_IT-paola-medium'],
            'Chinese': ['zh_CN-huayan-medium', 'zh_CN-huayan-x_low'],
            'Russian': ['ru_RU-denis-medium', 'ru_RU-dmitri-medium', 'ru_RU-irina-medium', 'ru_RU-ruslan-medium'],
            'Arabic': ['ar_JO-kareem-medium', 'ar_JO-kareem-low'],
            'Other Languages': ['ca_ES-upc_ona-medium', 'cs_CZ-jirka-medium', 'da_DK-talesyntese-medium', 'el_GR-rapunzelina-low', 'fa_IR-amir-medium', 'fi_FI-harri-medium', 'hu_HU-anna-medium', 'is_IS-bui-medium', 'ka_GE-natia-medium', 'kk_KZ-issai-high', 'lb_LU-marylux-medium', 'ne_NP-google-medium', 'nl_NL-mls-medium', 'no_NO-talesyntese-medium', 'pl_PL-darkman-medium', 'pt_BR-faber-medium', 'pt_PT-tugão-medium', 'ro_RO-mihai-medium', 'sk_SK-lili-medium', 'sl_SI-artur-medium', 'sr_RS-serbski_institut-medium', 'sv_SE-nst-medium', 'sw_CD-lanfrica-medium', 'tr_TR-dfki-medium', 'uk_UA-ukrainian_tts-medium', 'vi_VN-vais1000-medium', 'cy_GB-gwryw_gogleddol-medium']
        };
        
        Object.entries(voicesByLanguage).forEach(([language, voices]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = language;
            
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice;
                option.textContent = voice;
                optgroup.appendChild(option);
            });
            
            voiceSelect.appendChild(optgroup);
        });
        
        this.log('info', `📋 Loaded ${Object.values(voicesByLanguage).flat().length} voice models`);
    }

    async testBasicTTS() {
        const startTime = performance.now();
        this.log('info', '🎵 Starting Basic TTS test...');
        
        try {
            this.updateAudioStatus('loading');
            const text = this.elements.textInput.value.trim();
            if (!text) {
                throw new Error('Please enter some text to synthesize');
            }

            const voiceId = this.elements.voiceSelect.value;
            this.log('info', `Using voice: ${voiceId}`);

            const synthesisStart = performance.now();
            const wav = await TTS.predict({
                text: text,
                voiceId: voiceId,
                logger: this.elements.enableLogging.checked ? (msg) => this.log('debug', msg) : null
            });
            const synthesisEnd = performance.now();

            this.metrics.synthesisTime = synthesisEnd - synthesisStart;
            this.metrics.totalTime = performance.now() - startTime;

            await this.playAudio(wav);
            this.updateMetrics();
            this.updateAudioStatus('ready');
            this.log('success', '✅ Basic TTS completed successfully');

        } catch (error) {
            this.updateAudioStatus('error');
            this.log('error', `❌ Basic TTS failed: ${error.message}`);
        }
    }

    async testSessionTTS() {
        this.log('info', '⚙️ Starting Session TTS test...');
        
        try {
            this.updateSessionStatus('loading');
            
            const text = this.elements.textInput.value.trim();
            if (!text) {
                throw new Error('Please enter some text to synthesize');
            }

            if (!this.session) {
                await this.createSession();
            }
            
            const synthesisStart = performance.now();
            const wav = await this.session.predict(text);
            const synthesisEnd = performance.now();
            
            this.metrics.synthesisTime = synthesisEnd - synthesisStart;
            this.metrics.totalTime = this.metrics.modelLoadTime + this.metrics.synthesisTime;
            
            await this.playAudio(wav);
            this.updateMetrics();
            this.updateSessionStatus('ready');
            this.log('success', '✅ Session TTS completed successfully');
            
        } catch (error) {
            this.updateSessionStatus('error');
            this.log('error', `❌ Session TTS failed: ${error.message}`);
        }
    }

    async createSession() {
        const sessionStart = performance.now();
        this.log('info', '🔧 Creating TTS session...');
        
        try {
            const voiceId = this.elements.voiceSelect.value;
            const allowLocalModels = this.elements.allowLocalModels.checked;
            const fallbackStrategy = this.elements.fallbackStrategy.value;
            
            this.log('info', `Configuration: voice=${voiceId}, allowLocal=${allowLocalModels}, fallback=${fallbackStrategy}`);
            
            this.session = new TTS.TtsSession({
                voiceId: voiceId,
                logger: this.elements.enableLogging.checked ? (msg) => this.log('debug', msg) : null,
                progress: (progress) => {
                    this.log('info', `Loading progress: ${Math.round(progress * 100)}%`);
                }
            });
            
            await this.session.init(allowLocalModels, fallbackStrategy);
            
            const sessionEnd = performance.now();
            this.metrics.modelLoadTime = sessionEnd - sessionStart;
            
            this.log('success', `✅ Session created in ${this.metrics.modelLoadTime.toFixed(0)}ms`);
            this.updateSessionStatus('ready');
            
        } catch (error) {
            this.updateSessionStatus('error');
            throw error;
        }
    }

    async downloadModel() {
        this.log('info', '📥 Starting model download test...');
        this.updateModelStatus('downloading');
        
        try {
            await this.createSession();
            this.updateModelStatus('cached');
            this.log('success', '✅ Model download completed');
        } catch (error) {
            this.updateModelStatus('error');
            this.log('error', `❌ Model download failed: ${error.message}`);
        }
    }

    async clearCache() {
        this.log('info', '🗑️ Clearing cache...');
        
        try {
            this.session = null;
            this.updateSessionStatus('cleared');
            
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                this.log('info', `Cleared ${cacheNames.length} cache(s)`);
            }
            
            this.metrics = {
                modelLoadTime: 0,
                synthesisTime: 0,
                audioDuration: 0,
                totalTime: 0
            };
            this.updateMetrics();
            this.updateModelStatus('cleared');
            
            this.log('success', '✅ Cache cleared successfully');
            
        } catch (error) {
            this.log('error', `❌ Failed to clear cache: ${error.message}`);
        }
    }

    async testOfflineMode() {
        this.log('info', '🔌 Testing offline mode...');
        
        try {
            const originalStrategy = this.elements.fallbackStrategy.value;
            this.elements.fallbackStrategy.value = 'local';
            
            this.log('info', 'Switched to local-only mode');
            this.session = null;
            
            await this.testSessionTTS();
            
            this.elements.fallbackStrategy.value = originalStrategy;
            this.log('info', `Restored fallback strategy to: ${originalStrategy}`);
            
        } catch (error) {
            this.log('error', `❌ Offline mode test failed: ${error.message}`);
        }
    }

    async playAudio(audioBlob) {
        return new Promise((resolve, reject) => {
            try {
                const audioUrl = URL.createObjectURL(audioBlob);
                this.elements.audioPlayer.src = audioUrl;
                
                this.elements.audioPlayer.onloadedmetadata = () => {
                    const duration = this.elements.audioPlayer.duration;
                    this.metrics.audioDuration = duration;
                    this.elements.audioInfo.textContent = 
                        `Audio generated: ${duration.toFixed(2)}s, ${(audioBlob.size / 1024).toFixed(1)}KB`;
                    resolve();
                };
                
                this.elements.audioPlayer.onerror = () => {
                    reject(new Error('Failed to load generated audio'));
                };
                
                this.elements.audioPlayer.play().catch(e => {
                    this.log('warning', 'Auto-play blocked by browser - click play button manually');
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }

    updateMetrics() {
        this.elements.modelLoadTime.textContent = 
            this.metrics.modelLoadTime > 0 ? `${this.metrics.modelLoadTime.toFixed(0)}ms` : '-';
        this.elements.synthesisTime.textContent = 
            this.metrics.synthesisTime > 0 ? `${this.metrics.synthesisTime.toFixed(0)}ms` : '-';
        this.elements.audioDuration.textContent = 
            this.metrics.audioDuration > 0 ? `${this.metrics.audioDuration.toFixed(2)}s` : '-';
        this.elements.totalTime.textContent = 
            this.metrics.totalTime > 0 ? `${this.metrics.totalTime.toFixed(0)}ms` : '-';
    }

    updateLibraryStatus(status) {
        const statusMap = {
            'loading': { text: 'Loading...', class: 'loading' },
            'ready': { text: 'Ready ✅', class: 'success' },
            'error': { text: 'Error ❌', class: 'error' }
        };
        
        const statusInfo = statusMap[status] || { text: status, class: '' };
        this.elements.libraryStatus.textContent = statusInfo.text;
        this.elements.libraryStatus.className = `status-indicator ${statusInfo.class}`;
    }

    updateSessionStatus(status) {
        const statusMap = {
            'loading': { text: 'Loading...', class: 'loading' },
            'ready': { text: 'Ready ✅', class: 'success' },
            'error': { text: 'Error ❌', class: 'error' },
            'config-changed': { text: 'Config Changed ⚠️', class: 'warning' },
            'cleared': { text: 'Cleared 🗑️', class: 'info' }
        };
        
        const statusInfo = statusMap[status] || { text: status, class: '' };
        this.elements.sessionStatus.textContent = statusInfo.text;
        this.elements.sessionStatus.className = `status-indicator ${statusInfo.class}`;
    }

    updateModelStatus(status) {
        const statusMap = {
            'downloading': { text: 'Downloading...', class: 'loading' },
            'cached': { text: 'Cached ✅', class: 'success' },
            'error': { text: 'Error ❌', class: 'error' },
            'cleared': { text: 'Cleared 🗑️', class: 'info' }
        };
        
        const statusInfo = statusMap[status] || { text: status, class: '' };
        this.elements.modelStatus.textContent = statusInfo.text;
        this.elements.modelStatus.className = `status-indicator ${statusInfo.class}`;
    }

    updateAudioStatus(status) {
        const statusMap = {
            'loading': { text: 'Generating...', class: 'loading' },
            'ready': { text: 'Ready ✅', class: 'success' },
            'error': { text: 'Error ❌', class: 'error' }
        };
        
        const statusInfo = statusMap[status] || { text: status, class: '' };
        this.elements.audioStatus.textContent = statusInfo.text;
        this.elements.audioStatus.className = `status-indicator ${statusInfo.class}`;
    }

    log(level, message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${level}`;
        
        const levelEmoji = {
            'info': 'ℹ️',
            'success': '✅', 
            'error': '❌',
            'debug': '🔍',
            'warning': '⚠️'
        };
        
        logEntry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span class="log-level">${levelEmoji[level] || '📝'}</span>
            <span class="log-message">${message}</span>
        `;
        
        if (this.elements.logsContainer) {
            this.elements.logsContainer.appendChild(logEntry);
            this.elements.logsContainer.scrollTop = this.elements.logsContainer.scrollHeight;
        } else {
            console.log(`[${level.toUpperCase()}] ${message}`);
        }
    }

    clearLogs() {
        this.elements.logsContainer.innerHTML = '';
        this.log('info', '🧹 Logs cleared');
    }
}

// Initialize the test suite when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM loaded, initializing test suite...');
        const testSuite = new PiperTTSTestSuite();
        console.log('Test suite created, calling init...');
        await testSuite.init();
        console.log('Test suite initialized successfully');
        
        // Make testSuite globally available for debugging
        window.testSuite = testSuite;
    } catch (error) {
        console.error('Failed to initialize test suite:', error);
        document.body.innerHTML = `
            <div style="padding: 20px; color: red; font-family: monospace;">
                <h2>Initialization Error</h2>
                <p>Failed to initialize test suite: ${error.message}</p>
                <pre>${error.stack}</pre>
            </div>
        `;
    }
});
