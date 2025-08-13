/**
 * Audio Analysis Module
 * Handles real-time audio monitoring, silence detection, and volume visualization
 * Uses Web Audio API for precise audio analysis
 */

class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.isInitialized = false;
        this.isMonitoring = false;
        
        // Silence detection
        this.silenceTimer = null;
        this.lastAudioTime = Date.now();
        this.silenceThreshold = CONFIG.AUDIO.SILENCE_DETECTION.threshold;
        this.silenceDuration = CONFIG.AUDIO.SILENCE_DETECTION.duration;
        this.checkInterval = CONFIG.AUDIO.SILENCE_DETECTION.checkInterval;
        
        // Audio level tracking
        this.currentLevel = 0;
        this.smoothedLevel = 0;
        this.peakLevel = 0;
        this.levelHistory = [];
        this.maxHistoryLength = 50;
        
        // Callbacks
        this.onSilenceDetected = null;     // Called when silence period ends
        this.onAudioLevelChange = null;    // Called with current audio level
        this.onSpeechDetected = null;      // Called when speech starts after silence
        this.onError = null;               // Called on errors
        
        this.initialize();
    }

    /**
     * Initialize audio context and microphone access
     */
    async initialize() {
        try {
            // Check for Web Audio API support
            if (!this.checkAudioSupport()) {
                throw new Error('Web Audio API not supported');
            }

            // Request microphone permission and setup audio context
            await this.setupAudioContext();
            await this.setupMicrophone();
            this.setupAnalyser();
            
            this.isInitialized = true;
            
            if (CONFIG.isDebugMode()) {
                console.log('Audio analyzer initialized successfully');
                console.log('Audio context state:', this.audioContext.state);
                console.log('Sample rate:', this.audioContext.sampleRate);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize audio analyzer:', error);
            this.handleError(error.message);
            return false;
        }
    }

    /**
     * Check browser support for Web Audio API
     */
    checkAudioSupport() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }

    /**
     * Setup audio context
     */
    async setupAudioContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        // Resume audio context if suspended (required by some browsers)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Setup microphone access
     */
    async setupMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                }
            });
            
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            if (CONFIG.isDebugMode()) {
                console.log('Microphone access granted');
                console.log('Audio tracks:', stream.getAudioTracks().length);
            }
            
        } catch (error) {
            throw new Error(CONFIG.ERRORS.MICROPHONE_ACCESS_DENIED);
        }
    }

    /**
     * Setup audio analyser node
     */
    setupAnalyser() {
        this.analyser = this.audioContext.createAnalyser();
        
        // Configure analyser settings
        this.analyser.fftSize = CONFIG.AUDIO.ANALYSIS.fftSize;
        this.analyser.smoothingTimeConstant = CONFIG.AUDIO.ANALYSIS.smoothingTimeConstant;
        this.analyser.minDecibels = CONFIG.AUDIO.ANALYSIS.minDecibels;
        this.analyser.maxDecibels = CONFIG.AUDIO.ANALYSIS.maxDecibels;
        
        // Connect microphone to analyser
        this.microphone.connect(this.analyser);
        
        // Create data array for frequency data
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        if (CONFIG.isDebugMode()) {
            console.log('Audio analyser configured:');
            console.log('- FFT Size:', this.analyser.fftSize);
            console.log('- Frequency bins:', this.analyser.frequencyBinCount);
            console.log('- Smoothing:', this.analyser.smoothingTimeConstant);
        }
    }

    /**
     * Start monitoring audio levels and silence detection
     */
    startMonitoring() {
        if (!this.isInitialized) {
            this.handleError('Audio analyzer not initialized');
            return false;
        }

        if (this.isMonitoring) {
            if (CONFIG.isDebugMode()) {
                console.log('Audio monitoring already active');
            }
            return true;
        }

        this.isMonitoring = true;
        this.lastAudioTime = Date.now();
        this.resetSilenceTimer();
        
        // Start the monitoring loop
        this.monitoringLoop();
        
        if (CONFIG.isDebugMode()) {
            console.log('Audio monitoring started');
        }
        
        return true;
    }

    /**
     * Stop monitoring audio
     */
    stopMonitoring() {
        this.isMonitoring = false;
        this.resetSilenceTimer();
        
        if (CONFIG.isDebugMode()) {
            console.log('Audio monitoring stopped');
        }
    }

    /**
     * Main monitoring loop
     */
    monitoringLoop() {
        if (!this.isMonitoring || !this.analyser || !this.dataArray) {
            return;
        }

        // Get current audio data
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate audio level
        const audioLevel = this.calculateAudioLevel();
        
        // Update level tracking
        this.updateAudioLevels(audioLevel);
        
        // Check for silence
        this.checkForSilence(audioLevel);
        
        // Update UI
        this.updateVolumeVisualization();
        
        // Continue monitoring
        if (this.isMonitoring) {
            setTimeout(() => this.monitoringLoop(), this.checkInterval);
        }
    }

    /**
     * Calculate current audio level from frequency data
     */
    calculateAudioLevel() {
        if (!this.dataArray) return 0;

        // Calculate RMS (Root Mean Square) amplitude
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            const amplitude = this.dataArray[i] / 255.0; // Normalize to 0-1
            sum += amplitude * amplitude;
        }
        
        const rms = Math.sqrt(sum / this.dataArray.length);
        
        // Apply smoothing to reduce noise
        const smoothing = CONFIG.AUDIO.VISUALIZATION.smoothing;
        this.smoothedLevel = (this.smoothedLevel * smoothing) + (rms * (1 - smoothing));
        
        return this.smoothedLevel;
    }

    /**
     * Update audio level tracking
     */
    updateAudioLevels(level) {
        this.currentLevel = level;
        
        // Track peak level
        if (level > this.peakLevel) {
            this.peakLevel = level;
        }
        
        // Add to history for analysis
        this.levelHistory.push({
            level: level,
            timestamp: Date.now()
        });
        
        // Maintain history length
        if (this.levelHistory.length > this.maxHistoryLength) {
            this.levelHistory.shift();
        }
        
        // Notify callback
        if (this.onAudioLevelChange) {
            this.onAudioLevelChange(level, this.peakLevel);
        }
    }

    /**
     * Check for silence periods
     */
    checkForSilence(level) {
        const now = Date.now();
        
        if (level > this.silenceThreshold) {
            // Audio detected - reset silence timer
            this.lastAudioTime = now;
            this.resetSilenceTimer();
            
            // Trigger speech detected if we were in silence
            if (this.onSpeechDetected && this.silenceTimer === null) {
                this.onSpeechDetected(level);
            }
        } else {
            // Potential silence - check duration
            const silenceDuration = now - this.lastAudioTime;
            
            if (silenceDuration >= this.silenceDuration) {
                // Silence period completed
                if (!this.silenceTimer) {
                    this.triggerSilenceDetected();
                }
            }
        }
    }

    /**
     * Trigger silence detected event
     */
    triggerSilenceDetected() {
        if (CONFIG.isDebugMode()) {
            console.log('Silence detected after', this.silenceDuration, 'ms');
        }
        
        // Set timer to prevent multiple triggers
        this.silenceTimer = setTimeout(() => {
            this.silenceTimer = null;
        }, 1000);
        
        // Notify callback
        if (this.onSilenceDetected) {
            this.onSilenceDetected(this.getAudioStats());
        }
    }

    /**
     * Reset silence detection timer
     */
    resetSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    /**
     * Update volume visualization in UI
     */
    updateVolumeVisualization() {
        const volumeBar = document.getElementById('volumeBar');
        if (volumeBar) {
            const percentage = Math.min(this.currentLevel * 100, 100);
            volumeBar.style.width = percentage + '%';
            
            // Add visual feedback for different levels
            if (percentage > 70) {
                volumeBar.style.boxShadow = '0 0 15px rgba(244, 67, 54, 0.8)';
            } else if (percentage > 40) {
                volumeBar.style.boxShadow = '0 0 10px rgba(255, 193, 7, 0.6)';
            } else if (percentage > 10) {
                volumeBar.style.boxShadow = '0 0 8px rgba(76, 175, 80, 0.6)';
            } else {
                volumeBar.style.boxShadow = 'none';
            }
        }
    }

    /**
     * Get current audio statistics
     */
    getAudioStats() {
        const recentHistory = this.levelHistory.slice(-10); // Last 10 readings
        const avgLevel = recentHistory.reduce((sum, item) => sum + item.level, 0) / recentHistory.length;
        
        return {
            currentLevel: this.currentLevel,
            smoothedLevel: this.smoothedLevel,
            peakLevel: this.peakLevel,
            averageLevel: avgLevel || 0,
            silenceThreshold: this.silenceThreshold,
            isAboveThreshold: this.currentLevel > this.silenceThreshold,
            timeSinceLastAudio: Date.now() - this.lastAudioTime
        };
    }

    /**
     * Set silence detection parameters
     */
    setSilenceDetection(threshold, duration) {
        this.silenceThreshold = Math.max(0, Math.min(1, threshold)); // Clamp between 0-1
        this.silenceDuration = Math.max(500, duration); // Minimum 500ms
        
        if (CONFIG.isDebugMode()) {
            console.log(`Silence detection updated: threshold=${this.silenceThreshold}, duration=${this.silenceDuration}ms`);
        }
    }

    /**
     * Get current silence detection settings
     */
    getSilenceSettings() {
        return {
            threshold: this.silenceThreshold,
            duration: this.silenceDuration,
            checkInterval: this.checkInterval
        };
    }

    /**
     * Set event callbacks
     */
    setCallbacks(callbacks) {
        this.onSilenceDetected = callbacks.onSilenceDetected || null;
        this.onAudioLevelChange = callbacks.onAudioLevelChange || null;
        this.onSpeechDetected = callbacks.onSpeechDetected || null;
        this.onError = callbacks.onError || null;
    }

    /**
     * Handle errors
     */
    handleError(message) {
        console.error('AudioAnalyzer Error:', message);
        
        if (this.onError) {
            this.onError(message);
        }
    }

    /**
     * Get audio context state
     */
    getAudioContextState() {
        if (!this.audioContext) return 'not-initialized';
        return this.audioContext.state;
    }

    /**
     * Resume audio context (required by some browsers)
     */
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                
                if (CONFIG.isDebugMode()) {
                    console.log('Audio context resumed');
                }
                
                return true;
            } catch (error) {
                console.error('Failed to resume audio context:', error);
                return false;
            }
        }
        return true;
    }

    /**
     * Reset peak level (useful for UI feedback)
     */
    resetPeakLevel() {
        this.peakLevel = 0;
    }

    /**
     * Get frequency spectrum data (for advanced visualizations)
     */
    getFrequencyData() {
        if (!this.analyser || !this.dataArray) return null;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        return Array.from(this.dataArray);
    }

    /**
     * Get time domain data (for waveform visualization)
     */
    getTimeDomainData() {
        if (!this.analyser) return null;
        
        const timeDomainData = new Uint8Array(this.analyser.fftSize);
        this.analyser.getByteTimeDomainData(timeDomainData);
        return Array.from(timeDomainData);
    }

    /**
     * Calibrate silence threshold based on ambient noise
     */
    async calibrateThreshold(durationMs = 3000) {
        if (!this.isInitialized) {
            throw new Error('Audio analyzer not initialized');
        }

        return new Promise((resolve) => {
            const startTime = Date.now();
            const samples = [];
            
            const calibrationLoop = () => {
                if (Date.now() - startTime >= durationMs) {
                    // Calculate threshold based on ambient noise
                    const avgNoise = samples.reduce((sum, val) => sum + val, 0) / samples.length;
                    const suggestedThreshold = avgNoise * 3; // 3x ambient noise level
                    
                    if (CONFIG.isDebugMode()) {
                        console.log(`Calibration complete:`);
                        console.log(`- Average ambient noise: ${avgNoise.toFixed(4)}`);
                        console.log(`- Suggested threshold: ${suggestedThreshold.toFixed(4)}`);
                    }
                    
                    resolve({
                        ambientNoise: avgNoise,
                        suggestedThreshold: Math.min(suggestedThreshold, 0.1), // Cap at 0.1
                        samples: samples.length
                    });
                    return;
                }
                
                // Collect sample
                const level = this.calculateAudioLevel();
                samples.push(level);
                
                setTimeout(calibrationLoop, 100);
            };
            
            calibrationLoop();
        });
    }

    /**
     * Get current monitoring status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isMonitoring: this.isMonitoring,
            audioContextState: this.getAudioContextState(),
            currentLevel: this.currentLevel,
            smoothedLevel: this.smoothedLevel,
            peakLevel: this.peakLevel,
            silenceThreshold: this.silenceThreshold,
            silenceDuration: this.silenceDuration,
            timeSinceLastAudio: Date.now() - this.lastAudioTime,
            isInSilence: (Date.now() - this.lastAudioTime) > this.silenceDuration
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopMonitoring();
        
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.dataArray = null;
        this.isInitialized = false;
        
        // Clear callbacks
        this.onSilenceDetected = null;
        this.onAudioLevelChange = null;
        this.onSpeechDetected = null;
        this.onError = null;
        
        if (CONFIG.isDebugMode()) {
            console.log('Audio analyzer destroyed');
        }
    }
}

/**
 * Audio Analysis Utilities
 */
