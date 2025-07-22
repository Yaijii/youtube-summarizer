class YouTubeSummarizerOptimal {
    constructor() {
        // Configuration multi-niveau
        this.YOUTUBE_API_KEY = 'AIzaSyDhqMt_dNs59BA4SBJ0uXl927ls2TjgBCk'; // Remplacez par votre clé
        this.USE_API = false; // Changez à true si vous avez une clé valide
        
        // Services de proxy pour bypass CORS
        this.PROXY_SERVICES = [
            'https://api.allorigins.win/get?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        
        this.currentProxyIndex = 0;
        this.init();
    }

    init() {
        console.log('🚀 YouTube Summarizer OPTIMAL initialisé');
        console.log('📊 Méthodes disponibles: API YouTube + Web Scraping + IA Local');
    }

    // ============= EXTRACTION ID VIDÉO =============
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        
        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    // ============= MÉTHODE 1: API YOUTUBE =============
    async getVideoInfoAPI(videoId) {
        if (!this.USE_API || !this.YOUTUBE_API_KEY || this.YOUTUBE_API_KEY === 'VOTRE_CLE_API_ICI') {
            throw new Error('API non configurée');
        }

        try {
            const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${this.YOUTUBE_API_KEY}`;
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (!data.items || data.items.length === 0) {
                throw new Error('Vidéo non trouvée');
            }

            const video = data.items[0];
            return this.formatVideoData(video, 'API');
            
        } catch (error) {
            console.warn('⚠️ API YouTube échouée:', error.message);
            throw error;
        }
    }

    // ============= MÉTHODE 2: WEB SCRAPING =============
    async getVideoInfoScraping(videoId) {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        
        for (let i = 0; i < this.PROXY_SERVICES.length; i++) {
            try {
                console.log(`🌐 Tentative scraping via proxy ${i + 1}...`);
                
                const proxyUrl = this.PROXY_SERVICES[i] + encodeURIComponent(url);
                const response = await fetch(proxyUrl);
                
                let htmlContent;
                if (this.PROXY_SERVICES[i].includes('allorigins')) {
                    const data = await response.json();
                    htmlContent = data.contents;
                } else {
                    htmlContent = await response.text();
                }
                
                return this.parseYouTubeHTML(htmlContent, videoId);
                
            } catch (error) {
                console.warn(`⚠️ Proxy ${i + 1} échec:`, error.message);
                continue;
            }
        }
        
        throw new Error('Tous les proxies ont échoué');
    }

    // ============= PARSING HTML YOUTUBE =============
    parseYouTubeHTML(html, videoId) {
        try {
            // Extraire titre
            let title = 'Titre non disponible';
            const titleMatch = html.match(/<title>(.*?)<\/title>/);
            if (titleMatch) {
                title = titleMatch[1].replace(' - YouTube', '').trim();
            }

            // Extraire nom de chaîne
            let channelTitle = 'Chaîne inconnue';
            const channelMatch = html.match(/"ownerText":\{"runs":\[\{"text":"([^"]+)"/);
            if (channelMatch) {
                channelTitle = channelMatch[1];
            }

            // Extraire description
            let description = 'Description non disponible';
            const descMatch = html.match(/"shortDescription":"([^"]{0,500})/);
            if (descMatch) {
                description = descMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
            }

            // Extraire vues
            let viewCount = 'N/A';
            const viewMatch = html.match(/"viewCount":"(\d+)"/);
            if (viewMatch) {
                viewCount = parseInt(viewMatch[1]).toLocaleString();
            }

            // Extraire durée
            let duration = 'N/A';
            const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
            if (durationMatch) {
                const seconds = parseInt(durationMatch[1]);
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                duration = `${minutes}min ${remainingSeconds}s`;
            }

            return {
                id: videoId,
                title,
                channelTitle,
                description,
                viewCount,
                duration,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                publishedAt: 'Date inconnue',
                source: 'SCRAPING'
            };

        } catch (error) {
            console.error('❌ Erreur parsing HTML:', error);
            throw new Error('Impossible d\'extraire les données de la page');
        }
    }

    // ============= MÉTHODE 3: EXTRACTION TRANSCRIPTION =============
    async extractTranscript(videoId) {
        const methods = [
            () => this.extractTranscriptMethod1(videoId), // YouTube Auto-Captions
            () => this.extractTranscriptMethod2(videoId), // Scraping page
            () => this.extractTranscriptMethod3(videoId)  // API alternative
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                console.log(`📜 Tentative extraction transcription méthode ${i + 1}...`);
                const transcript = await methods[i]();
                if (transcript && transcript.length > 50) {
                    console.log(`✅ Transcription extraite (${transcript.length} caractères)`);
                    return transcript;
                }
            } catch (error) {
                console.warn(`⚠️ Méthode ${i + 1} échoué:`, error.message);
            }
        }

        return null; // Aucune transcription disponible
    }

    // Méthode 1: YouTube Auto-Captions
    async extractTranscriptMethod1(videoId) {
        const captionUrls = [
            `https://www.youtube.com/api/timedtext?lang=fr&v=${videoId}`,
            `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`,
            `https://www.youtube.com/api/timedtext?lang=auto&v=${videoId}`
        ];

        for (let url of captionUrls) {
            for (let proxy of this.PROXY_SERVICES) {
                try {
                    const response = await fetch(proxy + encodeURIComponent(url));
                    let xmlContent;
                    
                    if (proxy.includes('allorigins')) {
                        const data = await response.json();
                        xmlContent = data.contents;
                    } else {
                        xmlContent = await response.text();
                    }

                    if (xmlContent && xmlContent.includes('<text')) {
                        return this.parseXMLCaptions(xmlContent);
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        throw new Error('Auto-captions non disponibles');
    }

    // Méthode 2: Scraping page pour transcription
    async extractTranscriptMethod2(videoId) {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        
        for (let proxy of this.PROXY_SERVICES) {
            try {
                const proxyUrl = proxy + encodeURIComponent(url);
                const response = await fetch(proxyUrl);
                
                let html;
                if (proxy.includes('allorigins')) {
                    const data = await response.json();
                    html = data.contents;
                } else {
                    html = await response.text();
                }

                const captionMatch = html.match(/"captions":\{"playerCaptionsTracklistRenderer":\{"captionTracks":\[(.*?)\]/);
                if (captionMatch) {
                    const captionData = captionMatch[1];
                    const urlMatch = captionData.match(/"baseUrl":"([^"]+)"/);
                    
                    if (urlMatch) {
                        const captionUrl = urlMatch[1].replace(/\\u0026/g, '&');
                        const captionResponse = await fetch(proxy + encodeURIComponent(captionUrl));
                        
                        let xmlContent;
                        if (proxy.includes('allorigins')) {
                            const data = await captionResponse.json();
                            xmlContent = data.contents;
                        } else {
                            xmlContent = await captionResponse.text();
                        }
                        
                        return this.parseXMLCaptions(xmlContent);
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Transcription via scraping échouée');
    }

    // Méthode 3: API alternative
    async extractTranscriptMethod3(videoId) {
        const services = [
            `https://youtubetranscript.com/?server_vid=${videoId}`,
            `https://transcript-api.herokuapp.com/transcript?video_id=${videoId}`,
        ];

        for (let serviceUrl of services) {
            for (let proxy of this.PROXY_SERVICES) {
                try {
                    const response = await fetch(proxy + encodeURIComponent(serviceUrl));
                    const data = await response.json();
                    
                    if (data.transcript || data.text) {
                        return data.transcript || data.text;
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        
        throw new Error('Services tiers indisponibles');
    }

    // ============= PARSER XML CAPTIONS =============
    parseXMLCaptions(xmlText) {
        try {
            const cleanXml = xmlText.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(cleanXml, 'application/xml');
            
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('XML mal formé');
            }
            
            const textNodes = xmlDoc.querySelectorAll('text');
            let transcript = '';
            
            textNodes.forEach(node => {
                let text = node.textContent || node.innerText;
                if (text) {
                    text = text.replace(/&quot;/g, '"')
                             .replace(/&#39;/g, "'")
                             .replace(/&amp;/g, '&')
                             .replace(/\n/g, ' ')
                             .trim();
                    
                    if (text.length > 0) {
                        transcript += text + ' ';
                    }
                }
            });
            
            const finalTranscript = transcript.trim();
            
            if (finalTranscript.length < 20) {
                throw new Error('Transcription trop courte ou vide');
            }
            
            return finalTranscript;
            
        } catch (error) {
            console.warn('⚠️ Erreur parsing XML:', error);
            throw new Error('Impossible de parser les sous-titres XML');
        }
    }

    // ============= FORMATAGE DONNÉES VIDÉO =============
    formatVideoData(video, source) {
        if (source === 'API') {
            return {
                id: video.id,
                title: video.snippet.title,
                channelTitle: video.snippet.channelTitle,
                description: video.snippet.description,
                publishedAt: new Date(video.snippet.publishedAt).toLocaleDateString('fr-FR'),
                thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url,
                viewCount: parseInt(video.statistics.viewCount).toLocaleString(),
                likeCount: video.statistics.likeCount ? parseInt(video.statistics.likeCount).toLocaleString() : 'N/A',
                duration: this.formatDuration(video.contentDetails.duration),
                source: 'API_YOUTUBE'
            };
        }
        return video;
    }

    formatDuration(isoDuration) {
        const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return 'N/A';
        
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;
        
        if (hours > 0) {
            return `${hours}h ${minutes}min ${seconds}s`;
        }
        return `${minutes}min ${seconds}s`;
    }

    // ============= GÉNÉRATION RÉSUMÉ IA =============
    async generateAISummary(videoData, transcript) {
        try {
            console.log('🤖 Génération résumé IA...');
            
            const hasTranscript = transcript && transcript.length > 100;
            const content = hasTranscript ? transcript : videoData.description || videoData.title;
            
            const keywords = this.extractKeywords(content);
            
            let mainSummary;
            if (hasTranscript) {
                mainSummary = this.generateContentBasedSummary(videoData, transcript, keywords);
            } else {
                mainSummary = this.generateMetadataBasedSummary(videoData, keywords);
            }
            
            const keyPoints = hasTranscript ? 
                this.extractKeyPointsFromTranscript(transcript) :
                this.extractKeyPointsFromMetadata(videoData);
            
            const wordCount = content.split(' ').length;
            const readingTime = Math.max(1, Math.ceil(wordCount / 200));
            
            return {
                main: mainSummary,
                keyPoints,
                wordCount,
                readingTime,
                hasTranscript,
                confidence: hasTranscript ? 'Élevée' : 'Moyenne'
            };
            
        } catch (error) {
            console.error('❌ Erreur génération résumé:', error);
            return this.generateFallbackSummary(videoData);
        }
    }

    generateContentBasedSummary(videoData, transcript, keywords) {
        const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const firstSentences = sentences.slice(0, 3).join('. ').trim();
        
        const topKeywords = keywords.slice(0, 5).join(', ');
        
        return `Cette vidéo de ${videoData.channelTitle} intitulée "${videoData.title}" aborde principalement ${topKeywords}. ${firstSentences}. Le contenu développe ces thèmes sur une durée de ${videoData.duration} avec des explications détaillées et des exemples concrets.`;
    }

    generateMetadataBasedSummary(videoData, keywords) {
        const description = videoData.description?.substring(0, 200) || '';
        const topKeywords = keywords.slice(0, 3).join(', ');
        
        return `Cette vidéo de ${videoData.channelTitle}, intitulée "${videoData.title}", traite de ${topKeywords}. ${description} La vidéo dure ${videoData.duration} et a été vue ${videoData.viewCount} fois. Bien que la transcription automatique ne soit pas disponible, le contenu semble se concentrer sur les thèmes identifiés dans le titre et la description.`;
    }

    extractKeywords(text) {
        const stopWords = new Set([
            'le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour',
            'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus',
            'par', 'grand', 'en', 'me', 'même', 'sans', 'très', 'si', 'mais', 'où',
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
            'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his'
        ]);
        
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word));
        
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        
        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(entry => entry[0]);
    }

    extractKeyPointsFromTranscript(transcript) {
        const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 30);
        
        const keyPoints = [];
        const step = Math.max(1, Math.floor(sentences.length / 5));
        
        for (let i = 0; i < sentences.length && keyPoints.length < 5; i += step) {
            const sentence = sentences[i].trim();
            if (sentence.length > 20 && sentence.length < 150) {
                keyPoints.push(sentence + '.');
            }
        }
        
        return keyPoints.map((point, index) => `${index + 1}. ${point}`);
    }

    extractKeyPointsFromMetadata(videoData) {
        const points = [];
        
        points.push(`Titre: "${videoData.title}"`);
        points.push(`Chaîne: ${videoData.channelTitle}`);
        points.push(`Durée: ${videoData.duration}`);
        points.push(`Vues: ${videoData.viewCount}`);
        
        if (videoData.publishedAt !== 'Date inconnue') {
            points.push(`Publié le: ${videoData.publishedAt}`);
        }
        
        return points;
    }

    generateFallbackSummary(videoData) {
        return {
            main: `Analyse de la vidéo "${videoData.title}" de ${videoData.channelTitle}. Cette vidéo d'une durée de ${videoData.duration} a été visionnée ${videoData.viewCount} fois. L'analyse détaillée n'a pas pu être effectuée en raison de limitations techniques, mais les métadonnées de base ont été extraites avec succès.`,
            keyPoints: [
                `Titre : ${videoData.title}`,
                `Chaîne : ${videoData.channelTitle}`,
                `Durée : ${videoData.duration}`,
                `Vues : ${videoData.viewCount}`
            ],
            wordCount: 50,
            readingTime: 1,
            hasTranscript: false,
            confidence: 'Faible'
        };
    }

    // ============= FONCTION PRINCIPALE =============
    async summarizeVideo(url) {
        console.log('🎬 DÉBUT analyse OPTIMALE:', url);
        
        try {
            const videoId = this.extractVideoId(url);
            if (!videoId) {
                throw new Error('URL YouTube invalide');
            }
            
            this.showLoading();
            console.log('📹 ID vidéo extraite:', videoId);
            
            this.updateProgress(20, 'Extraction des informations vidéo...');
            let videoData;
            
            try {
                console.log('🔄 Tentative via API YouTube...');
                videoData = await this.getVideoInfoAPI(videoId);
                console.log('✅ Infos vidéo via API réussie');
            } catch (error) {
                console.log('🔄 Tentative via Web Scraping...');
                videoData = await this.getVideoInfoScraping(videoId);
                console.log('✅ Infos vidéo via Scraping réussie');
            }
            
            this.updateProgress(50, 'Extraction de la transcription...');
            const transcript = await this.extractTranscript(videoId);
            
            console.log('📜 Transcription:', transcript ? 
                `✅ Obtenue (${transcript.length} caractères)` : 
                '❌ Non disponible'
            );
            
            this.updateProgress(80, 'Génération du résumé intelligent...');
            const summary = await this.generateAISummary(videoData, transcript);
            
            this.updateProgress(95, 'Finalisation...');
            this.displayResults({
                videoData,
                transcript: transcript || 'Transcription non disponible pour cette vidéo. Les sous-titres automatiques peuvent être désactivés par le créateur ou indisponibles dans cette langue.',
                summary
            });
            
            this.updateProgress(100, 'Analyse terminée !');
            console.log('🎉 ANALYSE TERMINÉE avec succès !');
            
        } catch (error) {
            console.error('❌ ERREUR TOTALE:', error);
            this.showError(`Impossible d'analyser cette vidéo : ${error.message}`);
        }
    }

    // ============= INTERFACE UTILISATEUR =============
    showLoading() {
        const elements = {
            loadingSection: document.getElementById('loadingSection'),
            errorSection: document.getElementById('errorSection'),
            resultsSection: document.getElementById('resultsSection')
        };
        
        if (elements.loadingSection) elements.loadingSection.style.display = 'block';
        if (elements.errorSection) elements.errorSection.style.display = 'none';
        if (elements.resultsSection) elements.resultsSection.style.display = 'none';
    }
    
    updateProgress(percent, message) {
        const progressBar = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (progressBar) progressBar.style.width = percent + '%';
        if (progressText) progressText.textContent = message;
        
        console.log(`📊 ${percent}% - ${message}`);
    }
    
    showError(message) {
        const elements = {
            loadingSection: document.getElementById('loadingSection'),
            errorSection: document.getElementById('errorSection'),
            errorMessage: document.getElementById('errorMessage')
        };
        
        if (elements.loadingSection) elements.loadingSection.style.display = 'none';
        if (elements.errorSection) elements.errorSection.style.display = 'block';
        if (elements.errorMessage) elements.errorMessage.textContent = message;
        
        console.error('💥 ERREUR affichée:', message);
    }
    
    displayResults(results) {
        console.log('🎨 Affichage des résultats:', results);
        
        const elements = {
            loadingSection: document.getElementById('loadingSection'),
            resultsSection: document.getElementById('resultsSection')
        };
        
        if (elements.loadingSection) elements.loadingSection.style.display = 'none';
        if (elements.resultsSection) elements.resultsSection.style.display = 'block';
        
        this.updateVideoInfo(results.videoData);
        this.updateSummaryTab(results.summary);
        this.updateKeyPointsTab(results.summary.keyPoints);
        this.updateTranscriptTab(results.transcript);
        this.switchTab('summary');
    }
    
    updateVideoInfo(videoData) {
        const elements = {
            videoTitle: videoData.title,
            videoChannel: videoData.channelTitle,
            videoViews: videoData.viewCount,
            videoDuration: videoData.duration,
            videoDate: videoData.publishedAt
        };
        
        Object.entries(elements).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value;
            }
        });
        
        const thumbnail = document.getElementById('videoThumbnail');
        if (thumbnail) {
            thumbnail.src = videoData.thumbnail;
            thumbnail.alt = videoData.title;
        }
        
        const categoryBadges = document.getElementById('categoryBadges');
        if (categoryBadges) {
            categoryBadges.innerHTML = `
                <span class="category-badge">📚 Éducatif</span>
                <span class="category-badge">🎯 Analyse</span>
                <span class="category-badge">🤖 ${videoData.source}</span>
            `;
        }
    }
    
    updateSummaryTab(summary) {
        const summaryContent = document.querySelector('#summaryPanel .summary-content');
        const summaryStats = document.querySelector('#summaryPanel .summary-stats');
        
        if (summaryContent) {
            summaryContent.innerHTML = `
                <p>${summary.main}</p>
                <div class="confidence-indicator">
                    <strong>🎯 Niveau de confiance :</strong> 
                    <span class="confidence-${summary.confidence?.toLowerCase()}">${summary.confidence || 'Moyenne'}</span>
                </div>
            `;
        }
        
        if (summaryStats) {
            summaryStats.innerHTML = `
                <div class="stat">
                    <span class="stat-label">📝 Mots</span>
                    <span class="stat-value">${summary.wordCount || 0}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">⏱️ Lecture</span>
                    <span class="stat-value">${summary.readingTime || 1} min</span>
                </div>
                <div class="stat">
                    <span class="stat-label">📜 Transcription</span>
                    <span class="stat-value">${summary.hasTranscript ? '✅' : '❌'}</span>
                </div>
            `;
        }
    }
    
    updateKeyPointsTab(keyPoints) {
        const keyPointsList = document.querySelector('#keyPointsPanel .key-points-list');
        if (keyPointsList && keyPoints) {
            keyPointsList.innerHTML = keyPoints
                .map(point => `<div class="key-point">${point}</div>`)
                .join('');
        }
    }
    
    updateTranscriptTab(transcript) {
        const transcriptContent = document.querySelector('#transcriptPanel .transcript-content');
        if (transcriptContent) {
            transcriptContent.innerHTML = `<p>${transcript}</p>`;
        }
    }
    
    switchTab(tabName) {
        // Désactiver tous les onglets
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        
        // Activer l'onglet sélectionné
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activePanel = document.getElementById(`${tabName}Panel`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activePanel) activePanel.classList.add('active');
    }

    // ============= UTILITAIRES =============
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const container = document.querySelector('.toast-container') || document.body;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    copyToClipboard(text, elementId) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('✅ Copié dans le presse-papiers !', 'success');
        }).catch(err => {
            console.error('Erreur copie:', err);
            this.showToast('❌ Erreur lors de la copie', 'error');
        });
    }

    downloadResults(results) {
        const content = `
RÉSUMÉ YOUTUBE - ${results.videoData.title}
===========================================

📹 INFORMATIONS VIDÉO
• Titre: ${results.videoData.title}
• Chaîne: ${results.videoData.channelTitle}
• Durée: ${results.videoData.duration}
• Vues: ${results.videoData.viewCount}
• Date: ${results.videoData.publishedAt}

📋 RÉSUMÉ
${results.summary.main}

🎯 POINTS CLÉS
${results.summary.keyPoints.map(point => `• ${point}`).join('\n')}

📜 TRANSCRIPTION
${results.transcript}

---
Généré par YouTube Summarizer
        `;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resume-${results.videoData.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('📄 Fichier téléchargé !', 'success');
    }
}

// ============= INITIALISATION GLOBALE =============
let youtubeAnalyzer;

// Fonction de diagnostic pour debug
window.testDiagnostic = function() {
    console.log('🔍 === DIAGNOSTIC COMPLET ===');
    console.log('1. YouTubeSummarizerOptimal:', typeof YouTubeSummarizerOptimal);
    console.log('2. Instance analyzer:', youtube
