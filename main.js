/**
 * Main Controller - js/main.js
 * Orchestrates the complete real-time speech translation flow
 */

class SpeechTranslatorApp {
    constructor() {
        // Core modules
        this.speechRecognition = null;
        this.audioAnalyzer = null;
        this.translator = null;
        this.textToSpeech = null;
        
        // App state
        this.isActive = false;
        this.currentSide = 'A'; // A or B
        this.isProcessing = false;
        this.currentLanguages = {
            A: 'en',
            B: 'hi'
        };
        
        // UI elements
        this.ui = {};
        
        // Conversation history
        this.conversationHistory = [];
        this.maxHistoryItems = 50;
        
        // Settings
        this.settings = {
            silenceThreshold: 3000, // 3 seconds
            autoStart: false,
            showInterimResults: true,
            roleSwitchDelay: 500,
            maxRetries: 3
        };
        
        // Event handlers
        this.boundHandlers = {};
        
        // Initialize the application
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('SpeechTranslatorApp: Starting initialization...');
            
            // Load configuration
            this.loadConfig();
            
            // Initialize UI elements
            this.initializeUI();
            
            // Initialize core modules
            await this.initializeModules();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Update UI state
            this.updateUIState();
            
            console.log('SpeechTranslatorApp: Initialization complete');
            this.showStatus('Ready to start translation', 'success');
            
        } catch (error) {
            console.error('SpeechTranslatorApp: Initialization failed:', error);
            this.showStatus('Failed to initialize: ' + error.message, 'error');
        }
    }

    /**
     * Load configuration from config.js
     */
    loadConfig() {
        if (typeof window !== 'undefined' && window.CONFIG) {
            this.settings = {
                ...this.settings,
                ...window.CONFIG.APP_SETTINGS
            };
            
            this.currentLanguages = {
                A: window.CONFIG.DEFAULT_LANGUAGES?.A || 'en',
                B: window.CONFIG.DEFAULT_LANGUAGES?.B || 'hi'
            };
        }
    }

    /**
     * Initialize UI element references
     */
    initializeUI() {
        this.ui = {
            // Control buttons
            startButton: document.getElementById('startButton'),
            stopButton: document.getElementById('stopButton'),
            pauseButton: document.getElementById('pauseButton'),
            clearButton: document.getElementById('clearButton'),
            
            // Language selectors
            languageASelect: document.getElementById('languageA'),
            languageBSelect: document.getElementById('languageB'),
            swapLanguagesButton: document.getElementById('swapLanguages'),
            
            // Status displays
            statusIndicator: document.getElementById('status'),
            currentSideIndicator: document.getElementById('currentSide'),
            processingIndicator: document.getElementById('processing'),
            
            // Audio visualization
            audioVisualizer: document.getElementById('audioVisualizer'),
            microphoneLevel: document.getElementById('microphoneLevel'),
            
            // Conversation display
            conversationHistory: document.getElementById('conversationHistory'),
            currentTranscript: document.getElementById('currentTranscript'),
            
            // Settings
            settingsPanel: document.getElementById('settings'),
            mockModeToggle: document.getElementById('mockMode'),
            silenceThresholdSlider: document.getElementById('silenceThreshold'),
            autoStartToggle: document.getElementById('autoStart')
        };
        
        // Initialize language selectors
        this.populateLanguageSelectors();
    }

    /**
     * Populate language selector dropdowns
     */
    populateLanguageSelectors() {
        if (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.SUPPORTED_LANGUAGES) {
            const languages = window.CONFIG.SUPPORTED_LANGUAGES;
            
            [this.ui.languageASelect, this.ui.languageBSelect].forEach(select => {
                if (select) {
                    select.innerHTML = '';
                    Object.entries(languages).forEach(([code, name]) => {
                        const option = document.createElement('option');
                        option.value = code;
                        option.textContent = name;
                        select.appendChild(option);
                    });
                }
            });
            
            // Set initial values
            if (this.ui.languageASelect) {
                this.ui.languageASelect.value = this.currentLanguages.A;
            }
            if (this.ui.languageBSelect) {
                this.ui.languageBSelect.value = this.currentLanguages.B;
            }
        }
    }

    /**
     * Initialize core modules
     */
    async initializeModules() {
        try {
            // Initialize Speech Recognition
            if (typeof SpeechRecognition !== 'undefined') {
                this.speechRecognition = new SpeechRecognition();
                console.log('SpeechRecognition module initialized');
            } else {
                throw new Error('SpeechRecognition module not found');
            }
            
            // Initialize Audio Analyzer
            if (typeof AudioAnalyzer !== 'undefined') {
                this.audioAnalyzer = new AudioAnalyzer();
                await this.audioAnalyzer.initialize();
                console.log('AudioAnalyzer module initialized');
            } else {
                throw new Error('AudioAnalyzer module not found');
            }
            
            // Initialize Translator
            if (typeof Translator !== 'undefined') {
                this.translator = new Translator();
                console.log('Translator module initialized');
            } else {
                throw new Error('Translator module not found');
            }
            
            // Initialize Text-to-Speech
            if (typeof TextToSpeech !== 'undefined') {
                this.textToSpeech = new TextToSpeech();
                await this.textToSpeech.initialize();
                console.log('TextToSpeech module initialized');
            } else {
                throw new Error('TextToSpeech module not found');
            }
            
        } catch (error) {
            console.error('Module initialization error:', error);
            throw error;
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // UI Control Events
        this.setupUIEventListeners();
        
        // Module Events  
        this.setupModuleEventListeners();
        
        // Window Events
        this.setupWindowEventListeners();
    }

    /**
     * Setup UI event listeners
     */
    setupUIEventListeners() {
        // Control buttons
        if (this.ui.startButton) {
            this.ui.startButton.addEventListener('click', () => this.startTranslation());
        }
        
        if (this.ui.stopButton) {
            this.ui.stopButton.addEventListener('click', () => this.stopTranslation());
        }
        
        if (this.ui.pauseButton) {
            this.ui.pauseButton.addEventListener('click', () => this.pauseTranslation());
        }
        
        if (this.ui.clearButton) {
            this.ui.clearButton.addEventListener('click', () => this.clearConversation());
        }
        
        // Language controls
        if (this.ui.languageASelect) {
            this.ui.languageASelect.addEventListener('change', (e) => {
                this.currentLanguages.A = e.target.value;
                this.updateSpeechRecognitionLanguage();
            });
        }
        
        if (this.ui.languageBSelect) {
            this.ui.languageBSelect.addEventListener('change', (e) => {
                this.currentLanguages.B = e.target.value;
                this.updateSpeechRecognitionLanguage();
            });
        }
        
        if (this.ui.swapLanguagesButton) {
            this.ui.swapLanguagesButton.addEventListener('click', () => this.swapLanguages());
        }
        
        // Settings
        if (this.ui.mockModeToggle) {
            this.ui.mockModeToggle.addEventListener('change', (e) => {
                if (this.translator) {
                    this.translator.setMockMode(e.target.checked);
                }
            });
        }
        
        if (this.ui.silenceThresholdSlider) {
            this.ui.silenceThresholdSlider.addEventListener('input', (e) => {
                this.settings.silenceThreshold = parseInt(e.target.value);
                if (this.audioAnalyzer) {
                    this.audioAnalyzer.setSilenceThreshold(this.settings.silenceThreshold);
                }
            });
        }
        
        if (this.ui.autoStartToggle) {
            this.ui.autoStartToggle.addEventListener('change', (e) => {
                this.settings.autoStart = e.target.checked;
            });
        }
    }

    /**
     * Setup module event listeners
     */
    setupModuleEventListeners() {
        // Speech Recognition Events
        if (this.speechRecognition) {
            this.speechRecognition.on('result', (data) => this.handleSpeechResult(data));
            this.speechRecognition.on('end', () => this.handleSpeechEnd());
            this.speechRecognition.on('error', (error) => this.handleSpeechError(error));
            this.speechRecognition.on('start', () => this.handleSpeechStart());
        }
        
        // Audio Analyzer Events
        if (this.audioAnalyzer) {
            this.audioAnalyzer.on('silenceDetected', () => this.handleSilenceDetected());
            this.audioAnalyzer.on('voiceActivity', (data) => this.handleVoiceActivity(data));
            this.audioAnalyzer.on('volumeLevel', (level) => this.updateVolumeVisualization(level));
        }
        
        // Text-to-Speech Events
        if (this.textToSpeech) {
            this.textToSpeech.on('speechStart', (data) => this.handleTTSStart(data));
            this.textToSpeech.on('speechEnd', (data) => this.handleTTSEnd(data));
            this.textToSpeech.on('speechError', (data) => this.handleTTSError(data));
            this.textToSpeech.on('roleSwitchReady', (data) => this.handleRoleSwitchReady(data));
        }
    }

    /**
     * Setup window event listeners
     */
    setupWindowEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isActive) {
                this.pauseTranslation();
            }
        });
        
        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case ' ':
                        e.preventDefault();
                        this.toggleTranslation();
                        break;
                    case 's':
                        e.preventDefault();
                        this.swapLanguages();
                        break;
                    case 'c':
                        e.preventDefault();
                        this.clearConversation();
                        break;
                }
            }
        });
    }

    /**
     * Start translation process
     */
    async startTranslation() {
        try {
            if (this.isActive) return;
            
            this.showStatus('Starting translation...', 'info');
            
            // Start audio analysis
            await this.audioAnalyzer.startAnalysis();
            
            // Start speech recognition
            const currentLanguage = this.getCurrentLanguage();
            await this.speechRecognition.start(currentLanguage);
            
            this.isActive = true;
            this.updateUIState();
            
            this.showStatus(`Listening in ${this.getLanguageName(currentLanguage)}...`, 'active');
            
        } catch (error) {
            console.error('Failed to start translation:', error);
            this.showStatus('Failed to start: ' + error.message, 'error');
            this.isActive = false;
            this.updateUIState();
        }
    }

    /**
     * Stop translation process
     */
    stopTranslation() {
        try {
            this.isActive = false;
            this.isProcessing = false;
            
            // Stop all modules
            if (this.speechRecognition) {
                this.speechRecognition.stop();
            }
            
            if (this.audioAnalyzer) {
                this.audioAnalyzer.stopAnalysis();
            }
            
            if (this.textToSpeech) {
                this.textToSpeech.stop();
            }
            
            this.updateUIState();
            this.showStatus('Translation stopped', 'info');
            
        } catch (error) {
            console.error('Error stopping translation:', error);
        }
    }

    /**
     * Pause translation process
     */
    pauseTranslation() {
        if (!this.isActive) return;
        
        try {
            // Pause speech recognition
            if (this.speechRecognition) {
                this.speechRecognition.stop();
            }
            
            // Pause TTS if active
            if (this.textToSpeech && this.textToSpeech.isSpeechActive()) {
                this.textToSpeech.pause();
            }
            
            this.showStatus('Translation paused', 'info');
            
        } catch (error) {
            console.error('Error pausing translation:', error);
        }
    }

    /**
     * Toggle translation on/off
     */
    toggleTranslation() {
        if (this.isActive) {
            this.stopTranslation();
        } else {
            this.startTranslation();
        }
    }

    /**
     * Handle speech recognition result
     */
    handleSpeechResult(data) {
        if (!this.isActive) return;
        
        const { transcript, isFinal, confidence } = data;
        
        // Update current transcript display
        this.updateCurrentTranscript(transcript, isFinal);
        
        if (isFinal && transcript.trim()) {
            // Process the final transcript
            this.processSpeechInput(transcript);
        }
    }

    /**
     * Handle silence detection
     */
    async handleSilenceDetected() {
        if (!this.isActive || this.isProcessing) return;
        
        const currentTranscript = this.speechRecognition.getCurrentTranscript();
        if (currentTranscript && currentTranscript.trim()) {
            await this.processSpeechInput(currentTranscript);
        }
    }

    /**
     * Process speech input through translation pipeline
     */
    async processSpeechInput(transcript) {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.updateUIState();
            this.showStatus('Processing...', 'processing');
            
            const sourceLanguage = this.getCurrentLanguage();
            const targetLanguage = this.getTargetLanguage();
            
            // Add to conversation history (original)
            this.addToConversationHistory(transcript, sourceLanguage, 'original');
            
            // Translate
            this.showStatus('Translating...', 'processing');
            const translationResult = await this.translator.translateWithRetry(
                transcript, sourceLanguage, targetLanguage
            );
            
            if (translationResult.success) {
                // Add translation to history
                this.addToConversationHistory(
                    translationResult.translatedText, 
                    targetLanguage, 
                    'translated'
                );
                
                // Speak translation
                this.showStatus('Speaking translation...', 'processing');
                await this.textToSpeech.speak(
                    translationResult.translatedText, 
                    targetLanguage,
                    { roleSwitchDelay: this.settings.roleSwitchDelay }
                );
                
            } else {
                throw new Error(translationResult.error || 'Translation failed');
            }
            
        } catch (error) {
            console.error('Processing error:', error);
            this.showStatus('Error: ' + error.message, 'error');
            
            // Resume listening after error
            setTimeout(() => {
                if (this.isActive) {
                    this.resumeListening();
                }
            }, 2000);
            
        } finally {
            this.isProcessing = false;
            this.updateUIState();
        }
    }

    /**
     * Handle role switch after TTS completes
     */
    async handleRoleSwitchReady(data) {
        if (!this.isActive || this.isProcessing) return;
        
        try {
            // Switch to other side
            this.currentSide = this.currentSide === 'A' ? 'B' : 'A';
            
            // Resume listening in new language
            await this.resumeListening();
            
            this.updateUIState();
            
        } catch (error) {
            console.error('Role switch error:', error);
            this.showStatus('Error switching roles: ' + error.message, 'error');
        }
    }

    /**
     * Resume listening after role switch or error
     */
    async resumeListening() {
        if (!this.isActive) return;
        
        try {
            const currentLanguage = this.getCurrentLanguage();
            
            // Update speech recognition language
            await this.speechRecognition.stop();
            await this.speechRecognition.start(currentLanguage);
            
            this.showStatus(`Listening in ${this.getLanguageName(currentLanguage)}...`, 'active');
            
        } catch (error) {
            console.error('Error resuming listening:', error);
            this.showStatus('Error resuming: ' + error.message, 'error');
        }
    }

    /**
     * Update speech recognition language
     */
    updateSpeechRecognitionLanguage() {
        if (this.speechRecognition && this.isActive) {
            const currentLanguage = this.getCurrentLanguage();
            this.speechRecognition.setLanguage(currentLanguage);
        }
    }

    /**
     * Swap languages between sides
     */
    swapLanguages() {
        const tempA = this.currentLanguages.A;
        this.currentLanguages.A = this.currentLanguages.B;
        this.currentLanguages.B = tempA;
        
        // Update UI selectors
        if (this.ui.languageASelect) {
            this.ui.languageASelect.value = this.currentLanguages.A;
        }
        if (this.ui.languageBSelect) {
            this.ui.languageBSelect.value = this.currentLanguages.B;
        }
        
        // Update speech recognition if active
        this.updateSpeechRecognitionLanguage();
        
        this.updateUIState();
        this.showStatus('Languages swapped', 'info');
    }

    /**
     * Clear conversation history
     */
    clearConversation() {
        this.conversationHistory = [];
        this.updateConversationDisplay();
        this.showStatus('Conversation cleared', 'info');
    }

    /**
     * Add entry to conversation history
     */
    addToConversationHistory(text, language, type) {
        const entry = {
            text,
            language,
            type,
            side: this.currentSide,
            timestamp: new Date(),
            id: Date.now() + Math.random()
        };
        
        this.conversationHistory.push(entry);
        
        // Limit history size
        if (this.conversationHistory.length > this.maxHistoryItems) {
            this.conversationHistory.shift();
        }
        
        this.updateConversationDisplay();
    }

    /**
     * Update conversation display
     */
    updateConversationDisplay() {
        if (!this.ui.conversationHistory) return;
        
        const historyHtml = this.conversationHistory
            .slice(-20) // Show last 20 items
            .map(entry => {
                const timeStr = entry.timestamp.toLocaleTimeString();
                const sideClass = `side-${entry.side.toLowerCase()}`;
                const typeClass = `type-${entry.type}`;
                const langName = this.getLanguageName(entry.language);
                
                return `
                    <div class="conversation-entry ${sideClass} ${typeClass}">
                        <div class="entry-header">
                            <span class="entry-side">Side ${entry.side}</span>
                            <span class="entry-language">${langName}</span>
                            <span class="entry-time">${timeStr}</span>
                        </div>
                        <div class="entry-text">${entry.text}</div>
                    </div>
                `;
            })
            .join('');
            
        this.ui.conversationHistory.innerHTML = historyHtml;
        
        // Scroll to bottom
        this.ui.conversationHistory.scrollTop = this.ui.conversationHistory.scrollHeight;
    }

    /**
     * Update current transcript display
     */
    updateCurrentTranscript(transcript, isFinal) {
        if (!this.ui.currentTranscript) return;
        
        const className = isFinal ? 'final' : 'interim';
        this.ui.currentTranscript.innerHTML = `
            <span class="${className}">${transcript}</span>
        `;
        
        if (isFinal) {
            setTimeout(() => {
                this.ui.currentTranscript.innerHTML = '';
            }, 1000);
        }
    }

    /**
     * Update volume visualization
     */
    updateVolumeVisualization(level) {
        if (this.ui.microphoneLevel) {
            this.ui.microphoneLevel.style.width = `${level * 100}%`;
        }
    }

    /**
     * Update UI state based on app status
     */
    updateUIState() {
        // Update buttons
        if (this.ui.startButton) {
            this.ui.startButton.disabled = this.isActive;
        }
        if (this.ui.stopButton) {
            this.ui.stopButton.disabled = !this.isActive;
        }
        if (this.ui.pauseButton) {
            this.ui.pauseButton.disabled = !this.isActive;
        }
        
        // Update current side indicator
        if (this.ui.currentSideIndicator) {
            this.ui.currentSideIndicator.textContent = `Side ${this.currentSide}`;
            this.ui.currentSideIndicator.className = `side-${this.currentSide.toLowerCase()}`;
        }
        
        // Update processing indicator
        if (this.ui.processingIndicator) {
            this.ui.processingIndicator.style.display = this.isProcessing ? 'block' : 'none';
        }
        
        // Update language display
        const currentLanguage = this.getCurrentLanguage();
        const currentLangName = this.getLanguageName(currentLanguage);
        
        document.querySelectorAll('.current-language').forEach(el => {
            el.textContent = currentLangName;
        });
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        if (!this.ui.statusIndicator) return;
        
        this.ui.statusIndicator.textContent = message;
        this.ui.statusIndicator.className = `status status-${type}`;
        
        console.log(`Status [${type}]: ${message}`);
    }

    /**
     * Get current language for active side
     */
    getCurrentLanguage() {
        return this.currentLanguages[this.currentSide];
    }

    /**
     * Get target language for translation
     */
    getTargetLanguage() {
        const otherSide = this.currentSide === 'A' ? 'B' : 'A';
        return this.currentLanguages[otherSide];
    }

    /**
     * Get language name from code
     */
    getLanguageName(code) {
        if (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.SUPPORTED_LANGUAGES) {
            return window.CONFIG.SUPPORTED_LANGUAGES[code] || code;
        }
        return code;
    }

    /**
     * Event handlers for module events
     */
    handleSpeechStart() {
        // Speech recognition started
    }

    handleSpeechEnd() {
        // Speech recognition ended - will be restarted by role switching
    }

    handleSpeechError(error) {
        console.error('Speech recognition error:', error);
        if (this.isActive && !this.isProcessing) {
            // Try to restart recognition
            setTimeout(() => this.resumeListening(), 1000);
        }
    }

    handleVoiceActivity(data) {
        // Handle voice activity detection if needed
    }

    handleTTSStart(data) {
        // TTS started
    }

    handleTTSEnd(data) {
        // TTS ended
    }

    handleTTSError(data) {
        console.error('TTS error:', data.error);
        this.showStatus('Speech error: ' + data.error.message, 'error');
        
        // Resume listening after TTS error
        setTimeout(() => {
            if (this.isActive) {
                this.resumeListening();
            }
        }, 1000);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopTranslation();
        
        // Remove event listeners
        Object.values(this.boundHandlers).forEach(handler => {
            if (handler.element && handler.event) {
                handler.element.removeEventListener(handler.event, handler.callback);
            }
        });
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            isActive: this.isActive,
            isProcessing: this.isProcessing,
            currentSide: this.currentSide,
            currentLanguages: this.currentLanguages,
            conversationLength: this.conversationHistory.length,
            modules: {
                speechRecognition: !!this.speechRecognition,
                audioAnalyzer: !!this.audioAnalyzer,
                translator: !!this.translator,
                textToSpeech: !!this.textToSpeech
            }
        };
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Speech Translator App...');
    
    // Create global app instance
    window.speechTranslatorApp = new SpeechTranslatorApp();
    
    // Expose for debugging
    if (typeof window !== 'undefined') {
        window.SpeechTranslatorApp = SpeechTranslatorApp;
    }
});