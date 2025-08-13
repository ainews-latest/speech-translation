/**
 * Speech Recognition Module
 * Handles Web Speech API for continuous speech recognition
 * Supports language switching and error recovery
 */

class SpeechRecognitionHandler {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isInitialized = false;
        this.currentLanguage = CONFIG.LANGUAGES.DEFAULTS.FROM;
        this.textBuffer = '';
        this.retryCount = 0;
        this.maxRetries = CONFIG.SPEECH_RECOGNITION.RETRY.maxAttempts;
        this.retryDelay = CONFIG.SPEECH_RECOGNITION.RETRY.delay;
        
        // Event callbacks
        this.onTextReceived = null;        // Callback for new text
        this.onStatusChange = null;        // Callback for status updates
        this.onError = null;               // Callback for errors
        this.onListeningStart = null;      // Callback when listening starts
        this.onListeningStop = null;       // Callback when listening stops
        
        this.initialize();
    }

    /**
     * Initialize the speech recognition system
     */
    initialize() {
        if (!this.checkBrowserSupport()) {
            this.handleError(CONFIG.ERRORS.SPEECH_NOT_SUPPORTED);
            return false;
        }

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.setupRecognitionConfig();
            this.setupEventHandlers();
            this.isInitialized = true;
            
            if (CONFIG.isDebugMode()) {
                console.log('Speech Recognition initialized successfully');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize speech recognition:', error);
            this.handleError('Failed to initialize speech recognition');
            return false;
        }
    }

    /**
     * Check if browser supports speech recognition
     */
    checkBrowserSupport() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    /**
     * Configure speech recognition settings
     */
    setupRecognitionConfig() {
        if (!this.recognition) return;

        // Basic configuration
        this.recognition.continuous = CONFIG.SPEECH_RECOGNITION.continuous;
        this.recognition.interimResults = CONFIG.SPEECH_RECOGNITION.interimResults;
        this.recognition.maxAlternatives = CONFIG.SPEECH_RECOGNITION.maxAlternatives;
        
        // Set initial language
        this.setLanguage(this.currentLanguage);
        
        // Set grammars if available
        if (CONFIG.SPEECH_RECOGNITION.grammars) {
            this.recognition.grammars = CONFIG.SPEECH_RECOGNITION.grammars;
        }
    }

    /**
     * Setup event handlers for speech recognition
     */
    setupEventHandlers() {
        if (!this.recognition) return;

        // Recognition started
        this.recognition.onstart = () => {
            this.isListening = true;
            this.retryCount = 0;
            this.textBuffer = '';
            
            if (CONFIG.isDebugMode()) {
                console.log('Speech recognition started');
            }
            
            this.triggerStatusChange('listening', CONFIG.MESSAGES.LISTENING);
            
            if (this.onListeningStart) {
                this.onListeningStart();
            }
        };

        // Speech results received
        this.recognition.onresult = (event) => {
            this.processResults(event);
        };

        // Recognition ended
        this.recognition.onend = () => {
            this.isListening = false;
            
            if (CONFIG.isDebugMode()) {
                console.log('Speech recognition ended');
            }
            
            if (this.onListeningStop) {
                this.onListeningStop();
            }
            
            // Auto-restart if we should still be listening
            if (this.shouldAutoRestart()) {
                this.scheduleRestart();
            }
        };

        // Handle errors
        this.recognition.onerror = (event) => {
            this.handleRecognitionError(event);
        };

        // Audio start/end events
        this.recognition.onaudiostart = () => {
            if (CONFIG.isDebugMode()) {
                console.log('Audio capture started');
            }
        };

        this.recognition.onaudioend = () => {
            if (CONFIG.isDebugMode()) {
                console.log('Audio capture ended');
            }
        };
    }

    /**
     * Process speech recognition results
     */
    processResults(event) {
        let finalText = '';
        let interimText = '';
        
        // Process all results from the current event
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
                finalText += transcript;
            } else {
                interimText += transcript;
            }
        }

        // Add final text to buffer
        if (finalText.trim()) {
            this.textBuffer += finalText;
            
            if (CONFIG.isDebugMode()) {
                console.log('Final text added:', finalText);
                console.log('Current buffer:', this.textBuffer);
            }
            
            // Notify that we have new final text
            if (this.onTextReceived) {
                this.onTextReceived(this.textBuffer, false); // false = not complete yet
            }
        }

        // Show current recognition status with interim results
        const displayText = this.textBuffer + interimText;
        if (displayText.trim()) {
            this.triggerStatusChange('listening', `Listening: "${displayText.trim()}"`);
        }
    }

    /**
     * Handle speech recognition errors
     */
    handleRecognitionError(event) {
        console.error('Speech recognition error:', event.error);
        
        const errorMap = {
            'no-speech': 'No speech detected. Please try speaking again.',
            'audio-capture': 'Audio capture failed. Please check your microphone.',
            'not-allowed': CONFIG.ERRORS.MICROPHONE_ACCESS_DENIED,
            'network': CONFIG.ERRORS.NETWORK_ERROR,
            'service-not-allowed': 'Speech recognition service not allowed.',
            'bad-grammar': 'Grammar error in speech recognition.',
            'language-not-supported': 'Selected language is not supported for speech recognition.'
        };
        
        const errorMessage = errorMap[event.error] || `Speech recognition error: ${event.error}`;
        
        // Don't show error for common, recoverable errors
        if (!['no-speech', 'audio-capture'].includes(event.error)) {
            this.handleError(errorMessage);
        }
        
        // Schedule restart for recoverable errors
        if (this.isRecoverableError(event.error)) {
            this.scheduleRestart();
        } else {
            this.isListening = false;
        }
    }

    /**
     * Check if error is recoverable
     */
    isRecoverableError(errorType) {
        const recoverableErrors = ['no-speech', 'audio-capture', 'network', 'service-not-allowed'];
        return recoverableErrors.includes(errorType);
    }

    /**
     * Determine if recognition should auto-restart
     */
    shouldAutoRestart() {
        return this.isInitialized && 
               !this.isListening && 
               this.retryCount < this.maxRetries;
    }

    /**
     * Schedule a restart of speech recognition
     */
    scheduleRestart() {
        if (this.retryCount >= this.maxRetries) {
            this.handleError('Maximum retry attempts reached. Please restart manually.');
            return;
        }

        this.retryCount++;
        
        if (CONFIG.isDebugMode()) {
            console.log(`Scheduling restart ${this.retryCount}/${this.maxRetries}`);
        }
        
        setTimeout(() => {
            if (this.shouldAutoRestart()) {
                this.start();
            }
        }, this.retryDelay);
    }

    /**
     * Start speech recognition
     */
    start() {
        if (!this.isInitialized) {
            this.handleError('Speech recognition not initialized');
            return false;
        }

        if (this.isListening) {
            if (CONFIG.isDebugMode()) {
                console.log('Speech recognition already running');
            }
            return true;
        }

        try {
            // Clear previous state
            this.textBuffer = '';
            
            // Start recognition
            this.recognition.start();
            
            if (CONFIG.isDebugMode()) {
                console.log('Starting speech recognition with language:', this.currentLanguage);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            this.handleError('Failed to start speech recognition');
            return false;
        }
    }

    /**
     * Stop speech recognition
     */
    stop() {
        if (!this.recognition || !this.isListening) {
            return;
        }

        try {
            this.recognition.stop();
            this.isListening = false;
            this.retryCount = 0;
            
            if (CONFIG.isDebugMode()) {
                console.log('Speech recognition stopped');
            }
            
            this.triggerStatusChange('stopped', 'Recognition stopped');
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    }

    /**
     * Set recognition language
     */
    setLanguage(languageCode) {
        if (!this.recognition) return false;

        const langConfig = CONFIG.getLanguage(languageCode);
        if (!langConfig) {
            this.handleError(`Unsupported language: ${languageCode}`);
            return false;
        }

        this.currentLanguage = languageCode;
        this.recognition.lang = langConfig.speechCode;
        
        if (CONFIG.isDebugMode()) {
            console.log(`Language set to: ${languageCode} (${langConfig.speechCode})`);
        }
        
        return true;
    }

    /**
     * Get current buffered text and clear buffer
     */
    getBufferedText() {
        const text = this.textBuffer.trim();
        this.textBuffer = '';
        return text;
    }

    /**
     * Check if there's text in the buffer
     */
    hasBufferedText() {
        return this.textBuffer.trim().length > 0;
    }

    /**
     * Clear the text buffer
     */
    clearBuffer() {
        this.textBuffer = '';
        
        if (CONFIG.isDebugMode()) {
            console.log('Text buffer cleared');
        }
    }

    /**
     * Force process current buffer (called by silence detection)
     */
    processBuffer() {
        if (!this.hasBufferedText()) {
            return null;
        }

        const text = this.getBufferedText();
        
        if (CONFIG.isDebugMode()) {
            console.log('Processing buffered text:', text);
        }
        
        // Notify that we have complete text ready for translation
        if (this.onTextReceived) {
            this.onTextReceived(text, true); // true = complete and ready for translation
        }
        
        return text;
    }

    /**
     * Restart recognition (public method)
     */
    restart() {
        this.stop();
        setTimeout(() => {
            this.start();
        }, 500);
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isListening: this.isListening,
            isInitialized: this.isInitialized,
            currentLanguage: this.currentLanguage,
            hasText: this.hasBufferedText(),
            retryCount: this.retryCount,
            textBuffer: this.textBuffer
        };
    }

    /**
     * Set event callbacks
     */
    setCallbacks(callbacks) {
        this.onTextReceived = callbacks.onTextReceived || null;
        this.onStatusChange = callbacks.onStatusChange || null;
        this.onError = callbacks.onError || null;
        this.onListeningStart = callbacks.onListeningStart || null;
        this.onListeningStop = callbacks.onListeningStop || null;
    }

    /**
     * Trigger status change callback
     */
    triggerStatusChange(status, message) {
        if (this.onStatusChange) {
            this.onStatusChange(status, message);
        }
    }

    /**
     * Handle errors
     */
    handleError(message) {
        console.error('SpeechRecognitionHandler Error:', message);
        
        if (this.onError) {
            this.onError(message);
        }
    }

    /**
     * Get browser compatibility info
     */
    getBrowserCompatibility() {
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        const isEdge = /Edg/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        const isFirefox = /Firefox/.test(navigator.userAgent);
        
        return {
            hasSupport: this.checkBrowserSupport(),
            browser: {
                chrome: isChrome,
                edge: isEdge,
                safari: isSafari,
                firefox: isFirefox
            },
            continuousSupport: isChrome || isEdge,
            recommendation: !isChrome && !isEdge ? 'For best experience, use Chrome or Edge' : null
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stop();
        this.recognition = null;
        this.isInitialized = false;
        
        // Clear callbacks
        this.onTextReceived = null;
        this.onStatusChange = null;
        this.onError = null;
        this.onListeningStart = null;
        this.onListeningStop = null;
        
        if (CONFIG.isDebugMode()) {
            console.log('Speech recognition handler destroyed');
        }
    }
}

/**
 * Utility functions for speech recognition
 */
const SpeechRecognitionUtils = {
    /**
     * Get available speech recognition languages
     */
    getAvailableLanguages() {
        // This would need to be called after speechSynthesis is ready
        // For now, return our configured languages
        return Object.keys(CONFIG.LANGUAGES.SUPPORTED);
    },

    /**
     * Validate language code
     */
    isLanguageSupported(languageCode) {
        return CONFIG.LANGUAGES.SUPPORTED.hasOwnProperty(languageCode);
    },

    /**
     * Clean recognized text
     */
    cleanText(text) {
        return text
            .trim()
            .replace(/\s+/g, ' ')              // Multiple spaces to single space
            .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
    },

    /**
     * Check if text is meaningful (not just noise)
     */
    isTextMeaningful(text) {
        const cleaned = text.trim();
        
        // Must have at least 2 characters
        if (cleaned.length < 2) return false;
        
        // Must contain at least one letter
        if (!/[a-zA-Z\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0A80-\u0AFF\u0D00-\u0D7F\u0C80-\u0CFF]/.test(cleaned)) {
            return false;
        }
        
        // Filter out common false positives
        const falsePositives = ['uh', 'um', 'er', 'ah', 'hmm', 'uhm'];
        if (falsePositives.includes(cleaned.toLowerCase())) {
            return false;
        }
        
        return true;
    },

    /**
     * Format text for display
     */
    formatForDisplay(text, maxLength = 100) {
        const cleaned = this.cleanText(text);
        
        if (cleaned.length <= maxLength) {
            return cleaned;
        }
        
        return cleaned.substring(0, maxLength - 3) + '...';
    }
};

/**
 * Export for use in other modules
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpeechRecognitionHandler, SpeechRecognitionUtils };
}

/**
 * Global error handler for unhandled speech recognition errors
 */
window.addEventListener('error', (event) => {
    if (event.error && event.error.toString().includes('speech')) {
        console.error('Global speech recognition error:', event.error);
    }
});

/**
 * Handle page visibility changes to pause/resume recognition
 */
document.addEventListener('visibilitychange', () => {
    if (window.speechRecognitionHandler) {
        if (document.hidden) {
            // Page is hidden, pause recognition
            if (CONFIG.isDebugMode()) {
                console.log('Page hidden, pausing speech recognition');
            }
        } else {
            // Page is visible again, resume if needed
            if (CONFIG.isDebugMode()) {
                console.log('Page visible, ready to resume speech recognition');
            }
        }
    }
});