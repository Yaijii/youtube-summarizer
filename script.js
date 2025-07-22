class YouTubeSummarizer {
    constructor() {
        this.assemblyApiKey = null;
        this.whisperModel = null;
        this.huggingFaceApiKey = null;
        this.successCount = 0;
        this.totalAttempts = 0;
        this.lastMethod = 'Aucune';
        this.init();
    }
    
    init() {
        // Éléments DOM
        this.urlInput = document.getElementById('youtubeUrl');
        this.summarizeBtn = document.getElementById('summarizeBtn');
        this.loading = document.getElementById('loading');
        this.result = document.getElementById('result');
        this.summaryText = document.getElementById('summaryText');
        this.error = document.getElementById('error');
        this.successRateElement = document.getElementById('successRate');
        this.lastMethodElement = document.getElementById('lastMethod');
        
        // Event listeners
        this.summarizeBtn.addEventListener('click', () => this.handleSummarize());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSummarize();
        });
        
        // Initialisation
        this.initializeWhisperLocal();
        this.updateStats();
        
        // Exposer globalement
        window.youtubeSummarizer = this;
    }
    
    async initializeWhisperLocal() {
        try {
            console.log('🔄 Initialisation de Whisper local...');
            
            // Charge la bibliothèque Transformers.js
            if (!window.Transformers) {
                await this.loadTransformersLibrary();
            }
            
            // Initialise le pipeline de reconnaissance vocale
            this.whisperModel = await window.pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
            console.log('✅ Whisper local initialisé avec succès');
            
            this.updateTechBadge('Whisper Local', true);
            
        } catch (error) {
            console.log('❌ Whisper local non disponible:', error.message);
            this.updateTechBadge('Whisper Local', false);
        }
    }
    
    loadTransformersLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
            script.type = 'module';
            
            script.onload = () => {
                // Attendre que la bibliothèque soit prête
                const checkLibrary = () => {
                    if (window.pipeline) {
                        resolve();
                    } else {
                        setTimeout(checkLibrary, 100);
                    }
                };
                checkLibrary();
            };
            
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    updateTechBadge(tech, isActive) {
        const badges = document.querySelectorAll('.tech-badge');
        badges.forEach(badge => {
            if (badge.textContent.includes(tech)) {
                badge.classList.toggle('active', isActive);
            }
        });
    }
    
    async handleSummarize() {
        const url = this.urlInput.value.trim();
        
        if (!url) {
            this.showError('Veuillez entrer une URL YouTube valide');
            return;
        }
        
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            this.showError('URL YouTube invalide');
            return;
        }
        
        this.totalAttempts++;
        this.showLoading('🔄 Démarrage de l\'analyse...');
        this.summarizeBtn.disabled = true;
        this.summarizeBtn.textContent = 'Analyse en cours...';
        
        try {
            const transcript = await this.getTranscriptMultiEngine(videoId, url);
            
            if (!transcript || transcript.length < 50) {
                throw new Error('Transcript trop court ou vide');
            }
            
            this.showLoading('📝 Génération du résumé...');
            const summary = await this.generateSummary(transcript);
            
            this.successCount++;
            this.showResult(summary);
            this.updateStats();
            
        } catch (error) {
            console.error('Erreur:', error);
            this.showError(`Impossible d'analyser cette vidéo: ${error.message}`);
        }
    }
    
    async getTranscriptMultiEngine(videoId, videoUrl) {
        const engines = [
            { name: 'YouTube Manual', func: () => this.getYouTubeSubtitles(videoId, 'manual') },
            { name: 'YouTube Auto', func: () => this.getYouTubeSubtitles(videoId, 'auto') },
            { name: 'External API 1', func: () => this.getExternalTranscript1(videoId) },
            { name: 'External API 2', func: () => this.getExternalTranscript2(videoId) },
            { name: 'Assembly AI', func: () => this.getAssemblyAITranscript(videoUrl) },
            { name: 'Whisper Local', func: () => this.getWhisperLocalTranscript(videoUrl) },
            { name: 'Hugging Face Whisper', func: () => this.getHuggingFaceWhisper(videoUrl) }
        ];
        
        for (const engine of engines) {
            try {
                this.showLoading(`🔄 Tentative: ${engine.name}...`);
                this.updateProgressSteps(engine.name);
                
                const transcript = await engine.func();
                
                if (transcript && transcript.length > 100) {
                    console.log(`✅ Succès avec ${engine.name}`);
                    this.lastMethod = engine.name;
                    return transcript;
                }
                
            } catch (error) {
                console.log(`❌ ${engine.name} échoué:`, error.message);
                continue;
            }
        }
        
        throw new Error('Aucune méthode de transcription n\'a fonctionné');
    }
    
    async getYouTubeSubtitles(videoId, type = 'manual') {
        return new Promise((resolve, reject) => {
            // Utilise youtube-transcript via un proxy CORS
            const proxyUrl = 'https://api.allorigins.win/get?url=';
            const targetUrl = encodeURIComponent(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=fr${type === 'auto' ? '&fmt=srv3&kind=asr' : ''}`);
            
            fetch(proxyUrl + targetUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.contents) {
                        // Parse XML response
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
                        const textElements = xmlDoc.querySelectorAll('text');
                        
                        if (textElements.length === 0) {
                            reject(new Error('Pas de sous-titres trouvés'));
                            return;
                        }
                        
                        const transcript = Array.from(textElements)
                            .map(el => el.textContent)
                            .join(' ')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"');
                            
                        resolve(transcript);
                    } else {
                        reject(new Error('Réponse vide'));
                    }
                })
                .catch(reject);
        });
    }
    
    async getExternalTranscript1(videoId) {
        // Alternative API 1 - YouTube Transcript API
        try {
            const response = await fetch(`https://youtube-transcript3.p.rapidapi.com/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) throw new Error('API indisponible');
            
            const data = await response.json();
            
            if (data && data.transcript) {
                return data.transcript.map(item => item.text).join(' ');
            }
            
            throw new Error('Pas de transcript trouvé');
            
        } catch (error) {
            throw new Error(`External API 1 failed: ${error.message}`);
        }
    }
    
    async getExternalTranscript2(videoId) {
        // Alternative API 2 - Service gratuit
        try {
            const response = await fetch(`https://savesubs.com/action/extract?format=txt&lang=en&url=https://www.youtube.com/watch?v=${videoId}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) throw new Error('Service indisponible');
            
            const text = await response.text();
            
            if (text && text.length > 100) {
                return text;
            }
            
            throw new Error('Pas de contenu trouvé');
            
        } catch (error) {
            throw new Error(`External API 2 failed: ${error.message}`);
        }
    }
    
    async getAssemblyAITranscript(videoUrl) {
        if (!this.assemblyApiKey) {
            this.assemblyApiKey = await this.promptForApiKey('Assembly AI');
            if (!this.assemblyApiKey) {
                throw new Error('Clé API Assembly AI requise');
            }
        }
        
        try {
            // Étape 1: Obtenir l'URL audio
            const audioUrl = await this.extractAudioUrl(videoUrl);
            
            // Étape 2: Upload vers Assembly AI
            const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
                method: 'POST',
                headers: {
                    'authorization': this.assemblyApiKey,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    audio_url: audioUrl
                })
            });
            
            const uploadData = await uploadResponse.json();
            
            // Étape 3: Démarrer la transcription
            const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
                method: 'POST',
                headers: {
                    'authorization': this.assemblyApiKey,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    audio_url: uploadData.upload_url,
                    language_code: 'fr'
                })
            });
            
            const transcriptData = await transcriptResponse.json();
            
            // Étape 4: Attendre la completion
            let result = await this.pollAssemblyAI(transcriptData.id);
            
            if (result.status === 'completed' && result.text) {
                return result.text;
            }
            
            throw new Error('Transcription échouée');
            
        } catch (error) {
            throw new Error(`Assembly AI failed: ${error.message}`);
        }
    }
    
    async pollAssemblyAI(transcriptId) {
        const maxAttempts = 60; // 5 minutes max
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                headers: {
                    'authorization': this.assemblyApiKey
                }
            });
            
            const result = await response.json();
            
            if (result.status === 'completed' || result.status === 'error') {
                return result;
            }
            
            // Attendre 5 secondes avant le prochain poll
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
            
            this.showLoading(`🔄 Assembly AI: Transcription en cours... (${attempts * 5}s)`);
        }
        
        throw new Error('Timeout Assembly AI');
    }
    
    async getWhisperLocalTranscript(videoUrl) {
        if (!this.whisperModel) {
            throw new Error('Whisper local non initialisé');
        }
        
        try {
            // Obtenir l'URL audio
            const audioUrl = await this.extractAudioUrl(videoUrl);
            
            // Télécharger et traiter l'audio
            const audioBuffer = await this.downloadAudio(audioUrl);
            
            // Transcription avec Whisper local
            const result = await this.whisperModel(audioBuffer, {
                language: 'french',
                return_timestamps: false
            });
            
            if (result && result.text) {
                return result.text;
            }
            
            throw new Error('Pas de texte généré');
            
        } catch (error) {
            throw new Error(`Whisper local failed: ${error.message}`);
        }
    }
    
    async getHuggingFaceWhisper(videoUrl) {
        if (!this.huggingFaceApiKey) {
            this.huggingFaceApiKey = await this.promptForApiKey('Hugging Face (gratuit)');
            if (!this.huggingFaceApiKey) {
                throw new Error('Clé API Hugging Face requise');
            }
        }
        
        try {
            const audioUrl = await this.extractAudioUrl(videoUrl);
            const audioBlob = await this.downloadAudioAsBlob(audioUrl);
            
            const response = await fetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.huggingFaceApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: audioBlob
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result && result.text) {
                return result.text;
            }
            
            throw new Error('Pas de transcription générée');
            
        } catch (error) {
            throw new Error(`Hugging Face Whisper failed: ${error.message}`);
        }
    }
    
    async extractAudioUrl(videoUrl) {
        // Utilise yt-dlp via une API proxy
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const ytDlpUrl = encodeURIComponent(`https://yt-dlp-api.herokuapp.com/info?url=${videoUrl}&format=bestaudio`);
        
        const response = await fetch(proxyUrl + ytDlpUrl);
        const data = await response.json();
        const info = JSON.parse(data.contents);
        
        if (info && info.url) {
            return info.url;
        }
        
        throw new Error('Impossible d\'extraire l\'audio');
    }
    
    async downloadAudio(audioUrl) {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        // Convertir en format compatible Whisper
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Convertir en Float32Array mono à 16kHz (format Whisper)
        const targetSampleRate = 16000;
        const length = Math.floor(audioBuffer.length * targetSampleRate / audioBuffer.sampleRate);
        const result = new Float32Array(length);
        
        // Rééchantillonnage simple
        const ratio = audioBuffer.length / result.length;
        for (let i = 0; i < result.length; i++) {
            const index = Math.floor(i * ratio);
            result[i] = audioBuffer.getChannelData(0)[index];
        }
        
        return result;
    }
    
    async downloadAudioAsBlob(audioUrl) {
        const response = await fetch(audioUrl);
        return await response.blob();
    }
    
    async generateSummary(transcript) {
        // Résumé intelligent avec plusieurs techniques
        const sentences = transcript.match(/[^\.!?]+[\.!?]+/g) || [transcript];
        
        if (sentences.length <= 3) {
            return transcript; // Trop court pour résumer
        }
        
        // Technique 1: Extraction des phrases clés
        const keyPhrases = this.extractKeyPhrases(sentences);
        
        // Technique 2: Résumé par fréquence des mots
        const frequencySummary = this.generateFrequencySummary(sentences);
        
        // Technique 3: Résumé structuré
        const structuredSummary = this.generateStructuredSummary(transcript);
        
        // Combinaison des techniques
        const finalSummary = `
🎯 **RÉSUMÉ PRINCIPAL**
${frequencySummary}

📋 **POINTS CLÉS**
${keyPhrases.map((phrase, index) => `${index + 1}. ${phrase}`).join('\n')}

📊 **ANALYSE STRUCTURÉE**
${structuredSummary}

⏱️ **Longueur originale:** ${transcript.split(' ').length} mots
📝 **Résumé:** ${finalSummary.split(' ').length} mots
🔄 **Méthode utilisée:** ${this.lastMethod}
        `.trim();
        
        return finalSummary;
    }
    
    extractKeyPhrases(sentences) {
        // Scores des phrases basés sur les mots importants
        const stopWords = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'donc', 'car', 'ni', 'or', 'de', 'du', 'dans', 'sur', 'avec', 'pour', 'par', 'sans', 'sous', 'ce', 'cette', 'ces', 'il', 'elle', 'ils', 'elles', 'je', 'tu', 'nous', 'vous', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'être', 'avoir', 'faire', 'aller', 'venir', 'dire', 'voir', 'savoir', 'pouvoir', 'falloir', 'vouloir', 'devoir']);
        
        const wordFreq = {};
        const allWords = sentences.join(' ').toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
        
        // Compter la fréquence des mots (hors mots vides)
        allWords.forEach(word => {
            if (word.length > 3 && !stopWords.has(word)) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });
        
        // Scorer les phrases
        const sentenceScores = sentences.map(sentence => {
            const words = sentence.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
            const score = words.reduce((sum, word) => {
                return sum + (wordFreq[word] || 0);
            }, 0);
            return { sentence: sentence.trim(), score };
        });
        
        // Retourner les 5 meilleures phrases
        return sentenceScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(item => item.sentence);
    }
    
    generateFrequencySummary(sentences) {
        if (sentences.length <= 5) {
            return sentences.join(' ').substring(0, 300) + '...';
        }
        
        // Prendre la première phrase, quelques phrases du milieu, et la dernière
        const summary = [
            sentences[0], // Introduction
            ...sentences.slice(Math.floor(sentences.length * 0.3), Math.floor(sentences.length * 0.3) + 2), // Milieu
            sentences[sentences.length - 1] // Conclusion
        ].join(' ');
        
        return summary.length > 400 ? summary.substring(0, 400) + '...' : summary;
    }
    
    generateStructuredSummary(transcript) {
        const sections = [];
        
        // Détecter les thèmes principaux
        const themes = this.detectThemes(transcript);
        
        // Créer un résumé structuré
        if (themes.length > 0) {
            sections.push(`**Thèmes abordés:** ${themes.slice(0, 3).join(', ')}`);
        }
        
        // Statistiques
        const wordCount = transcript.split(' ').length;
        const avgWordsPerSentence = Math.round(wordCount / (transcript.split(/[.!?]/).length || 1));
        
        sections.push(`**Durée estimée:** ${Math.ceil(wordCount / 150)} minutes de lecture`);
        sections.push(`**Complexité:** ${avgWordsPerSentence > 15 ? 'Élevée' : avgWordsPerSentence > 10 ? 'Moyenne' : 'Simple'}`);
        
        return sections.join('\n');
    }
    
    detectThemes(text) {
        // Détection basique de thèmes
        const themes = [];
        const lowerText = text.toLowerCase();
        
        const themeKeywords = {
            'Technologie': ['technologie', 'numérique', 'internet', 'ordinateur', 'logiciel', 'application', 'digital'],
            'Éducation': ['apprendre', 'éducation', 'école', 'étudiant', 'formation', 'cours', 'enseignement'],
            'Business': ['entreprise', 'business', 'marché', 'vente', 'client', 'stratégie', 'marketing'],
            'Science': ['recherche', 'étude', 'scientifique', 'expérience', 'analyse', 'méthode'],
            'Art': ['art', 'créatif', 'design', 'esthétique', 'beauté', 'style'],
            'Santé': ['santé', 'médecine', 'médical', 'traitement', 'bien-être', 'thérapie']
        };
        
        Object.entries(themeKeywords).forEach(([theme, keywords]) => {
            const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
            if (matches >= 2) {
                themes.push(theme);
            }
        });
        
        return themes;
    }
    
    async promptForApiKey(serviceName) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>🔑 Clé API ${serviceName}</h3>
                    <p>Pour utiliser ${serviceName}, veuillez entrer votre clé API:</p>
                    <input type="text" class="modal-input" id="apiKeyInput" placeholder="Votre clé API...">
                    <p style="font-size: 0.9em; color: #666; margin: 10px 0;">
                        ${serviceName === 'Assembly AI' ? 
                            '💡 Assembly AI offre 5 heures gratuites par mois' : 
                            '💡 Hugging Face est gratuit avec inscription'
                        }
                    </p>
                    <div class="modal-buttons">
                        <button class="modal-btn primary" onclick="this.closest('.modal-overlay').apiKeyResolve(document.getElementById('apiKeyInput').value)">
                            Valider
                        </button>
                        <button class="modal-btn secondary" onclick="this.closest('.modal-overlay').apiKeyResolve(null)">
                            Ignorer
                        </button>
                    </div>
                </div>
            `;
            
            modal.apiKeyResolve = (value) => {
                document.body.removeChild(modal);
                resolve(value);
            };
            
            document.body.appendChild(modal);
            
            // Focus sur l'input
            setTimeout(() => {
                document.getElementById('apiKeyInput').focus();
            }, 100);
            
            // Validation avec Entrée
            document.getElementById('apiKeyInput').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    modal.apiKeyResolve(e.target.value);
                }
            });
        });
    }
    
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        
        return null;
    }
    
    updateProgressSteps(currentStep) {
        const steps = document.querySelectorAll('.step');
        steps.forEach(step => {
            step.classList.remove('active', 'completed');
        });
        
        const stepMap = {
            'YouTube Manual': 0,
            'YouTube Auto': 0,
            'External API 1': 0,
            'External API 2': 0,
            'Assembly AI': 1,
            'Whisper Local': 1,
            'Hugging Face Whisper': 1
        };
        
        const currentStepIndex = stepMap[currentStep] || 0;
        
        steps.forEach((step, index) => {
            if (index < currentStepIndex) {
                step.classList.add('completed');
            } else if (index === currentStepIndex) {
                step.classList.add('active');
            }
        });
    }
    
    updateStats() {
        if (this.successRateElement && this.lastMethodElement) {
            const rate = this.totalAttempts > 0 ? Math.round((this.successCount / this.totalAttempts) * 100) : 0;
            this.successRateElement.textContent = `${rate}%`;
            this.lastMethodElement.textContent = this.lastMethod;
        }
    }
    
    showLoading(message) {
        this.hideAllSections();
        this.loading.querySelector('p').textContent = message;
        this.loading.classList.remove('hidden');
    }
    
    showResult(summary) {
        this.hideAllSections();
        this.summaryText.textContent = summary;
        this.result.classList.remove('hidden');
        this.summarizeBtn.disabled = false;
        this.summarizeBtn.textContent = 'Résumer 🚀';
    }
    
    showError(message) {
        this.hideAllSections();
        
        const suggestions = [
            { title: 'TED Talk Français', url: 'https://www.youtube.com/watch?v=UyyjU8fzEYU' },
            { title: 'Cours MIT', url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc' },
            { title: 'Conférence Science', url: 'https://www.youtube.com/watch?v=aircAruvnKk' }
        ];
        
        this.error.innerHTML = `
            <div class="error-content">
                ❌ <strong>${message}</strong>
                
                <div style="margin: 20px 0; padding: 20px; background: #fff3cd; border-radius: 12px; border-left: 4px solid #ffc107;">
                    <h4 style="margin-bottom: 15px; color: #856404;">🔧 Méthodes testées automatiquement:</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px;">
                        <div style="padding: 8px; background: white; border-radius: 6px; font-size: 0.9em;">📺 Sous-titres YouTube</div>
                        <div style="padding: 8px; background: white; border-radius: 6px; font-size: 0.9em;">🤖 IA Auto-caption</div>
                        <div style="padding: 8px; background: white; border-radius: 6px; font-size: 0.9em;">🎙️ Assembly AI</div>
                        <div style="padding: 8px; background: white; border-radius: 6px; font-size: 0.9em;">🧠 Whisper Local</div>
                        <div style="padding: 8px; background: white; border-radius: 6px; font-size: 0.9em;">☁️ APIs Externes</div>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <h4 style="margin-bottom: 10px;">💡 Essayez avec ces vidéos qui marchent:</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${suggestions.map(video => `
                            <button onclick="document.getElementById('youtubeUrl').value='${video.url}'; window.youtubeSummarizer.handleSummarize()" 
                                    style="padding: 8px 12px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85em;">
                                ${video.title}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        this.error.classList.remove('hidden');
        this.summarizeBtn.disabled = false;
        this.summarizeBtn.textContent = 'Résumer 🚀';
    }
    
    hideAllSections() {
        this.loading.classList.add('hidden');
        this.result.classList.add('hidden');
        this.error.classList.add('hidden');
    }
}

// ============================
// FONCTIONS UTILITAIRES GLOBALES
// ============================

function copyToClipboard() {
    const summaryText = document.getElementById('summaryText').textContent;
    navigator.clipboard.writeText(summaryText).then(() => {
        showToast('📋 Résumé copié dans le presse-papier !');
    }).catch(() => {
        // Fallback pour les navigateurs plus anciens
        const textArea = document.createElement('textarea');
        text
