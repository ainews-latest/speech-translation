/**
 * Translation Module - js/translator.js
 * Handles real-time translation using HuggingFace IndicTrans2 API
 */

class Translator {
    constructor() {
        this.cache = new Map();
        this.requestQueue = [];
        this.isProcessing = false;
        this.retryAttempts = 3;
        this.requestTimeout = 30000; // 30 seconds
        this.mockMode = false;
        
        // Model endpoints for different translation directions
        this.models = {
            'en-indic': 'ai4bharat/indictrans2-en-indic-1B',
            'indic-en': 'ai4bharat/indictrans2-indic-en-1B'
        };
        
        this.apiUrl = 'https://api-inference.huggingface.co/models/';
        
        // Load config when available
        this.loadConfig();
    }

    /**
     * Load configuration from config.js
     */
    loadConfig() {
        if (typeof window !== 'undefined' && window.CONFIG) {
            this.mockMode = window.CONFIG.MOCK_MODE || false;
            if (window.CONFIG.HUGGINGFACE_API_TOKEN) {
                this.apiToken = window.CONFIG.HUGGINGFACE_API_TOKEN;
            }
        }
    }

    /**
     * Get appropriate model for language pair
     * @param {string} sourceLanguage - Source language code
     * @param {string} targetLanguage - Target language code
     * @returns {string} Model identifier
     */
    getModelForLanguagePair(sourceLanguage, targetLanguage) {
        const isSourceEnglish = sourceLanguage === 'en';
        const isTargetEnglish = targetLanguage === 'en';
        
        if (isSourceEnglish && !isTargetEnglish) {
            return this.models['en-indic'];
        } else if (!isSourceEnglish && isTargetEnglish) {
            return this.models['indic-en'];
        } else if (!isSourceEnglish && !isTargetEnglish) {
            // Indian language to Indian language - route through English
            return 'dual-step'; // Special marker for two-step translation
        } else {
            // English to English - no translation needed
            return null;
        }
    }

    /**
     * Generate cache key for translation
     * @param {string} text - Text to translate
     * @param {string} sourceLanguage - Source language
     * @param {string} targetLanguage - Target language
     * @returns {string} Cache key
     */
    getCacheKey(text, sourceLanguage, targetLanguage) {
        const textHash = this.simpleHash(text.toLowerCase().trim());
        return `${sourceLanguage}:${targetLanguage}:${textHash}`;
    }

