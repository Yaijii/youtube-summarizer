// ============================
// YOUTUBE SUMMARIZER - VERSION HYBRIDE GRATUITE
// ============================

class YouTubeSummarizer {
    constructor() {
        // 🔑 VOTRE CLÉ API YOUTUBE (pour métadonnées)
        this.YOUTUBE_API_KEY = 'AIzaSyDhqMt_dNs59BA4SBJ0uXl927ls2TjgBCk';
        
        this.loadingContainer = null;
        this.resultsContainer = null;
        
        console.log('🚀 YouTube Summarizer hybride initialisé');
    }

    // ============================
    // MÉTHODES DE TRANSCRIPTION HYBRIDE
    // ============================

    async getTranscriptHybrid(videoId) {
        console.log('🔄 Démarrage transcription hybride...');
        
        // MÉTHODE 1: Sous-titres YouTube (rapide)
        try {
            this.updateLoadingMessage('📝 Recherche sous-titres YouTube...');
            const transcript = await this.getYouTubeSubtitles(videoId);
            if (transcript && transcript.length > 100) {
                console.log('✅ Sous-titres YouTube trouvés !');
                return { 
                    text: transcript, 
                    method: 'YouTube Subtitles',
                    quality: 'Excellente'
                };
            }
        } catch (error) {
            console.log('⚠️ Méthode 1 échouée:', error.message);
        }
        
        // MÉTHODE 2: APIs alternatives gratuites
        try {
            this.updateLoadingMessage('🔄 Tentative APIs alternatives...');
            const transcript = await this.getTranscriptAlternatives(videoId);
            if (transcript && transcript.length > 100) {
                console.log('✅ Transcription alternative trouvée !');
                return { 
                    text: transcript, 
                    method: 'Alternative API',
                    quality: 'Bonne'
                };
            }
        } catch (error) {
            console.log('⚠️ Méthode 2 échouée:', error.message);
        }
        
        // MÉTHODE 3: Extraction audio + analyse (future implémentation)
        this.updateLoadingMessage('⚠️ Transcription impossible - métadonnées uniquement');
        console.log('❌ Aucune transcription disponible');
        return null;
    }

