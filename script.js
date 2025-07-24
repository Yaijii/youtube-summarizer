// 🔥 YOUTUBE TRANSCRIPT RÉEL - Version GitHub
console.log('🚀 YouTube Transcript RÉEL initialisé');

class RealYouTubeTranscript {
    constructor() {
        // API backend gratuite (on va utiliser un proxy)
        this.API_ENDPOINTS = [
            'https://api.allorigins.win/raw?url=',  // Proxy CORS gratuit
            'https://cors-anywhere.herokuapp.com/', // Backup
        ];
        this.init();
    }

    // 🎯 VRAIE EXTRACTION via l'API YouTube interne
    async extractRealTranscript(videoUrl) {
        try {
            this.showLoading('🔥 Extraction RÉELLE en cours...');
            
            const videoId = this.extractVideoId(videoUrl);
            if (!videoId) {
                throw new Error('URL YouTube invalide');
            }

            console.log(`🎬 Extraction pour: ${videoId}`);

            // Méthode 1: API interne YouTube (souvent fonctionne)
            let transcript = await this.tryYouTubeInternalAPI(videoId);
            
            if (!transcript) {
                // Méthode 2: Scraping des captions
                transcript = await this.scrapeCaptions(videoId);
            }

            if (transcript) {
                this.displayTranscript(transcript, videoId);
                return { success: true, transcript, videoId };
            } else {
                throw new Error('Aucune transcription disponible pour cette vidéo');
            }

        } catch (error) {
            console.error('❌ Erreur extraction:', error);
            this.showError(`Erreur: ${error.message}`);
            return { success: false, error: error.message };
        } finally {
            this.hideLoading();
        }
    }

    // 🔧 Méthode 1: API interne YouTube
    async tryYouTubeInternalAPI(videoId) {
        try {
            const captionUrl = `https://www.youtube.com/api/timedtext?lang=fr&v=${videoId}`;
            const proxiedUrl = this.API_ENDPOINTS[0] + encodeURIComponent(captionUrl);
            
            const response = await fetch(proxiedUrl);
            if (response.ok) {
                const xmlText = await response.text();
                return this.parseXMLCaptions(xmlText);
            }
        } catch (error) {
            console.log('API interne échouée, essai scraping...');
        }
        return null;
    }

    // 🔧 Méthode 2: Scraping intelligent
    async scrapeCaptions(videoId) {
        try {
            // Récupérer la page YouTube
            const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const proxiedUrl = this.API_ENDPOINTS[0] + encodeURIComponent(pageUrl);
            
            const response = await fetch(proxiedUrl);
            const html = await response.text();
            
            // Extraire les URLs de captions du HTML
            const captionRegex = /"captionTracks":

$$
(.*?)
$$

/;
            const match = html.match(captionRegex);
            
            if (match) {
                const captionsData = JSON.parse(`[${match[1]}]`);
                const frenchCaption = captionsData.find(c => c.languageCode === 'fr') || captionsData[0];
                
                if (frenchCaption) {
                    const captionResponse = await fetch(this.API_ENDPOINTS[0] + encodeURIComponent(frenchCaption.baseUrl));
                    const xmlText = await captionResponse.text();
                    return this.parseXMLCaptions(xmlText);
                }
            }
        } catch (error) {
            console.log('Scraping échoué:', error);
        }
        return null;
    }

    // 🔧 Parser XML des captions
    parseXMLCaptions(xmlText) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const textElements = xmlDoc.getElementsByTagName('text');
            
            let transcript = '';
            for (let element of textElements) {
                const text = element.textContent || element.innerText;
                transcript += text.replace(/\n/g, ' ') + ' ';
            }
            
            return transcript.trim();
        } catch (error) {
            console.error('Erreur parsing XML:', error);
            return null;
        }
    }

    // 🔧 Extraire ID vidéo
    extractVideoId(url) {
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

    // 🎨 Interface utilisateur
    displayTranscript(transcript, videoId) {
        // Créer ou mettre à jour l'affichage
        let resultsDiv = document.getElementById('transcriptResults');
        if (!resultsDiv) {
            resultsDiv = document.createElement('div');
            resultsDiv.id = 'transcriptResults';
            resultsDiv.style.cssText = `
                background: rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 2rem;
                margin: 2rem 0;
                border: 1px solid #4ecdc4;
            `;
            document.body.appendChild(resultsDiv);
        }

        resultsDiv.innerHTML = `
            <h3 style="color: #4ecdc4; margin-bottom: 1rem;">
                ✅ Transcription RÉELLE extraite (${videoId})
            </h3>
            <div style="background: rgba(0,0,0,0.3); padding: 1.5rem; border-radius: 8px; max-height: 400px; overflow-y: auto;">
                <p style="color: #fff; line-height: 1.6; margin: 0;">
                    ${transcript.substring(0, 2000)}${transcript.length > 2000 ? '...' : ''}
                </p>
            </div>
            <div style="margin-top: 1rem;">
                <button onclick="copyTranscript('${transcript.replace(/'/g, "\\'")}')">📋 Copier</button>
                <button onclick="downloadTranscript('${transcript.replace(/'/g, "\\'")}', '${videoId}')">💾 Télécharger</button>
            </div>
        `;

        this.showToast('✅ Transcription RÉELLE extraite !', 'success');
    }

    // 🔧 Fonctions utilitaires
    showLoading(message) {
        let loading = document.getElementById('loadingReal');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'loadingReal';
            loading.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8); color: #4ecdc4; padding: 2rem;
                border-radius: 12px; z-index: 9999; text-align: center;
            `;
            document.body.appendChild(loading);
        }
        loading.innerHTML = `<div style="font-size: 1.2rem;">${message}</div>`;
        loading.style.display = 'block';
    }

    hideLoading() {
        const loading = document.getElementById('loadingReal');
        if (loading) loading.style.display = 'none';
    }

    showError(message) {
        this.hideLoading();
        const error = document.createElement('div');
        error.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: #e74c3c; color: white; padding: 1rem;
            border-radius: 8px; max-width: 400px;
        `;
        error.textContent = message;
        document.body.appendChild(error);
        setTimeout(() => error.remove(), 5000);
    }

    showToast(message, type) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: ${type === 'success' ? '#27ae60' : '#3498db'};
            color: white; padding: 1rem; border-radius: 8px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    init() {
        // Fonctions globales
        window.extractRealTranscript = (url) => this.extractRealTranscript(url);
        window.testRealExtraction = () => {
            const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            this.extractRealTranscript(testUrl);
        };

        // Fonctions utilitaires globales
        window.copyTranscript = (text) => {
            navigator.clipboard.writeText(text);
            this.showToast('📋 Transcription copiée !', 'success');
        };

        window.downloadTranscript = (text, videoId) => {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transcript_${videoId}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('💾 Fichier téléchargé !', 'success');
        };
        
        console.log('✅ YouTube Transcript RÉEL prêt !');
        this.showToast('🔥 API réelle configurée !', 'success');
    }
}

// Initialisation automatique
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.realTranscript = new RealYouTubeTranscript();
    });
} else {
    window.realTranscript = new RealYouTubeTranscript();
}
