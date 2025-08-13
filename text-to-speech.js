/**
 * Text-to-Speech Module - js/text-to-speech.js
 * Handles speech synthesis using ResponsiveVoice.js with automatic role switching
 */

class TextToSpeech {
    constructor() {
        this.isInitialized = false;
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.voiceSettings = {};
        this.callbacks = {};
        this.fallbackToWebSpeech = false;
        this.maxTextLength = 1000; // ResponsiveVoice character limit per request
        
        // Initialize when ResponsiveVoice is ready
        this.initialize();
    }

    /**
     * Initialize ResponsiveVoice and load configuration
     */
    async initialize() {
        try {
            // Wait for ResponsiveVoice to be available
            await this.waitForResponsiveVoice();
            
            // Load voice configurations
            this.loadConfig();
            
            // Test ResponsiveVoice availability
            await this.testResponsiveVoice();
            
            this.isInitialized = true;
            console.log('TextToSpeech: ResponsiveVoice initialized successfully');
            
        } catch (error) {
            console.warn('TextToSpeech: ResponsiveVoice not available, falling back to Web Speech API', error);
            this.fallbackToWebSpeech = true;
            this.initializeWebSpeechAPI();
        }
    }

    /**
     * Wait for ResponsiveVoice to be loaded
     * @returns {Promise} Resolves when ResponsiveVoice is ready
     */
    waitForResponsiveVoice() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 10 seconds max wait
            