const AudioAnalysisUtils = {
    /**
     * Convert decibels to linear scale
     */
    decibelToLinear(decibel) {
        return Math.pow(10, decibel / 20);
    },

    /**
     * Convert linear scale to decibels
     */
    linearToDecibel(linear) {
        return 20 * Math.log10(linear);
    },

    /**
     * Calculate volume from frequency data
     */
    calculateVolume(frequencyData) {
        let sum = 0;
        for (let i = 0; i < frequencyData.length; i++) {
            sum += frequencyData[i] * frequencyData[i];
        }
        return Math.sqrt(sum / frequencyData.length) / 255;
    },

    /**
     * Detect audio patterns (useful for advanced features)
     */
    detectAudioPattern(levelHistory) {
        if (levelHistory.length < 10) return 'insufficient-data';
        
        const recent = levelHistory.slice(-10);
        const levels = recent.map(item => item.level);
        
        const avg = levels.reduce((sum, val) => sum + val, 0) / levels.length;
        const variance = levels.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / levels.length;
        
        if (avg < 0.01) return 'silence';
        if (variance < 0.001) return 'steady-speech';
        if (variance > 0.01) return 'dynamic-speech';
        
        return 'normal-speech';
    },

    /**
     * Format audio level for display
     */
    formatAudioLevel(level) {
        if (level < 0.001) return 'Silent';
        if (level < 0.01) return 'Very Quiet';
        if (level < 0.05) return 'Quiet';
        if (level < 0.2) return 'Normal';
        if (level < 0.5) return 'Loud';
        return 'Very Loud';
    },

    /**
     * Get browser-specific audio recommendations
     */
    getBrowserAudioRecommendations() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('Chrome')) {
            return {
                browser: 'Chrome',
                support: 'excellent',
                recommendations: ['Enable microphone permissions', 'Use HTTPS for best results']
            };
        } else if (userAgent.includes('Edg')) {
            return {
                browser: 'Edge',
                support: 'excellent',
                recommendations: ['Enable microphone permissions', 'Use HTTPS for best results']
            };
        } else if (userAgent.includes('Safari')) {
            return {
                browser: 'Safari',
                support: 'limited',
                recommendations: ['May have limited continuous recognition', 'Try Chrome for better experience']
            };
        } else if (userAgent.includes('Firefox')) {
            return {
                browser: 'Firefox',
                support: 'basic',
                recommendations: ['Limited speech recognition support', 'Try Chrome or Edge for full features']
            };
        }
        
        return {
            browser: 'Unknown',
            support: 'unknown',
            recommendations: ['Use Chrome or Edge for best experience']
        };
    }
};

