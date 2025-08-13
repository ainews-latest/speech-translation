/**
 * Configuration file for Speech Translator Application
 * Replace placeholder values with your actual API keys
 */

const CONFIG = {
    // ============================================
    // API KEYS (Replace with your actual keys)
    // ============================================
    API_KEYS: {
        // Get your HuggingFace API key from: https://huggingface.co/settings/tokens
        HUGGINGFACE: 'YOUR_HUGGINGFACE_API_KEY_HERE',
        
        // Get ResponsiveVoice key from: https://responsivevoice.org/
        // Note: ResponsiveVoice has a free tier with limited usage
        RESPONSIVEVOICE: 'YOUR_RESPONSIVEVOICE_API_KEY_HERE'
    },

    // ============================================
    // HUGGINGFACE MODEL CONFIGURATIONS
    // ============================================
    TRANSLATION_MODELS: {
        // IndicTrans2 models for different language pairs
        ENGLISH_TO_INDIC: {
            endpoint: 'https://api-inference.huggingface.co/models/ai4bharat/indictrans2-en-indic-1B',
            model_name: 'ai4bharat/indictrans2-en-indic-1B'
        },
        INDIC_TO_ENGLISH: {
            endpoint: 'https://api-inference.huggingface.co/models/ai4bharat/indictrans2-indic-en-1B',
            model_name: 'ai4bharat/indictrans2-indic-en-1B'
        },
        INDIC_TO_INDIC: {
            endpoint: 'https://api-inference.huggingface.co/models/ai4bharat/indictrans2-indic-indic-1B',
            model_name: 'ai4bharat/indictrans2-indic-indic-1B'
        }
    },

    // ============================================
    // LANGUAGE CONFIGURATIONS
    // ============================================
    LANGUAGES: {
        // Supported languages with their codes and display names
        SUPPORTED: {
            'en': {
                name: 'English',
                nativeName: 'English',
                speechCode: 'en-US',
                ttsVoice: 'US English Female',
                rtl: false
            },
            'hi': {
                name: 'Hindi',
                nativeName: 'हिंदी',
                speechCode: 'hi-IN',
                ttsVoice: 'Hindi Female',
                rtl: false
            },
            'bn': {
                name: 'Bengali',
                nativeName: 'বাংলা',
                speechCode: 'bn-IN',
                ttsVoice: 'Bengali Female',
                rtl: false
            },
            'ta': {
                name: 'Tamil',
                nativeName: 'தமிழ்',
                speechCode: 'ta-IN',
                ttsVoice: 'Tamil Female',
                rtl: false
            },
            'te': {
                name: 'Telugu',
                nativeName: 'తెలుగు',
                speechCode: 'te-IN',
                ttsVoice: 'Telugu Female',
                rtl: false
            },
            'mr': {
                name: 'Marathi',
                nativeName: 'मराठी',
                speechCode: 'mr-IN',
                ttsVoice: 'Marathi Female',
                rtl: false
            },
            'gu': {
                name: 'Gujarati',
                nativeName: 'ગુજરાતી',
                speechCode: 'gu-IN',
                ttsVoice: 'Gujarati Female',
                rtl: false
            },
            'kn': {
                name: 'Kannada',
                nativeName: 'ಕನ್ನಡ',
                speechCode: 'kn-IN',
                ttsVoice: 'Kannada Female',
                rtl: false
            }
        },

        // Default language pair
        DEFAULTS: {
            FROM: 'en',
            TO: 'hi'
        }
    },

    // ============================================
    // AUDIO SETTINGS
    // ============================================
    AUDIO: {
        // Silence detection settings
        SILENCE_DETECTION: {
            threshold: 0.01,           // Audio level below which silence is detected (0-1)
            duration: 3000,            // Duration in milliseconds before triggering translation
            checkInterval: 100         // How often to check audio levels (ms)
        },

        // Audio analysis settings
        ANALYSIS: {
            fftSize: 2048,            // FFT size for frequency analysis
            smoothingTimeConstant: 0.8, // Smoothing for audio analysis
            minDecibels: -90,         // Minimum decibel level
            maxDecibels: -10          // Maximum decibel level
        },

        // Volume visualization
        VISUALIZATION: {
            updateInterval: 50,       // How often to update volume bar (ms)
            smoothing: 0.2           // Smoothing factor for volume display
        }
    },

    // ============================================
    // SPEECH RECOGNITION SETTINGS
    // ============================================
    SPEECH_RECOGNITION: {
        continuous: true,             // Keep listening continuously
        interimResults: true,         // Show interim results while speaking
        maxAlternatives: 1,           // Number of alternative results
        grammars: null,              // Speech grammars (can be extended later)
        
        // Recognition retry settings
        RETRY: {
            maxAttempts: 3,          // Maximum restart attempts
            delay: 1000              // Delay between restart attempts (ms)
        }
    },

    // ============================================
    // TEXT-TO-SPEECH SETTINGS
    // ============================================
    TEXT_TO_SPEECH: {
        // ResponsiveVoice settings
        RESPONSIVEVOICE: {
            rate: 1.0,               // Speech rate (0.1 to 10)
            pitch: 1.0,              // Voice pitch (0 to 2)
            volume: 1.0              // Volume (0 to 1)
        },

        // Browser TTS fallback settings
        BROWSER_TTS: {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            voiceURI: 'native'
        },

        // Backup voices if primary voices are not available
        FALLBACK_VOICES: {
            'hi': ['Hindi Female', 'Hindi Male', 'native'],
            'en': ['US English Female', 'UK English Female', 'native'],
            'default': ['native']
        }
    },

    // ============================================
    // UI SETTINGS
    // ============================================
    UI: {
        // Animation settings
        ANIMATIONS: {
            transitionDuration: 300,  // CSS transition duration (ms)
            pulseInterval: 2000      // Pulse animation interval (ms)
        },

        // Message display settings
        MESSAGES: {
            maxHistoryLength: 100,   // Maximum conversation history
            autoScroll: true,        // Auto-scroll to latest message
            timestamps: true         // Show timestamps on messages
        },

        // Status display settings
        STATUS: {
            autoHideDelay: 5000,     // Auto-hide status messages after (ms)
            showDebugInfo: false     // Show debug information
        }
    },

    // ============================================
    // APPLICATION SETTINGS
    // ============================================
    APP: {
        // Version info
        VERSION: '1.0.0',
        NAME: 'Real-time Speech Translator',
        
        // Debug mode
        DEBUG: false,                // Enable debug logging
        
        // Feature flags
        FEATURES: {
            advancedSettings: true,   // Show advanced settings panel
            conversationExport: true, // Allow exporting conversation
            offlineMode: false       // Offline translation (future feature)
        },

        // Performance settings
        PERFORMANCE: {
            translationTimeout: 30000, // Translation request timeout (ms)
            maxConcurrentRequests: 1, // Max simultaneous translation requests
            cacheTranslations: true   // Cache translation results
        }
    },

    // ============================================
    // ERROR MESSAGES
    // ============================================
    ERRORS: {
        SPEECH_NOT_SUPPORTED: 'Speech Recognition is not supported in this browser. Please use Chrome or Edge.',
        MICROPHONE_ACCESS_DENIED: 'Microphone access was denied. Please allow microphone access and refresh the page.',
        TRANSLATION_FAILED: 'Translation failed. Please check your internet connection and API key.',
        TTS_FAILED: 'Text-to-speech failed. Please check your browser settings.',
        NETWORK_ERROR: 'Network error. Please check your internet connection.',
        API_KEY_MISSING: 'API key is missing. Please configure your API keys in config.js',
        RATE_LIMITED: 'API rate limit exceeded. Please wait before making more requests.',
        BROWSER_NOT_SUPPORTED: 'This browser is not fully supported. Please use Chrome or Edge for best experience.'
    },

    // ============================================
    // SUCCESS MESSAGES
    // ============================================
    MESSAGES: {
        TRANSLATION_STARTED: 'Translation started. Start speaking...',
        TRANSLATION_STOPPED: 'Translation stopped.',
        LISTENING: 'Listening...',
        PROCESSING: 'Processing translation...',
        SPEAKING: 'Speaking translation...',
        READY: 'Ready to translate',
        SIDE_SWITCHED: 'Switched to other side'
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get language configuration by code
 * @param {string} langCode - Language code (e.g., 'hi', 'en')
 * @returns {Object} Language configuration object
 */
CONFIG.getLanguage = function(langCode) {
    return this.LANGUAGES.SUPPORTED[langCode] || this.LANGUAGES.SUPPORTED['en'];
};

/**
 * Get appropriate translation model based on language pair
 * @param {string} fromLang - Source language code
 * @param {string} toLang - Target language code
 * @returns {Object} Model configuration
 */
CONFIG.getTranslationModel = function(fromLang, toLang) {
    if (fromLang === 'en' && toLang !== 'en') {
        return this.TRANSLATION_MODELS.ENGLISH_TO_INDIC;
    } else if (fromLang !== 'en' && toLang === 'en') {
        return this.TRANSLATION_MODELS.INDIC_TO_ENGLISH;
    } else if (fromLang !== 'en' && toLang !== 'en') {
        return this.TRANSLATION_MODELS.INDIC_TO_INDIC;
    }
    return this.TRANSLATION_MODELS.ENGLISH_TO_INDIC; // Default
};

/**
 * Check if API keys are configured
 * @returns {boolean} True if API keys are set
 */
CONFIG.hasValidApiKeys = function() {
    return this.API_KEYS.HUGGINGFACE && 
           this.API_KEYS.HUGGINGFACE !== 'YOUR_HUGGINGFACE_API_KEY_HERE';
};

/**
 * Get debug configuration
 * @returns {boolean} Debug mode status
 */
CONFIG.isDebugMode = function() {
    return this.APP.DEBUG;
};

// Export CONFIG for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}