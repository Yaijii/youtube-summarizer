console.log('🔥 Chargement du script YouTube Transcript Extractor...');

class YouTubeTranscriptExtractor {
    constructor() {
        this.currentTranscript = '';
        this.currentVideoId = '';
        this.isLoading = false;
        
        // APIs proxy pour contourner CORS
        this.proxyApis = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/'
        ];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        console.log('🔧 Initialisation des event listeners...');
        
        // Attendre que le DOM soit chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.attachEvents());
        } else {
            this.attachEvents();
        }
    }

    attachEvents() {
        try {
            // Bouton extraire
            const extractBtn = document.getElementById('extractBtn');
            if (extractBtn) {
                extractBtn.addEventListener('click', () => this.extractTranscript());
            }

            // Bouton test
            const testBtn = document.getElementById('testBtn');
            if (testBtn) {
                testBtn.addEventListener('click', () => this.testWithSample());
            }

            // Bouton effacer
            const clearBtn = document.getElementById('clearBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clearResults());
            }

            // Bouton copier
            const copyBtn = document.getElementById('copyBtn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => this.copyTranscript());
            }

            // Bouton télécharger
            const downloadBtn = document.getElementById('downloadBtn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => this.downloadTranscript());
            }

            // Bouton traduire
            const translateBtn = document.getElementById('translateBtn');
            if (translateBtn) {
                translateBtn.addEventListener('click', () => this.translateTranscript());
            }

            // Bouton fermer erreur
            const hideErrorBtn = document.getElementById('hideErrorBtn');
            if (hideErrorBtn) {
                hideErrorBtn.addEventListener('click', () => this.hideError());
            }

            // Input URL - touche Entrée
            const videoInput = document.getElementById('videoUrl');
            if (videoInput) {
                videoInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.extractTranscript();
                    }
                });
            }

            console.log('✅ Event listeners attachés avec succès');
            this.showToast('🚀 Extracteur prêt ! Entrez une URL YouTube.', 'success');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'attachement des events:', error);
        }
    }

    // Extraction du video ID depuis l'URL
    extractVideoId(url) {
        if (!url) return null;
        
        // Patterns pour différents formats d'URL YouTube
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/ // ID direct
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        
        return null;
    }

    // Affichage du loading
    showLoading(message = '🔥 Extraction en cours...') {
        const loadingZone = document.getElementById('loadingZone');
        const errorZone = document.getElementById('errorZone');
        const resultsContainer = document.getElementById('resultsContainer');
        
        if (loadingZone) {
            loadingZone.style.display = 'block';
            loadingZone.querySelector('p').textContent = message;
        }
        if (errorZone) errorZone.style.display = 'none';
        if (resultsContainer) resultsContainer.style.display = 'none';
        
        this.isLoading = true;
        this.animateLoadingSteps();
    }

    // Animation des étapes de chargement
    animateLoadingSteps() {
        const steps = ['step1', 'step2', 'step3', 'step4'];
        steps.forEach((stepId, index) => {
            setTimeout(() => {
                const step = document.getElementById(stepId);
                if (step) {
                    step.style.opacity = '1';
                    step.style.color = '#27ae60';
                }
            }, index * 2000);
        });
    }

    // Masquer le loading
    hideLoading() {
        const loadingZone = document.getElementById('loadingZone');
        if (loadingZone) {
            loadingZone.style.display = 'none';
        }
        this.isLoading = false;
        
        // Reset des étapes
        const steps = ['step1', 'step2', 'step3', 'step4'];
        steps.forEach(stepId => {
            const step = document.getElementById(stepId);
            if (step) {
                step.style.opacity = '0.5';
                step.style.color = '#7f8c8d';
            }
        });
    }

    // Affichage d'erreur
    showError(message) {
        this.hideLoading();
        
        const errorZone = document.getElementById('errorZone');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorZone && errorMessage) {
            errorMessage.textContent = message;
            errorZone.style.display = 'block';
        }
        
        console.error('❌ Erreur:', message);
        this.showToast(`❌ ${message}`, 'error');
    }

    // Masquer l'erreur
    hideError() {
        const errorZone = document.getElementById('errorZone');
        if (errorZone) {
            errorZone.style.display = 'none';
        }
    }

    // Système de toast
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Animation d'apparition
        setTimeout(() => toast.classList.add('show'), 100);

        // Suppression automatique
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 3000);
    }

    // FONCTION PRINCIPALE D'EXTRACTION
    async extractTranscript() {
        const videoUrl = document.getElementById('videoUrl')?.value?.trim();
        
        if (!videoUrl) {
            this.showError('Veuillez entrer une URL YouTube valide');
            return;
        }

        const videoId = this.extractVideoId(videoUrl);
        if (!videoId) {
            this.showError('URL YouTube invalide. Format: https://youtube.com/watch?v=ID');
            return;
        }

        console.log(`🎬 Début extraction pour: ${videoId}`);
        this.showLoading('🔥 Extraction en cours...');

        try {
            // Méthode 1: API interne YouTube
            let transcript = await this.extractViaYouTubeAPI(videoId);
            
            if (!transcript) {
                // Méthode 2: Via page embed
                transcript = await this.extractViaEmbed(videoId);
            }

            if (!transcript) {
                // Méthode 3: Via scraping
                transcript = await this.extractViaScraping(videoId);
            }

            if (transcript) {
                this.displayTranscript(transcript, videoId);
                this.showToast('✅ Transcription extraite avec succès !', 'success');
            } else {
                throw new Error('Aucune transcription trouvée pour cette vidéo. Vérifiez que les sous-titres sont disponibles.');
            }

        } catch (error) {
            console.error('❌ Erreur extraction:', error);
            this.showError(error.message);
        }
    }

    // Méthode 1: API interne YouTube
    async extractViaYouTubeAPI(videoId) {
        try {
            console.log('🔍 Méthode 1: API YouTube interne...');
            
            // Langues à essayer
            const languages = ['fr', 'en', 'auto'];
            
            for (const lang of languages) {
                const url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3`;
                
                try {
                    const response = await this.fetchWithProxy(url);
                    if (response) {
                        const data = JSON.parse(response);
                        if (data.events && data.events.length > 0) {
                            console.log(`✅ Transcription trouvée en ${lang}`);
                            return this.parseYouTubeTranscript(data);
                        }
                    }
                } catch (e) {
                    console.log(`❌ Échec pour langue ${lang}:`, e.message);
                }
            }
            
            return null;
        } catch (error) {
            console.log('❌ Méthode 1 échouée:', error.message);
            return null;
        }
    }

    // Méthode 2: Via page embed
    async extractViaEmbed(videoId) {
        try {
            console.log('🔍 Méthode 2: Page embed...');
            
            const embedUrl = `https://www.youtube.com/embed/${videoId}`;
            const response = await this.fetchWithProxy(embedUrl);
            
            if (response) {
                // Rechercher les liens de captions dans le HTML
                const captionMatch = response.match(/"captionTracks":

$$
(.*?)
$$

/);
                if (captionMatch) {
                    const captions = JSON.parse('[' + captionMatch[1] + ']');
                    if (captions[0] && captions[0].baseUrl) {
                        const captionUrl = captions[0].baseUrl.replace(/\\u0026/g, '&');
                        const captionData = await this.fetchWithProxy(captionUrl);
                        if (captionData) {
                            return this.parseXMLTranscript(captionData);
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.log('❌ Méthode 2 échouée:', error.message);
            return null;
        }
    }

    // Méthode 3: Via scraping
    async extractViaScraping(videoId) {
        try {
            console.log('🔍 Méthode 3: Scraping page...');
            
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const response = await this.fetchWithProxy(videoUrl);
            
            if (response) {
                // Rechercher les données dans le script
                const scriptMatch = response.match(/var ytInitialPlayerResponse = ({.*?});/);
                if (scriptMatch) {
                    const playerData = JSON.parse(scriptMatch[1]);
                    const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                    
                    if (captions && captions[0]) {
                        const captionUrl = captions[0].baseUrl;
                        const captionData = await this.fetchWithProxy(captionUrl);
                        if (captionData) {
                            return this.parseXMLTranscript(captionData);
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.log('❌ Méthode 3 échouée:', error.message);
            return null;
        }
    }

    // Fetch avec proxy CORS
    async fetchWithProxy(url) {
        for (const proxy of this.proxyApis) {
            try {
                console.log(`🌐 Tentative avec proxy: ${proxy}`);
                const response = await fetch(proxy + encodeURIComponent(url), {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (response.ok) {
                    const text = await response.text();
                    console.log('✅ Réponse reçue, taille:', text.length);
                    return text;
                }
            } catch (error) {
                console.log(`❌ Proxy ${proxy} failed:`, error.message);
            }
        }
        
        throw new Error('Tous les proxies ont échoué');
    }

    // Parser transcription YouTube (JSON)
    parseYouTubeTranscript(data) {
        try {
            let transcript = '';
            
            if (data.events) {
                for (const event of data.events) {
                    if (event.segs) {
                        for (const seg of event.segs) {
                            if (seg.utf8) {
                                transcript += seg.utf8 + ' ';
                            }
                        }
                    }
                }
            }
            
            return transcript.trim();
        } catch (error) {
            console.error('❌ Erreur parsing YouTube transcript:', error);
            return null;
        }
    }

    // Parser transcription XML
    parseXMLTranscript(xmlData) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
            const textElements = xmlDoc.querySelectorAll('text');
            
            let transcript = '';
            textElements.forEach(element => {
                transcript += element.textContent + ' ';
            });
            
            return transcript.trim();
        } catch (error) {
            console.error('❌ Erreur parsing XML:', error);
            return null;
        }
    }

    // Afficher la transcription
    displayTranscript(transcript, videoId) {
        this.hideLoading();
        this.currentTranscript = transcript;
        this.currentVideoId = videoId;

        const resultsContainer = document.getElementById('resultsContainer');
        const transcriptDisplay = document.getElementById('transcriptDisplay');
        const videoTitle = document.getElementById('videoTitle');

        if (resultsContainer && transcriptDisplay) {
            transcriptDisplay.textContent = transcript;
            resultsContainer.style.display = 'block';
            
            if (videoTitle) {
                videoTitle.textContent = `Video ID: ${videoId}`;
            }
            
            // Scroll vers les résultats
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        }

        console.log('✅ Transcription affichée, longueur:', transcript.length);
    }

    // Copier la transcription
    copyTranscript() {
        if (!this.currentTranscript) {
            this.showToast('Aucune transcription à copier', 'warning');
            return;
        }

        navigator.clipboard.writeText(this.currentTranscript).then(() => {
            this.showToast('📋 Transcription copiée !', 'success');
        }).catch(() => {
            // Fallback pour navigateurs plus anciens
            const textArea = document.createElement('textarea');
            textArea.value = this.currentTranscript;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('📋 Transcription copiée !', 'success');
        });
    }

    // Télécharger la transcription
    downloadTranscript() {
        if (!this.currentTranscript) {
            this.showToast('Aucune transcription à télécharger', 'warning');
            return;
        }

        const blob = new Blob([this.currentTranscript], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `transcript_${this.currentVideoId}_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('💾 Transcription téléchargée !', 'success');
    }

    // Traduire la transcription
    translateTranscript() {
        if (!this.currentTranscript) {
            this.showToast('Aucune transcription à traduire', 'warning');
            return;
        }

        const maxLength = 5000; // Limite Google Translate
        const text = this.currentTranscript.substring(0, maxLength);
        const googleTranslateUrl = `https://translate.google.com/?sl=auto&tl=fr&text=${encodeURIComponent(text)}`;
        
        window.open(googleTranslateUrl, '_blank');
        this.showToast('🌐 Ouverture de Google Translate...', 'info');
    }

    // Test avec vidéo d'exemple
    testWithSample() {
        // Vidéos avec sous-titres garantis
        const sampleUrls = [
            'dQw4w9WgXcQ', // Rick Roll
            'jNQXAC9IVRw', // Me at the zoo
            '9bZkp7q19f0'  // Gangnam Style
        ];
        
        const randomId = sampleUrls[Math.floor(Math.random() * sampleUrls.length)];
        const videoInput = document.getElementById('videoUrl');
        
        if (videoInput) {
            videoInput.value = `https://www.youtube.com/watch?v=${randomId}`;
            this.showToast('🧪 Test avec vidéo d\'exemple...', 'info');
            this.extractTranscript();
        }
    }

    // Effacer les résultats
    clearResults() {
        const containers = ['resultsContainer', 'errorZone', 'loadingZone'];
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });

        const videoInput = document.getElementById('videoUrl');
        if (videoInput) videoInput.value = '';
        
        this.currentTranscript = '';
        this.currentVideoId = '';
        
        this.showToast('🗑️ Résultats effacés', 'info');
    }
}

// Initialisation globale
let transcriptExtractor = null;

// Initialiser dès que possible
function initializeApp() {
    try {
        transcriptExtractor = new YouTubeTranscriptExtractor();
        console.log('🎉 Application initialisée avec succès !');
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
    }
}

// Démarrage
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('✅ Script YouTube Transcript Extractor chargé !');