/**
 * Advanced Audio Analyzer for future features
 */
class AdvancedAudioAnalyzer extends AudioAnalyzer {
    constructor() {
        super();
        this.frequencyBands = [];
        this.pitchDetector = null;
    }

    /**
     * Setup frequency band analysis
     */
    setupFrequencyBands() {
        // Define frequency bands for analysis
        this.frequencyBands = [
            { name: 'sub-bass', min: 20, max: 60 },
            { name: 'bass', min: 60, max: 250 },
            { name: 'low-midrange', min: 250, max: 500 },
            { name: 'midrange', min: 500, max: 2000 },
            { name: 'upper-midrange', min: 2000, max: 4000 },
            { name: 'presence', min: 4000, max: 6000 },
            { name: 'brilliance', min: 6000, max: 20000 }
        ];
    }

    /**
     * Analyze speech characteristics
     */
    analyzeSpeechCharacteristics() {
        const frequencyData = this.getFrequencyData();
        if (!frequencyData) return null;

        // Analyze different frequency bands
        const bandEnergy = this.frequencyBands.map(band => {
            const bandData = this.getFrequencyBandData(frequencyData, band.min, band.max);
            const energy = bandData.reduce((sum, val) => sum + val * val, 0) / bandData.length;
            return { name: band.name, energy: energy };
        });

        return {
            totalEnergy: frequencyData.reduce((sum, val) => sum + val * val, 0) / frequencyData.length,
            bandEnergy: bandEnergy,
            dominantFrequency: this.findDominantFrequency(frequencyData),
            spectralCentroid: this.calculateSpectralCentroid(frequencyData)
        };
    }

