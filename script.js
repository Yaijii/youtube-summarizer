// 🚀 YOUTUBE TRANSCRIPT EXTRACTOR - VERSION RÉELLE
console.log('🔥 Initialisation YouTube Transcript Extractor...');

class YouTubeTranscriptExtractor {
    constructor() {
        this.currentTranscript = '';
        this.currentVideoId = '';
        this.isLoading = false;
        
        // APIs proxy pour contourner CORS
        this.proxyAPIs = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/'
        ];
        
        this.init();
    }

    // 🎯 Fonction principale d'extraction
    async extractTranscript(url = null) {
        try {
            if (this.isLoading) {
                this.showToast('⏳ Extraction déjà en cours...', 'warning');
                return;
            }

            // Récupérer l'URL
            if (!url) {
                url = document.getElementById('videoUrl').value.trim();
            }
            
            if (!url) {
                this.showError('Veuillez entrer une URL YouTube valide');
                return;
            }

            // Extraire l'ID vidéo
            const videoId = this.extractVideoId(url);
            if (!videoId) {
                this.showError('URL YouTube invalide. Format attendu: youtube.com/watch?v=... ou youtu.be/...');
                return;
            }

            this.currentVideoId = videoId;
            this.showLoading('🔍 Recherche des sous-titres...');
            
            console.log(`🎬 Extraction pour la vidéo: ${videoId}`);

            // Tentative d'extraction via plusieurs méthodes
            let transcript = await this.tryMultipleMethods(videoId);

            if (transcript && transcript.length > 50) {
                this.currentTranscript = transcript;
                this.displayTranscript(transcript, videoId);
                this.showToast('✅ Transcription extraite avec succès !', 'success');
            } else {
                throw new Error('Aucune transcription trouvée pour cette vidéo. Vérifiez que la vidéo a des sous-titres activés.');
            }

        } catch (error) {
            console.error('❌ Erreur extraction:', error);
            this.showError(error.message || 'Erreur lors de l\'extraction');
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    }

    // 🔧 Essayer plusieurs méthodes d'extraction
    async tryMultipleMethods(videoId) {
        const methods = [
            () => this.extractViaInternalAPI(videoId),
            () => this.extractViaPageScraping(videoId),
            () => this.extractViaAlternativeAPI(videoId)
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                this.updateLoadingText(`🔄 Méthode ${i + 1}/${methods.length}...`);
                const result = await methods[i]();
                if (result && result.length > 50) {
                    console.log(`✅ Succès avec la méthode ${i + 1}`);
                    return result;
                }
            } catch (error) {
                console.log(`❌ Méthode ${i + 1} échouée:`, error.message);
            }
        }

        return null;
    }

    // 🔧 Méthode 1: API interne YouTube
    async extractViaInternalAPI(videoId) {
        const languages = ['fr', 'en', 'auto'];
        
        for (const lang of languages) {
            try {
                const captionUrl = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=srv3`;
                const proxiedUrl = this.proxyAPIs[0] + encodeURIComponent(captionUrl);
                
                const response = await fetch(proxiedUrl);
                if (response.ok) {
                    const xmlText = await response.text();
                    const transcript = this.parseXMLCaptions(xmlText);
                    if (transcript) return transcript;
                }
            } catch (error) {
                console.log(`Langue ${lang} échouée:`, error.message);
            }
        }
        return null;
    }

    // 🔧 Méthode 2: Scraping de la page YouTube
    async extractViaPageScraping(videoId) {
        try {
            const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const proxiedUrl = this.proxyAPIs[0] + encodeURIComponent(pageUrl);
            
            const response = await fetch(proxiedUrl);
            const html = await response.text();
            
            // Chercher les données de captions dans le HTML
            const patterns = [
                /"captionTracks":\s*(

$$
[^
$$

]+\])/,
                /"captions":\s*\{[^}]*"playerCaptionsTracklistRenderer":\s*\{[^}]*"captionTracks":\s*(

$$
[^
$$

]+\])/
            ];

            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match) {
                    try {
                        const captionsData = JSON.parse(match[1]);
                        const preferredCaption = captionsData.find(c => 
                            c.languageCode === 'fr' || c.languageCode === 'en'
                        ) || captionsData[0];

                        if (preferredCaption && preferredCaption.baseUrl) {
                            const captionResponse = await fetch(this.proxyAPIs[0] + encodeURIComponent(preferredCaption.baseUrl));
                            const xmlText = await captionResponse.text();
                            return this.parseXMLCaptions(xmlText);
                        }
                    } catch (parseError) {
                        console.log('Erreur parsing captions:', parseError);
                    }
                }
            }
        } catch (error) {
            console.log('Scraping échoué:', error.message);
        }
        return null;
    }

    // 🔧 Méthode 3: API alternative
    async extractViaAlternativeAPI(videoId) {
        try {
            // Essayer avec une autre approche
            const alternativeUrl = `https://video.google.com/timedtext?lang=fr&v=${videoId}`;
            const proxiedUrl = this.proxyAPIs[1] + encodeURIComponent(alternativeUrl);
            
            const response = await fetch(proxiedUrl);
            if (response.ok) {
                const xmlText = await response.text();
                return this.parseXMLCaptions(xmlText);
            }
        } catch (error) {
            console.log('API alternative échouée:', error.message);
        }
        return null;
    }

    // 🔧 Parser XML des captions
    parseXMLCaptions(xmlText) {
        try {
            if (!xmlText || xmlText.length < 10) return null;

            // Nettoyer le XML
            const cleanXml = xmlText.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(cleanXml, 'text/xml');
            
            // Vérifier les erreurs de parsing
            if (xmlDoc.querySelector('parsererror')) {
                console.log('Erreur parsing XML');
                return null;
            }

            const textElements = xmlDoc.getElementsByTagName('text');
            
            if (textElements.length === 0) {
                // Essayer avec d'autres balises possibles
                const altElements = xmlDoc.getElementsByTagName('p') || xmlDoc.getElementsByTagName('body');
                if (altElements.length === 0) return null;
            }

            let transcript = '';
            for (let element of textElements) {
                let text = element.textContent || element.innerText || '';
                // Nettoyer le texte
                text = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                if (text) {
                    transcript += text + ' ';
                }
            }

            return transcript.trim();
        } catch (error) {
            console.error('Erreur parsing XML:', error);
            return null;
        }
    }

    // 🔧 Extraire l'ID vidéo de l'URL
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }

    // 🎨 Afficher la transcription
    displayTranscript(transcript, videoId) {
        const resultsContainer = document.getElementById('resultsContainer');
        const transcriptDisplay = document.getElementById('transcriptDisplay');
        
        // Afficher le container
        resultsContainer.style.display = 'block';
        
        // Créer l'affichage de la transcription
        transcriptDisplay.innerHTML = `
            <div class="transcript-header">
                <h4>📹 Vidéo: ${videoId}</h4>
                <p><strong>Longueur:</strong> ${transcript.length} caractères</p>
                <p><strong>Mots:</strong> ${transcript.split(' ').length} mots</p>
            </div>
            <div class="transcript-text">
                ${this.formatTranscript(transcript)}
            </div>
        `;

        // Scroll vers les résultats
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 🔧 Formater la transcription pour l'affichage
    formatTranscript(transcript) {
        // Ajouter des paragraphes à intervalles réguliers
        const words = transcript.split(' ');
        const paragraphs = [];
        
        for (let i = 0; i < words.length; i += 50) {
            const paragraph = words.slice(i, i + 50).join(' ');
            paragraphs.push(`<p>${paragraph}</p>`);
        }
        
        return paragraphs.join('');
    }

    // 🔧 Interface utilisateur
    showLoading(message) {
        this.isLoading = true;
        const loadingZone = document.getElementById('loadingZone');
        const loadingText = document.getElementById('loadingText');
        
        loadingText.textContent = message;
        loadingZone.style.display = 'block';
        
        // Cacher les autres zones
        document.getElementById('resultsContainer').style.display = 'none';
        document.getElementById('errorZone').style.display = 'none';
    }

    updateLoadingText(message) {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    hideLoading() {
        this.isLoading = false;
        document.getElementById('loadingZone').style.display = 'none';
    }

    showError(message) {
        const errorZone = document.getElementById('errorZone');
        const errorText = document.getElementById('errorText');
        
        errorText.textContent = message;
        errorZone.style.display = 'block';
        
        // Cacher les autres zones
        this.hideLoading();
        
        console.error('❌ Erreur:', message);
    }

    hideError() {
        document.getElementById('errorZone').style.display = 'none';
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Supprimer après 4 secondes
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }

    // 🔧 Fonctions utilitaires
    copyTranscript() {
        if (!this.currentTranscript) {
            this.showToast('Aucune transcription à copier', 'warning');
            return;
        }

        navigator.clipboard.writeText(this.currentTranscript).then(() => {
            this.showToast('📋 Transcription copiée !', 'success');
        }).catch(() => {
            this.showToast('❌ Erreur lors de la copie', 'error');
        });
    }

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

    translateTranscript() {
        if (!this.currentTranscript) {
            this.showToast('Aucune transcription à traduire', 'warning');
            return;
        }

        const googleTranslateUrl = `https://translate.google.com/?sl=auto&tl=fr&text=${encodeURIComponent(this.currentTranscript.substring(0, 5000))}`;
        window.open(googleTranslateUrl, '_blank');
        
        this.showToast('🌐 Ouverture de Google Translate...', 'info');
    }

    testWithSample() {
        // Vidéo de test avec sous-titres garantis
        const sampleUrls = [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll (a souvent des sous-titres)
            'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo
            'https://www.youtube.com/watch?v=9bZkp7q19f0'  // Gangnam Style
        ];
        
        const randomUrl = sampleUrls[Math.floor(Math.random() * sampleUrls.length)];
        document.getElementById('videoUrl').value = randomUrl;
        
        this.showToast('🧪 Test avec vidéo d\'exemple...', 'info');
        this.extractTranscript(randomUrl);
    }

    clearResults() {
        document.getElementById('resultsContainer').style.display = 'none';
        document.getElementById('errorZone').style.display = 'none';
        document.getElementById('loadingZone').style.display = 'none';
        document.getElementById('videoUrl').value = '';
        
        this.currentTranscript = '';
        this.currentVideoId = '';
        
        this.showToast('🗑️ Résultats effacés', 'info');
    }

    // 🎯 Initialisation
    init() {
        console.log('✅ YouTube Transcript Extractor initialisé');
        
        // Gestion de la touche Entrée
        const videoInput = document.getElementById('videoUrl');
        if (videoInput) {
            videoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.extractTranscript();
                }
            });
        }

        // Afficher un message de bienvenue
        setTimeout(() => {
            this.showToast('🚀 Extracteur prêt ! Entrez une URL YouTube.', 'success');
        }, 1000);
    }
}