    /**
     * Simple hash function for text
     * @param {string} str - String to hash
     * @returns {number} Hash value
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Clean and preprocess text for translation
     * @param {string} text - Raw text from speech recognition
     * @returns {string} Cleaned text
     */
    preprocessText(text) {
        return text
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[.]{2,}/g, '.') // Fix multiple periods
            .replace(/[?]{2,}/g, '?') // Fix multiple question marks
            .replace(/[!]{2,}/g, '!'); // Fix multiple exclamations
    }

    /**
     * Make API request to HuggingFace
     * @param {string} text - Text to translate
     * @param {string} model - Model to use
     * @param {string} targetLanguage - Target language code
     * @returns {Promise<string>} Translated text
     */
    async makeApiRequest(text, model, targetLanguage) {
        const url = `${this.apiUrl}${model}`;
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // Add authorization header if token is available
        if (this.apiToken) {
            headers['Authorization'] = `Bearer ${this.apiToken}`;
        }

        const payload = {
            inputs: text,
            parameters: {
                src_lang: this.getIndicTransLanguageCode(this.currentSourceLanguage),
                tgt_lang: this.getIndicTransLanguageCode(targetLanguage),
                do_sample: false,
                num_beams: 5
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} - ${response.statusText}`);
            }

            const result = await response.json();
            
            // Handle different response formats
            if (Array.isArray(result) && result[0] && result[0].translation_text) {
                return result[0].translation_text;
            } else if (result.generated_text) {
                return result.generated_text;
            } else if (typeof result === 'string') {
                return result;
            } else {
                throw new Error('Unexpected API response format');
            }

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    /**
     * Convert language codes to IndicTrans2 format
     * @param {string} langCode - Language code from config
     * @returns {string} IndicTrans2 language code
     */
    getIndicTransLanguageCode(langCode) {
        const mapping = {
            'en': 'eng_Latn',
            'hi': 'hin_Deva',
            'ta': 'tam_Taml',
            'te': 'tel_Telu',
            'bn': 'ben_Beng',
            'gu': 'guj_Gujr',
            'kn': 'kan_Knda',
            'ml': 'mal_Mlym',
            'mr': 'mar_Deva',
            'or': 'ory_Orya',
            'pa': 'pan_Guru',
            'as': 'asm_Beng',
            'ur': 'urd_Arab'
        };
        
        return mapping[langCode] || langCode;
    }

    /**
     * Mock translation for testing
     * @param {string} text - Text to translate
     * @param {string} sourceLanguage - Source language
     * @param {string} targetLanguage - Target language
     * @returns {Promise<string>} Mock translated text
     */
    async mockTranslate(text, sourceLanguage, targetLanguage) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // Simple mock responses
        const mockPhrases = {
            'en-hi': {
                'hello': 'नमस्ते',
                'how are you': 'आप कैसे हैं',
                'thank you': 'धन्यवाद',
                'goodbye': 'अलविदा'
            },
            'hi-en': {
                'नमस्ते': 'hello',
                'आप कैसे हैं': 'how are you',
                'धन्यवाद': 'thank you',
                'अलविदा': 'goodbye'
            }
        };
        
        const pairKey = `${sourceLanguage}-${targetLanguage}`;
        const lowerText = text.toLowerCase();
        
        if (mockPhrases[pairKey] && mockPhrases[pairKey][lowerText]) {
            return mockPhrases[pairKey][lowerText];
        }
        
        return `[MOCK ${sourceLanguage}→${targetLanguage}] ${text}`;
    }

    /**
     * Translate text with caching and error handling
     * @param {string} text - Text to translate
     * @param {string} sourceLanguage - Source language code
     * @param {string} targetLanguage - Target language code
     * @returns {Promise<Object>} Translation result
     */
    async translate(text, sourceLanguage, targetLanguage) {
        try {
            // Preprocess text
            const cleanText = this.preprocessText(text);
            
            if (!cleanText) {
                throw new Error('Empty text provided');
            }

            // Store current source language for API requests
            this.currentSourceLanguage = sourceLanguage;

            // Check if translation is needed
            if (sourceLanguage === targetLanguage) {
                return {
                    originalText: text,
                    translatedText: cleanText,
                    sourceLanguage,
                    targetLanguage,
                    cached: false,
                    success: true
                };
            }

            // Check cache first
            const cacheKey = this.getCacheKey(cleanText, sourceLanguage, targetLanguage);
            if (this.cache.has(cacheKey)) {
                const cachedResult = this.cache.get(cacheKey);
                return {
                    ...cachedResult,
                    originalText: text,
                    cached: true,
                    success: true
                };
            }

            let translatedText;

            if (this.mockMode) {
                translatedText = await this.mockTranslate(cleanText, sourceLanguage, targetLanguage);
            } else {
                // Get appropriate model
                const model = this.getModelForLanguagePair(sourceLanguage, targetLanguage);
                
                if (!model) {
                    // No translation needed (English to English)
                    translatedText = cleanText;
                } else if (model === 'dual-step') {
                    // Indian language to Indian language - translate via English
                    const englishText = await this.makeApiRequest(cleanText, this.models['indic-en'], 'en');
                    translatedText = await this.makeApiRequest(englishText, this.models['en-indic'], targetLanguage);
                } else {
                    // Direct translation
                    translatedText = await this.makeApiRequest(cleanText, model, targetLanguage);
                }
            }

            // Cache the result
            const result = {
                translatedText,
                sourceLanguage,
                targetLanguage
            };
            this.cache.set(cacheKey, result);

            // Limit cache size
            if (this.cache.size > 1000) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            return {
                originalText: text,
                translatedText,
                sourceLanguage,
                targetLanguage,
                cached: false,
                success: true
            };

        } catch (error) {
            console.error('Translation error:', error);
            
            return {
                originalText: text,
                translatedText: text, // Fallback to original text
                sourceLanguage,
                targetLanguage,
                cached: false,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Translate with retry logic
     * @param {string} text - Text to translate
     * @param {string} sourceLanguage - Source language code
     * @param {string} targetLanguage - Target language code
     * @returns {Promise<Object>} Translation result
     */
    async translateWithRetry(text, sourceLanguage, targetLanguage) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const result = await this.translate(text, sourceLanguage, targetLanguage);
                if (result.success) {
                    return result;
                }
                lastError = new Error(result.error);
            } catch (error) {
                lastError = error;
                
                // Wait before retry (exponential backoff)
                if (attempt < this.retryAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // All retries failed, return fallback
        return {
            originalText: text,
            translatedText: text,
            sourceLanguage,
            targetLanguage,
            cached: false,
            success: false,
            error: `Translation failed after ${this.retryAttempts} attempts: ${lastError.message}`
        };
    }

    /**
     * Clear translation cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }

    /**
     * Set mock mode
     * @param {boolean} enabled - Enable/disable mock mode
     */
    setMockMode(enabled) {
        this.mockMode = enabled;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Translator = Translator;
}