    /**
     * Get frequency band data
     */
    getFrequencyBandData(frequencyData, minFreq, maxFreq) {
        const sampleRate = this.audioContext.sampleRate;
        const fftSize = this.analyser.fftSize;
        
        const minIndex = Math.floor(minFreq * fftSize / sampleRate);
        const maxIndex = Math.floor(maxFreq * fftSize / sampleRate);
        
        return frequencyData.slice(minIndex, maxIndex + 1);
    }

    /**
     * Find dominant frequency
     */
    findDominantFrequency(frequencyData) {
        let maxIndex = 0;
        let maxValue = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
            if (frequencyData[i] > maxValue) {
                maxValue = frequencyData[i];
                maxIndex = i;
            }
        }
        
        const sampleRate = this.audioContext.sampleRate;
        const fftSize = this.analyser.fftSize;
        return (maxIndex * sampleRate) / fftSize;
    }

    /**
     * Calculate spectral centroid (brightness of sound)
     */
    calculateSpectralCentroid(frequencyData) {
        let weightedSum = 0;
        let magnitudeSum = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
            const magnitude = frequencyData[i];
            weightedSum += i * magnitude;
            magnitudeSum += magnitude;
        }
        
        return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    }
}

/**
 * Export for use in other modules
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioAnalyzer, AdvancedAudioAnalyzer, AudioAnalysisUtils };
}