// 🌟 INSTANCE GLOBALE ET FONCTIONS
let transcriptExtractor;

// Initialiser quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    transcriptExtractor = new YouTubeTranscriptExtractor();
    console.log('🔥 Application initialisée avec succès');
});

// 🎯 FONCTIONS GLOBALES POUR L'HTML
function extractTranscript() {
    if (transcriptExtractor) {
        transcriptExtractor.extractTranscript();
    } else {
        console.error('❌ Extracteur non initialisé');
    }
}

function testWithSample() {
    if (transcriptExtractor) {
        transcriptExtractor.testWithSample();
    }
}

function clearResults() {
    if (transcriptExtractor) {
        transcriptExtractor.clearResults();
    }
}

function copyTranscript() {
    if (transcriptExtractor) {
        transcriptExtractor.copyTranscript();
    }
}

function downloadTranscript() {
    if (transcriptExtractor) {
        transcriptExtractor.downloadTranscript();
    }
}

function translateTranscript() {
    if (transcriptExtractor) {
        transcriptExtractor.translateTranscript();
    }
}

function hideError() {
    if (transcriptExtractor) {
        transcriptExtractor.hideError();
    }
}

// 🔧 Fonctions utilitaires globales
window.extractTranscript = extractTranscript;
window.testWithSample = testWithSample;
window.clearResults = clearResults;
window.copyTranscript = copyTranscript;
window.downloadTranscript = downloadTranscript;
window.translateTranscript = translateTranscript;
window.hideError = hideError;

// 🐛 Gestion d'erreurs globales
window.addEventListener('error', (event) => {
    console.error('❌ Erreur globale:', event.error);
});

// 📊 Analytics simples (optionnel)
function trackUsage(action) {
    console.log(`📊 Action: ${action} - ${new Date().toISOString()}`);
}

console.log('🎉 Script YouTube Transcript Extractor chargé avec succès !');