            const checkResponsiveVoice = () => {
                if (typeof responsiveVoice !== 'undefined' && responsiveVoice.voiceSupport) {
                    // Wait for voices to be loaded
                    if (responsiveVoice.getVoices().length > 0) {
                        resolve();
                    } else {
                        // Wait a bit more for voices to load
                        setTimeout(() => {
                            if (responsiveVoice.getVoices().length > 0) {
                                resolve();
                            } else if (attempts < maxAttempts) {
                                attempts++;
                                setTimeout(checkResponsiveVoice, 200);
                            } else {
                                reject(new Error('ResponsiveVoice voices not loaded'));
                            }
                        }, 500);
                    }
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkResponsiveVoice, 200);
                } else {
                    reject(new Error('ResponsiveVoice not available'));
                }
            };
            
            checkResponsiveVoice();
        });
    }

    /**
     * Test ResponsiveVoice functionality
     * @returns {Promise} Resolves if test passes
     */
    testResponsiveVoice() {
        return new Promise((resolve, reject) => {
            try {
                // Test with a silent utterance
                responsiveVoice.speak('', 'UK English Female', {
                    volume: 0,
                    rate: 1,
                    pitch: 1,
                    onstart: () => {
                        responsiveVoice.cancel();
                        resolve();
                    },
                    onerror: (error) => {
                        reject(error);
                    }
                });
                
                // Fallback timeout
                setTimeout(() => {
                    responsiveVoice.cancel();
                    resolve(); // Assume it works if no error
                }, 1000);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Initialize Web Speech API as fallback
     */
    initializeWebSpeechAPI() {
        if ('speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.isInitialized = true;
            console.log('TextToSpeech: Web Speech API initialized as fallback');
            
            // Load available voices
            this.loadWebSpeechVoices();
        } else {
            console.error('TextToSpeech: Neither ResponsiveVoice nor Web Speech API available');
        }
    }

    /**
     * Load Web Speech API voices
     */
    loadWebSpeechVoices() {
        const loadVoices = () => {
            this.webSpeechVoices = this.synth.getVoices();
            console.log('Web Speech voices loaded:', this.webSpeechVoices.length);
        };

        loadVoices();
        
        // Chrome loads voices asynchronously
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoices;
        }
    }

    /**
     * Load voice configuration from config.js
     */
    loadConfig() {
        if (typeof window !== 'undefined' && window.CONFIG) {
            this.voiceSettings = {
                rate: window.CONFIG.TTS_SETTINGS?.rate || 1.0,
                pitch: window.CONFIG.TTS_SETTINGS?.pitch || 1.0,
                volume: window.CONFIG.TTS_SETTINGS?.volume || 1.0,
                voices: window.CONFIG.VOICE_MAPPING || this.getDefaultVoiceMapping()
            };
        } else {
            this.voiceSettings = {
                rate: 1.0,
                pitch: 1.0,
                volume: 1.0,
                voices: this.getDefaultVoiceMapping()
            };
        }
    }

    /**
     * Get default voice mapping for different languages
     * @returns {Object} Default voice mapping
     */
    getDefaultVoiceMapping() {
        return {
            'en': 'UK English Female',
            'hi': 'Hindi Female',
            'ta': 'Tamil Female',
            'te': 'Telugu Female',
            'bn': 'Bengali Female',
            'gu': 'Gujarati Female',
            'kn': 'Kannada Female',
            'ml': 'Malayalam Female',
            'mr': 'Marathi Female',
            'or': 'Odia Female',
            'pa': 'Punjabi Female',
            'as': 'Assamese Female',
            'ur': 'Urdu Female'
        };
    }

    /**
     * Get voice name for language code
     * @param {string} languageCode - Language code
     * @returns {string} Voice name
     */
    getVoiceForLanguage(languageCode) {
        return this.voiceSettings.voices[languageCode] || this.voiceSettings.voices['en'];
    }

    /**
     * Get Web Speech API voice for language
     * @param {string} languageCode - Language code
     * @returns {SpeechSynthesisVoice|null} Voice object
     */
    getWebSpeechVoice(languageCode) {
        if (!this.webSpeechVoices) return null;
        
        const langMap = {
            'hi': 'hi-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'bn': 'bn-IN',
            'gu': 'gu-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
            'mr': 'mr-IN',
            'pa': 'pa-IN',
            'ur': 'ur-PK',
            'en': 'en-US'
        };
        
        const targetLang = langMap[languageCode] || 'en-US';
        
        return this.webSpeechVoices.find(voice => 
            voice.lang.startsWith(targetLang.split('-')[0]) || 
            voice.lang === targetLang
        ) || this.webSpeechVoices.find(voice => voice.lang.startsWith('en'));
    }

    /**
     * Split long text into manageable chunks
     * @param {string} text - Text to split
     * @returns {Array<string>} Text chunks
     */
    splitTextIntoChunks(text) {
        if (text.length <= this.maxTextLength) {
            return [text];
        }
        
        const chunks = [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        let currentChunk = '';
        
        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            if (!trimmedSentence) continue;
            
            const sentenceWithPunctuation = trimmedSentence + '.';
            
            if (currentChunk.length + sentenceWithPunctuation.length <= this.maxTextLength) {
                currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk);
                }
                
                if (sentenceWithPunctuation.length > this.maxTextLength) {
                    // Split very long sentences by words
                    const words = sentenceWithPunctuation.split(' ');
                    let wordChunk = '';
                    
                    for (const word of words) {
                        if (wordChunk.length + word.length + 1 <= this.maxTextLength) {
                            wordChunk += (wordChunk ? ' ' : '') + word;
                        } else {
                            if (wordChunk) chunks.push(wordChunk);
                            wordChunk = word;
                        }
                    }
                    
                    if (wordChunk) chunks.push(wordChunk);
                    currentChunk = '';
                } else {
                    currentChunk = sentenceWithPunctuation;
                }
            }
        }
        
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        
        return chunks.length > 0 ? chunks : [text];
    }

    /**
     * Speak text using ResponsiveVoice
     * @param {string} text - Text to speak
     * @param {string} languageCode - Language code
     * @param {Object} options - Speech options
     * @returns {Promise} Resolves when speech completes
     */
    async speakWithResponsiveVoice(text, languageCode, options = {}) {
        return new Promise((resolve, reject) => {
            const voice = this.getVoiceForLanguage(languageCode);
            const chunks = this.splitTextIntoChunks(text);
            let currentChunkIndex = 0;
            
            const speakNextChunk = () => {
                if (currentChunkIndex >= chunks.length) {
                    this.isSpeaking = false;
                    resolve();
                    return;
                }
                
                const chunk = chunks[currentChunkIndex];
                currentChunkIndex++;
                
                const speechOptions = {
                    rate: options.rate || this.voiceSettings.rate,
                    pitch: options.pitch || this.voiceSettings.pitch,
                    volume: options.volume || this.voiceSettings.volume,
                    onstart: () => {
                        this.isSpeaking = true;
                        if (currentChunkIndex === 1 && options.onStart) {
                            options.onStart();
                        }
                    },
                    onend: () => {
                        if (currentChunkIndex >= chunks.length) {
                            this.isSpeaking = false;
                            if (options.onEnd) {
                                options.onEnd();
                            }
                            resolve();
                        } else {
                            // Small delay between chunks
                            setTimeout(speakNextChunk, 100);
                        }
                    },
                    onerror: (error) => {
                        this.isSpeaking = false;
                        if (options.onError) {
                            options.onError(error);
                        }
                        reject(error);
                    }
                };
                
                try {
                    responsiveVoice.speak(chunk, voice, speechOptions);
                } catch (error) {
                    this.isSpeaking = false;
                    reject(error);
                }
            };
            
            speakNextChunk();
        });
    }

    /**
     * Speak text using Web Speech API
     * @param {string} text - Text to speak
     * @param {string} languageCode - Language code
     * @param {Object} options - Speech options
     * @returns {Promise} Resolves when speech completes
     */
    async speakWithWebSpeech(text, languageCode, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.synth) {
                reject(new Error('Web Speech API not available'));
                return;
            }
            
            const utterance = new SpeechSynthesisUtterance(text);
            const voice = this.getWebSpeechVoice(languageCode);
            
            if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang;
            }
            
            utterance.rate = options.rate || this.voiceSettings.rate;
            utterance.pitch = options.pitch || this.voiceSettings.pitch;
            utterance.volume = options.volume || this.voiceSettings.volume;
            
            utterance.onstart = () => {
                this.isSpeaking = true;
                this.currentUtterance = utterance;
                if (options.onStart) {
                    options.onStart();
                }
            };
            
            utterance.onend = () => {
                this.isSpeaking = false;
                this.currentUtterance = null;
                if (options.onEnd) {
                    options.onEnd();
                }
                resolve();
            };
            
            utterance.onerror = (error) => {
                this.isSpeaking = false;
                this.currentUtterance = null;
                if (options.onError) {
                    options.onError(error);
                }
                reject(error);
            };
            
            this.synth.speak(utterance);
        });
    }

    /**
     * Main speak method with automatic role switching
     * @param {string} text - Text to speak
     * @param {string} languageCode - Language code
     * @param {Object} options - Speech options and callbacks
     * @returns {Promise} Resolves when speech completes and role switches
     */
    async speak(text, languageCode, options = {}) {
        if (!this.isInitialized) {
            throw new Error('TextToSpeech not initialized');
        }
        
        if (!text || text.trim().length === 0) {
            throw new Error('Empty text provided');
        }
        
        // Stop any current speech
        this.stop();
        
        try {
            const enhancedOptions = {
                ...options,
                onStart: () => {
                    // Notify that speech started
                    if (options.onStart) options.onStart();
                    this.triggerEvent('speechStart', { text, languageCode });
                },
                onEnd: () => {
                    // Trigger role switching after speech completes
                    if (options.onEnd) options.onEnd();
                    this.triggerEvent('speechEnd', { text, languageCode });
                    
                    // Automatic role switching with delay
                    setTimeout(() => {
                        this.triggerEvent('roleSwitchReady', { 
                            previousLanguage: languageCode,
                            text: text 
                        });
                    }, options.roleSwitchDelay || 500);
                },
                onError: (error) => {
                    if (options.onError) options.onError(error);
                    this.triggerEvent('speechError', { error, text, languageCode });
                }
            };
            
            if (this.fallbackToWebSpeech) {
                await this.speakWithWebSpeech(text, languageCode, enhancedOptions);
            } else {
                await this.speakWithResponsiveVoice(text, languageCode, enhancedOptions);
            }
            
        } catch (error) {
            console.error('TTS Error:', error);
            throw error;
        }
    }

    /**
     * Stop current speech
     */
    stop() {
        if (this.isSpeaking) {
            if (this.fallbackToWebSpeech && this.synth) {
                this.synth.cancel();
                this.currentUtterance = null;
            } else if (typeof responsiveVoice !== 'undefined') {
                responsiveVoice.cancel();
            }
            
            this.isSpeaking = false;
            this.triggerEvent('speechStopped');
        }
    }

    /**
     * Pause current speech
     */
    pause() {
        if (this.isSpeaking) {
            if (this.fallbackToWebSpeech && this.synth) {
                this.synth.pause();
            } else if (typeof responsiveVoice !== 'undefined') {
                responsiveVoice.pause();
            }
            
            this.triggerEvent('speechPaused');
        }
    }

    /**
     * Resume paused speech
     */
    resume() {
        if (this.fallbackToWebSpeech && this.synth && this.synth.paused) {
            this.synth.resume();
        } else if (typeof responsiveVoice !== 'undefined') {
            responsiveVoice.resume();
        }
        
        this.triggerEvent('speechResumed');
    }

    /**
     * Check if currently speaking
     * @returns {boolean} True if speaking
     */
    isSpeechActive() {
        return this.isSpeaking;
    }

    /**
     * Get available voices
     * @returns {Array} List of available voices
     */
    getAvailableVoices() {
        if (this.fallbackToWebSpeech) {
            return this.webSpeechVoices || [];
        } else if (typeof responsiveVoice !== 'undefined') {
            return responsiveVoice.getVoices();
        }
        return [];
    }

    /**
     * Set voice settings
     * @param {Object} settings - Voice settings (rate, pitch, volume)
     */
    setVoiceSettings(settings) {
        this.voiceSettings = { ...this.voiceSettings, ...settings };
    }

    /**
     * Register event callback
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    /**
     * Unregister event callback
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Trigger event to registered callbacks
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    triggerEvent(event, data = null) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in TTS event callback for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get initialization status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isSpeaking: this.isSpeaking,
            fallbackToWebSpeech: this.fallbackToWebSpeech,
            voiceCount: this.getAvailableVoices().length,
            currentVoiceSettings: this.voiceSettings
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TextToSpeech = TextToSpeech;
}