    // Méthode 1: Sous-titres YouTube officiels
    async getYouTubeSubtitles(videoId) {
        const apis = [
            {
                name: 'YouTube Transcript API 1',
                url: `https://youtube-transcript-api.wn.r.appspot.com/transcript?video_id=${videoId}`,
                parser: (data) => data.map(item => item.text).join(' ')
            },
            {
                name: 'YouTube Transcript API 2', 
                url: `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/api/timedtext?lang=fr&v=${videoId}`)}`,
                parser: (data) => this.parseXMLCaptions(data.contents)
            },
            {
                name: 'Transcript Proxy',
                url: `https://youtube-transcript-proxy.herokuapp.com/transcript?video_id=${videoId}`,
                parser: (data) => data.map(item => item.text).join(' ')
            }
        ];

        for (const api of apis) {
            try {
                console.log(`🔄 Test ${api.name}...`);
                const response = await fetch(api.url);
                
                if (!response.ok) continue;
                
                const data = await response.json();
                const transcript = api.parser(data);
                
                if (transcript && transcript.length > 50) {
                    console.log(`✅ ${api.name} réussie !`);
                    return transcript;
                }
            } catch (error) {
                console.log(`❌ ${api.name} échouée:`, error.message);
                continue;
            }
        }
        
        throw new Error('Aucune API de sous-titres disponible');
    }

    // Méthode 2: APIs alternatives
    async getTranscriptAlternatives(videoId) {
        const alternatives = [
            {
                name: 'Alternative 1',
                url: `https://transcriptapi.herokuapp.com/api/transcript/${videoId}`,
                parser: (data) => data.transcript
            },
            {
                name: 'Alternative 2', 
                url: `https://youtube-captions-api.herokuapp.com/api/captions?videoID=${videoId}`,
                parser: (data) => data.captions?.map(c => c.text).join(' ')
            }
        ];

        for (const alt of alternatives) {
            try {
                console.log(`🔄 Test ${alt.name}...`);
                const response = await fetch(alt.url);
                const data = await response.json();
                const transcript = alt.parser(data);
                
                if (transcript && transcript.length > 50) {
                    console.log(`✅ ${alt.name} réussie !`);
                    return transcript;
                }
            } catch (error) {
                console.log(`❌ ${alt.name} échouée:`, error.message);
                continue;
            }
        }
        
        throw new Error('Aucune alternative disponible');
    }

    // Parser XML des captions YouTube
    parseXMLCaptions(xmlString) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            const textNodes = xmlDoc.getElementsByTagName('text');
            
            let transcript = '';
            for (let node of textNodes) {
                transcript += node.textContent + ' ';
            }
            
            return transcript.trim();
        } catch (error) {
            console.log('⚠️ Erreur parsing XML:', error);
            return null;
        }
    }

    // ============================
    // ANALYSE PRINCIPALE
    // ============================

    async analyzeWithHybridMethod(videoId) {
        try {
            // 1. Métadonnées YouTube
            this.updateLoadingMessage('📡 Récupération métadonnées...');
            const metaUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${this.YOUTUBE_API_KEY}`;
            const metaResponse = await fetch(metaUrl);
            const metaData = await metaResponse.json();
            
            if (!metaData.items || metaData.items.length === 0) {
                throw new Error('Vidéo introuvable');
            }
            
            const video = metaData.items[0];
            
            // 2. Transcription hybride
            const transcriptResult = await this.getTranscriptHybrid(videoId);
            
            // 3. Génération résumé
            this.updateLoadingMessage('🎯 Génération du résumé...');
            
            if (transcriptResult) {
                return this.generateIntelligentSummary(video, transcriptResult);
            } else {
                return this.generateMetadataOnlySummary(video);
            }
            
        } catch (error) {
            throw new Error(`Erreur analyse: ${error.message}`);
        }
    }

    // ============================
    // GÉNÉRATION DE RÉSUMÉS
    // ============================

    generateIntelligentSummary(video, transcriptResult) {
        const snippet = video.snippet;
        const stats = video.statistics;
        const transcript = transcriptResult.text;
        
        // Analyse intelligent du contenu
        const analysis = this.analyzeContent(transcript);
        
        return `🎯 **RÉSUMÉ VIDÉO YOUTUBE (TRANSCRIPTION COMPLÈTE)**

**📺 "${snippet.title}"**
*Chaîne: ${snippet.channelTitle}*

📝 **RÉSUMÉ DU CONTENU**
${analysis.summary}

⭐ **POINTS CLÉS EXTRAITS**
${analysis.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

💡 **SUJETS PRINCIPAUX**
${analysis.topics.map(topic => `• ${topic}`).join('\n')}

📊 **STATISTIQUES OFFICIELLES**
• **👀 Vues :** ${this.formatNumber(stats.viewCount)}
• **👍 Likes :** ${this.formatNumber(stats.likeCount)}
• **💬 Commentaires :** ${this.formatNumber(stats.commentCount)}
• **⏱️ Durée :** ${this.parseDuration(video.contentDetails.duration)}
• **📅 Publié :** ${this.formatDate(snippet.publishedAt)}

🔍 **ANALYSE TECHNIQUE**
• **Méthode :** ${transcriptResult.method}
• **Qualité :** ${transcriptResult.quality}
• **Mots analysés :** ${transcript.split(' ').length.toLocaleString()}
• **Temps de lecture :** ~${Math.ceil(transcript.split(' ').length / 200)} min

🎉 **TRANSCRIPTION RÉUSSIE :** ${transcriptResult.quality}/5 ⭐`;
    }

    generateMetadataOnlySummary(video) {
        const snippet = video.snippet;
        const stats = video.statistics;

        return `🎯 **RÉSUMÉ VIDÉO YOUTUBE (MÉTADONNÉES UNIQUEMENT)**

**📺 "${snippet.title}"**
*Chaîne: ${snippet.channelTitle}*

📝 **DESCRIPTION**
${snippet.description ? snippet.description.substring(0, 300) + '...' : 'Aucune description disponible'}

📊 **STATISTIQUES**
• **👀 Vues :** ${this.formatNumber(stats.viewCount)}
• **👍 Likes :** ${this.formatNumber(stats.likeCount)}
• **💬 Commentaires :** ${this.formatNumber(stats.commentCount)}
• **⏱️ Durée :** ${this.parseDuration(video.contentDetails.duration)}
• **📅 Publié :** ${this.formatDate(snippet.publishedAt)}

⚠️ **LIMITATION**
Transcription automatique indisponible pour cette vidéo.
Résumé basé uniquement sur les métadonnées.`;
    }

    // Analyse intelligente du contenu
    analyzeContent(transcript) {
        const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
        
        // Points clés (premières phrases importantes)
        const keyPoints = sentences
            .slice(0, Math.min(5, Math.floor(sentences.length / 3)))
            .map(s => s.trim().substring(0, 100) + (s.length > 100 ? '...' : ''));
        
        // Résumé (début du contenu)
        const summary = transcript.substring(0, 400) + (transcript.length > 400 ? '...' : '');
        
        // Sujets (mots-clés fréquents)
        const words = transcript.toLowerCase().match(/\b\w+\b/g) || [];
        const wordFreq = {};
        words.forEach(word => {
            if (word.length > 4) wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
        
        const topics = Object.entries(wordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
        
        return { summary, keyPoints, topics };
    }

    // ============================
    // MÉTHODES D'INTERFACE
    // ============================

    async summarizeVideo(youtubeUrl) {
        try {
            this.showLoading();
            
            const videoId = this.extractVideoId(youtubeUrl);
            if (!videoId) {
                throw new Error('URL YouTube invalide');
            }
            
            this.updateLoadingMessage('🚀 Démarrage analyse hybride...');
            console.log('🎯 Analyse de:', videoId);
            
            const summary = await this.analyzeWithHybridMethod(videoId);
            this.showResults(summary);
            
        } catch (error) {
            console.error('❌ Erreur:', error);
            this.showError(error.message);
        }
    }

    extractVideoId(url) {
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
            /^[a-zA-Z0-9_-]{11}$/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1] || match[0];
        }
        
        return null;
    }

    showLoading() {
        this.hideResults();
        this.loadingContainer = document.getElementById('loadingContainer');
        this.loadingContainer.style.display = 'block';
        this.updateLoadingMessage('🔄 Initialisation...');
    }

    updateLoadingMessage(message) {
        const messageEl = document.getElementById('loadingMessage');
        if (messageEl) {
            messageEl.textContent = message;
            console.log(message);
        }
    }

    showResults(summary) {
        this.hideLoading();
        this.resultsContainer = document.getElementById('resultsContainer');
        const summaryContent = document.getElementById('summaryContent');
        
        summaryContent.innerHTML = this.formatSummary(summary);
        this.resultsContainer.style.display = 'block';
        
        // Scroll vers les résultats
        this.resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    showError(message) {
        this.hideLoading();
        this.resultsContainer = document.getElementById('resultsContainer');
        const summaryContent = document.getElementById('summaryContent');
        
        summaryContent.innerHTML = `
        <div class="error-container">
            <h3>❌ Erreur</h3>
            <p>${message}</p>
            <div class="retry-suggestions">
                <h4>💡 Suggestions :</h4>
                <ul>
                    <li>Vérifiez que l'URL YouTube est valide</li>
                    <li>Assurez-vous que la vidéo est publique</li>
                    <li>Vérifiez votre connexion internet</li>
                    <li>La vidéo doit avoir des sous-titres disponibles</li>
                </ul>
            </div>
        </div>`;
        
        this.resultsContainer.style.display = 'block';
    }

    formatSummary(summary) {
        return summary
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^(#{1,3})\s(.+)$/gm, '<h$1.length>$2</h$1.length>')
            .replace(/^\• (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n/g, '<br>');
    }

    formatNumber(num) {
        if (!num) return '0';
        return parseInt(num).toLocaleString('fr-FR');
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    parseDuration(duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 'Inconnue';

        const hours = match[1] || 0;
        const minutes = match[2] || 0;
        const seconds = match[3] || 0;

        if (hours > 0) return `${hours}h${minutes.toString().padStart(2, '0')}m${seconds.toString().padStart(2, '0')}s`;
        return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
    }

    hideLoading() {
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'none';
        }
    }

    hideResults() {
        if (this.resultsContainer) {
            this.resultsContainer.style.display = 'none';
        }
    }

    copyToClipboard() {
        const summaryContent = document.getElementById('summaryContent');
        const textToCopy = summaryContent.innerText;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const copyBtn = document.getElementById('copyBtn');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✅ Copié !';
            copyBtn.style.background = '#10B981';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '';
            }, 2000);
        });
    }

    newAnalysis() {
        this.hideResults();
        document.getElementById('youtubeUrl').value = '';
        document.getElementById('youtubeUrl').focus();
    }
}

// ============================
// INITIALISATION
// ============================

// Attendre le chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM chargé, initialisation...');
    
    // Créer l'instance globale
    window.summarizer = new YouTubeSummarizer();
    
    // Auto-focus sur le champ URL
    const urlInput = document.getElementById('youtubeUrl');
    if (urlInput) {
        urlInput.focus();
    }
    
    console.log('✅ YouTube Summarizer hybride prêt !');
});

// Fonctions globales pour HTML
function analyzevideo() {
    const youtubeUrl = document.getElementById('youtubeUrl').value.trim();
    if (!youtubeUrl) {
        alert('⚠️ Veuillez entrer une URL YouTube valide');
        return;
    }
    window.summarizer.summarizeVideo(youtubeUrl);
}

function copyToClipboard() {
    window.summarizer.copyToClipboard();
}

function newAnalysis() {
    window.summarizer.newAnalysis();
}

// Support Enter pour déclencher l'analyse
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.activeElement.id === 'youtubeUrl') {
        analyzevideo();
    }
});
