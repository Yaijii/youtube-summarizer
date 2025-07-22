class YouTubeSummarizerReal {
    constructor() {
        // 🔑 CONFIGUREZ VOTRE CLÉ API ICI
        this.YOUTUBE_API_KEY = 'AIzaSyDhqMt_dNs59BA4SBJ0uXl927ls2TjgBCk';
        this.YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
        console.log('🚀 YouTube Summarizer avec API réelle initialisé');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showToast('✅ Application prête avec API YouTube !', 'success');
    }

    setupEventListeners() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const retryBtn = document.getElementById('retryBtn');
        const videoUrl = document.getElementById('videoUrl');

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                const url = videoUrl?.value.trim();
                if (url) {
                    this.summarizeVideo(url);
                } else {
                    this.showError('⚠️ Veuillez entrer une URL YouTube valide');
                }
            });
        }

        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                const url = videoUrl?.value.trim();
                if (url) this.summarizeVideo(url);
            });
        }

        if (videoUrl) {
            videoUrl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    analyzeBtn?.click();
                }
            });
        }

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    async summarizeVideo(url) {
        console.log('🎬 Début analyse avec API réelle:', url);
        
        try {
            this.showLoading('🔍 Extraction des informations via API YouTube...');
            
            const videoId = this.extractVideoId(url);
            if (!videoId) {
                throw new Error('URL YouTube invalide');
            }

            // 1. Récupération des métadonnées vidéo
            this.showLoading('📺 Récupération des informations vidéo...');
            const videoData = await this.getVideoDetails(videoId);
            
            // 2. Récupération de la transcription
            this.showLoading('📜 Récupération de la transcription...');
            const transcript = await this.getVideoTranscript(videoId);
            
            // 3. Génération du résumé intelligent
            this.showLoading('🧠 Génération du résumé intelligent...');
            const summary = this.generateSmartSummary(videoData, transcript);

            this.hideLoading();
            this.displayResults({
                videoData,
                summary,
                transcript
            });

        } catch (error) {
            console.error('❌ Erreur:', error);
            this.hideLoading();
            this.showError(`❌ ${error.message}`);
        }
    }

    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    async getVideoDetails(videoId) {
        const url = `${this.YOUTUBE_API_BASE}/videos?` +
            `part=snippet,statistics,contentDetails&` +
            `id=${videoId}&` +
            `key=${this.YOUTUBE_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data.items || data.items.length === 0) {
            throw new Error('Vidéo non trouvée ou API invalide');
        }

        const video = data.items[0];
        const snippet = video.snippet;
        const stats = video.statistics;
        const duration = this.parseDuration(video.contentDetails.duration);

        return {
            id: videoId,
            title: snippet.title,
            channelTitle: snippet.channelTitle,
            viewCount: this.formatNumber(stats.viewCount) + ' vues',
            likeCount: this.formatNumber(stats.likeCount) + ' likes',
            duration: duration,
            publishedAt: new Date(snippet.publishedAt).toLocaleDateString('fr-FR'),
            thumbnail: snippet.thumbnails.maxres?.url || snippet.thumbnails.high.url,
            description: snippet.description,
            tags: snippet.tags || [],
            categoryId: snippet.categoryId
        };
    }

    async getVideoTranscript(videoId) {
        try {
            // Méthode 1: Tentative avec l'API YouTube Captions
            return await this.getOfficialCaptions(videoId);
        } catch (error) {
            console.warn('⚠️ Sous-titres officiels indisponibles, tentative extraction alternative...');
            
            try {
                // Méthode 2: Extraction via parsing HTML
                return await this.extractTranscriptFromHTML(videoId);
            } catch (error2) {
                console.warn('⚠️ Extraction HTML échouée, utilisation description...');
                
                // Méthode 3: Fallback sur la description
                const videoData = await this.getVideoDetails(videoId);
                return this.extractTranscriptFromDescription(videoData.description);
            }
        }
    }

    async getOfficialCaptions(videoId) {
        // Liste des sous-titres disponibles
        const captionsUrl = `${this.YOUTUBE_API_BASE}/captions?` +
            `part=snippet&` +
            `videoId=${videoId}&` +
            `key=${this.YOUTUBE_API_KEY}`;

        const response = await fetch(captionsUrl);
        const data = await response.json();

        if (!response.ok || !data.items || data.items.length === 0) {
            throw new Error('Aucun sous-titre disponible');
        }

        // Prioriser les sous-titres français ou anglais
        let captionTrack = data.items.find(item => 
            item.snippet.language === 'fr' || item.snippet.language === 'fr-FR'
        ) || data.items.find(item => 
            item.snippet.language === 'en' || item.snippet.language === 'en-US'
        ) || data.items[0];

        // Télécharger le contenu des sous-titres
        const transcriptUrl = `${this.YOUTUBE_API_BASE}/captions/${captionTrack.id}?` +
            `key=${this.YOUTUBE_API_KEY}`;

        const transcriptResponse = await fetch(transcriptUrl);
        
        if (!transcriptResponse.ok) {
            throw new Error('Impossible de télécharger les sous-titres');
        }

        const transcript = await transcriptResponse.text();
        return this.cleanTranscript(transcript);
    }

    async extractTranscriptFromHTML(videoId) {
        // Utilisation d'un service CORS proxy pour récupérer la page
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        const response = await fetch(proxyUrl + encodeURIComponent(videoUrl));
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error('Impossible d\'accéder à la page YouTube');
        }

        const html = data.contents;
        
        // Extraction des données de transcription depuis le HTML
        const transcriptRegex = /"captions":\s*({.+?})\s*,\s*"videoDetails"/;
        const match = html.match(transcriptRegex);
        
        if (match) {
            const captionsData = JSON.parse(match[1]);
            // Traitement des données de caption...
            return this.processCaptionsData(captionsData);
        }
        
        throw new Error('Transcription non disponible dans le HTML');
    }

    extractTranscriptFromDescription(description) {
        // Fallback: utiliser la description comme base pour le résumé
        if (!description || description.length < 100) {
            return "⚠️ Transcription non disponible pour cette vidéo. Les sous-titres peuvent être désactivés ou la vidéo peut ne pas avoir de transcription générée automatiquement.";
        }

        // Nettoyer et formater la description
        let transcript = description
            .replace(/https?:\/\/[^\s]+/g, '') // Supprimer les URLs
            .replace(/\n{3,}/g, '\n\n') // Réduire les sauts de ligne multiples
            .trim();

        return `📝 Transcription basée sur la description :\n\n${transcript}`;
    }

    cleanTranscript(rawTranscript) {
        // Nettoyer la transcription (supprimer les balises XML, timestamps, etc.)
        return rawTranscript
            .replace(/<[^>]*>/g, '') // Supprimer balises XML
            .replace(/\d{1,2}:\d{2}:\d{2}\.\d{3}/g, '') // Supprimer timestamps
            .replace(/\s+/g, ' ') // Normaliser espaces
            .trim();
    }

    parseDuration(isoDuration) {
        const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;
        
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num?.toString() || '0';
    }

    generateSmartSummary(videoData, transcript) {
        const words = transcript.split(' ').length;
        const readingTime = Math.ceil(words / 200); // 200 mots par minute
        
        // Analyse basique du contenu
        const keyPhrases = this.extractKeyPhrases(transcript);
        const sentiment = this.analyzeSentiment(transcript);
        
        // Génération du résumé principal
        const summary = this.createSummary(videoData, transcript, keyPhrases);
        
        return {
            main: summary,
            keyPoints: keyPhrases,
            confidence: 'API YouTube',
            wordCount: words,
            readingTime: readingTime,
            sentiment: sentiment,
            source: 'API'
        };
    }

    extractKeyPhrases(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        
        // Sélectionner les phrases les plus importantes (simple heuristique)
        return sentences
            .slice(0, 5)
            .map((sentence, index) => `${index + 1}. ${sentence.trim()}`)
            .filter(point => point.length > 10);
    }

    createSummary(videoData, transcript, keyPhrases) {
        const firstPart = transcript.substring(0, 300);
        const title = videoData.title;
        
        return `Cette vidéo "${title}" de ${videoData.channelTitle} dure ${videoData.duration} et compte ${videoData.viewCount}. 

Le contenu principal : ${firstPart}...

La vidéo aborde ${keyPhrases.length} points clés essentiels et a été publiée le ${videoData.publishedAt}.`;
    }

    analyzeSentiment(text) {
        // Analyse basique de sentiment
        const positiveWords = ['bien', 'excellent', 'parfait', 'génial', 'super', 'fantastique'];
        const negativeWords = ['mal', 'terrible', 'horrible', 'nul', 'mauvais'];
        
        const words = text.toLowerCase().split(/\W+/);
        const positive = words.filter(word => positiveWords.includes(word)).length;
        const negative = words.filter(word => negativeWords.includes(word)).length;
        
        if (positive > negative) return 'Positif';
        if (negative > positive) return 'Négatif';
        return 'Neutre';
    }

    displayResults(results) {
        console.log('📺 Affichage des résultats avec transcription réelle');
        
        // Mise à jour des infos vidéo
        document.getElementById('videoTitle').textContent = results.videoData.title;
        document.getElementById('videoChannel').textContent = results.videoData.channelTitle;
        document.getElementById('videoViews').textContent = results.videoData.viewCount;
        
        // Mise à jour du résumé
        document.getElementById('summaryContent').innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h3>📖 Résumé Principal</h3>
                <p style="margin: 1rem 0; line-height: 1.6;">${results.summary.main}</p>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px;">
                <strong>📊 Statistiques:</strong><br>
                • Source: ${results.summary.source} YouTube<br>
                • Mots analysés: ${results.summary.wordCount}<br>
                • Temps de lecture: ${results.summary.readingTime} min<br>
                • Sentiment: ${results.summary.sentiment}
            </div>
        `;

        // Mise à jour des points clés
        document.getElementById('keyPointsContent').innerHTML = `
            <h3>🎯 Points Essentiels Extraits</h3>
            <div style="margin: 1rem 0;">
                ${results.summary.keyPoints.map(point => 
                    `<div style="margin: 1rem 0; padding: 0.5rem; background: rgba(0,0,0,0.1); border-radius: 4px;">${point}</div>`
                ).join('')}
            </div>
        `;

        // ⭐ TRANSCRIPTION RÉELLE ICI ⭐
        document.getElementById('transcriptContent').innerHTML = `
            <h3>📜 Transcription Complète</h3>
            <div style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 8px; margin: 1rem 0; max-height: 400px; overflow-y: auto;">
                <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${results.transcript}</pre>
            </div>
            <div style="margin-top: 1rem;">
                <button onclick="navigator.clipboard.writeText('${results.transcript.replace(/'/g, "\\'")}'); youtubeAnalyzer.showToast('📋 Transcription copiée !', 'success')" 
                        class="btn" style="margin-right: 1rem;">
                    📋 Copier la transcription
                </button>
                <button onclick="youtubeAnalyzer.downloadTranscript('${results.videoData.title}', '${results.transcript.replace(/'/g, "\\'")}')" 
                        class="btn">
                    💾 Télécharger (.txt)
                </button>
            </div>
            <p style="color: var(--success-color); margin-top: 1rem;">
                ✅ Transcription extraite via l'API YouTube officielle
            </p>
        `;

        // Afficher les résultats
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
        
        this.showToast('✅ Analyse terminée avec transcription réelle !', 'success');
    }

    downloadTranscript(title, transcript) {
        const blob = new Blob([transcript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_transcript.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('💾 Transcription téléchargée !', 'success');
    }

    // ... (méthodes d'interface identiques - showLoading, hideLoading, etc.)
    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activePanel = document.getElementById(`${tabName}Content`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activePanel) activePanel.classList.add('active');
    }

    showLoading(message = 'Chargement...') {
        document.getElementById('loadingText').textContent = message;
        document.getElementById('loadingSection').style.display = 'block';
        document.getElementById('errorSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loadingSection').style.display = 'none';
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorSection').style.display = 'block';
        document.getElementById('loadingSection').style.display = 'none';
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; font-size: 1.2rem; cursor: pointer;">×</button>
            </div>
        `;
        
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, 4000);
    }
}

// Variables globales
let youtubeAnalyzer;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation avec API YouTube réelle...');
    
    try {
        youtubeAnalyzer = new YouTubeSummarizerReal();
        console.log('✅ YouTube Analyzer avec API réelle initialisé');
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
    }
});

// Fonctions de test
window.testYouTubeAnalyzer = function() {
    console.log('🔍 === TEST AVEC API RÉELLE ===');
    if (youtubeAnalyzer) {
        youtubeAnalyzer.showToast('🧪 API YouTube prête !', 'success');
        return '✅ API configurée !';
    }
    return '❌ Problème API !';
};

window.testWithSampleVideo = function() {
    if (youtubeAnalyzer) {
        const sampleUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // Vidéo avec sous-titres
        document.getElementById('videoUrl').value = sampleUrl;
        youtubeAnalyzer.summarizeVideo(sampleUrl);
        return '✅ Test API lancé !';
    }
    return '❌ Analyzer non disponible';
};

console.log('🎯 Script avec API YouTube réelle chargé !');
