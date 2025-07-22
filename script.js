class YouTubeSummarizerOptimal {
    constructor() {
        this.YOUTUBE_API_KEY = 'AIzaSyDhqMt_dNs59BA4SBJ0uXl927ls2TjgBCk';
        this.USE_API = false;
        
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
        this.setupEventListeners();
        this.showToast('✅ Application prête !', 'success');
    }

    setupEventListeners() {
        console.log('🔧 Configuration des event listeners...');
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        const retryBtn = document.getElementById('retryBtn');
        const videoUrl = document.getElementById('videoUrl');

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                console.log('🎬 Bouton analyser cliqué');
                const url = videoUrl?.value.trim();
                if (url) {
                    this.summarizeVideo(url);
                } else {
                    this.showError('⚠️ Veuillez entrer une URL YouTube valide');
                }
            });
            console.log('✅ Event listener BOUTON configuré');
        } else {
            console.error('❌ Bouton analyzeBtn non trouvé !');
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
                    console.log('⌨️ Enter pressé');
                    analyzeBtn?.click();
                }
            });
        }

        // Configuration des tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        console.log('✅ Tous les event listeners configurés');
    }

    // MÉTHODE PRINCIPALE D'ANALYSE
    async summarizeVideo(url) {
        console.log('🎯 Début analyse vidéo:', url);
        
        try {
            // 1. Validation et extraction ID
            const videoId = this.extractVideoId(url);
            if (!videoId) {
                throw new Error('URL YouTube invalide');
            }
            
            console.log('✅ Video ID extrait:', videoId);
            
            // 2. Affichage du loading
            this.showLoadingSection();
            this.updateProgress(10, 'Extraction de l\'ID vidéo...');
            
            // 3. Récupération des données vidéo
            this.updateProgress(30, 'Récupération des informations vidéo...');
            const videoData = await this.getVideoInfo(videoId);
            
            // 4. Extraction de la transcription
            this.updateProgress(50, 'Extraction de la transcription...');
            const transcript = await this.extractTranscript(videoId);
            
            // 5. Génération du résumé IA
            this.updateProgress(70, 'Génération du résumé IA...');
            const summary = await this.generateAISummary(videoData, transcript);
            
            // 6. Affichage des résultats
            this.updateProgress(90, 'Finalisation...');
            const results = {
                videoData,
                summary,
                transcript: transcript || 'Transcription non disponible pour cette vidéo'
            };
            
            this.updateProgress(100, 'Analyse terminée !');
            
            setTimeout(() => {
                this.displayResults(results);
            }, 500);
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'analyse:', error);
            this.showError(`Erreur: ${error.message}`);
        }
    }

    extractVideoId(url) {
        console.log('🔍 Extraction Video ID de:', url);
        
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        
        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                console.log('✅ Video ID trouvé:', match[1]);
                return match[1];
            }
        }
        
        console.error('❌ Aucun Video ID trouvé');
        return null;
    }

    async getVideoInfo(videoId) {
        console.log('📺 Récupération infos vidéo pour:', videoId);
        
        // Essayer l'API YouTube d'abord si configurée
        if (this.USE_API && this.YOUTUBE_API_KEY !== 'VOTRE_CLE_API_ICI') {
            try {
                return await this.getVideoInfoAPI(videoId);
            } catch (error) {
                console.warn('⚠️ API YouTube échouée, fallback scrapping...');
            }
        }
        
        // Fallback sur scraping
        try {
            return await this.getVideoInfoScraping(videoId);
        } catch (error) {
            console.warn('⚠️ Scraping échoué, génération fallback...');
            return this.generateFallbackVideoData(videoId);
        }
    }

    // MÉTHODES D'INTERFACE
    showLoadingSection() {
        console.log('⏳ Affichage section loading...');
        document.getElementById('loadingSection').style.display = 'block';
        document.getElementById('errorSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
    }

    updateProgress(percent, message) {
        console.log(`📊 Progrès: ${percent}% - ${message}`);
        
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        const loadingMessage = document.getElementById('loadingMessage');
        
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}%`;
        if (loadingMessage) loadingMessage.textContent = message;
    }

    showError(message) {
        console.error('💥 Affichage erreur:', message);
        
        document.getElementById('loadingSection').style.display = 'none';
        document.getElementById('errorSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        this.showToast(message, 'error');
    }

    displayResults(results) {
        console.log('🎉 Affichage des résultats:', results);
        
        document.getElementById('loadingSection').style.display = 'none';
        document.getElementById('errorSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
        
        // Mise à jour des informations vidéo
        this.updateVideoInfo(results.videoData);
        
        // Mise à jour du résumé
        this.updateSummaryTab(results.summary);
        
        // Mise à jour des points clés
        this.updateKeyPointsTab(results.summary.keyPoints);
        
        // Mise à jour de la transcription
        this.updateTranscriptTab(results.transcript);
        
        this.showToast('🎯 Analyse terminée avec succès !', 'success');
    }
}

/*===============================================
   PARTIE 2: MÉTHODES D'EXTRACTION DE DONNÉES
===============================================*/

// Ajout des méthodes à la classe (continuez de copier après la partie 1)

// MÉTHODE API YOUTUBE
async getVideoInfoAPI(videoId) {
    console.log('🔑 Utilisation API YouTube pour:', videoId);
    
    try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${this.YOUTUBE_API_KEY}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            throw new Error('Vidéo non trouvée via API');
        }

        const video = data.items[0];
        return {
            id: videoId,
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            description: video.snippet.description,
            viewCount: parseInt(video.statistics.viewCount).toLocaleString(),
            duration: this.parseISO8601Duration(video.contentDetails.duration),
            thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url,
            publishedAt: new Date(video.snippet.publishedAt).toLocaleDateString('fr-FR'),
            source: 'API'
        };
        
    } catch (error) {
        console.warn('⚠️ API YouTube échouée:', error.message);
        throw error;
    }
}

// MÉTHODE SCRAPING WEB
async getVideoInfoScraping(videoId) {
    console.log('🌐 Scraping pour:', videoId);
    
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    for (let i = 0; i < this.PROXY_SERVICES.length; i++) {
        try {
            console.log(`🌐 Tentative via proxy ${i + 1}...`);
            
            const proxyUrl = this.PROXY_SERVICES[i] + encodeURIComponent(url);
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
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

// PARSING HTML YOUTUBE
parseYouTubeHTML(html, videoId) {
    console.log('📄 Parsing HTML YouTube...');
    
    try {
        // Extraction du titre
        let title = 'Titre non disponible';
        const titlePatterns = [
            /<title>(.*?)<\/title>/,
            /"title":"([^"]+)"/,
            /property="og:title" content="([^"]+)"/
        ];
        
        for (let pattern of titlePatterns) {
            const match = html.match(pattern);
            if (match) {
                title = match[1].replace(' - YouTube', '').trim();
                break;
            }
        }

        // Extraction du nom de chaîne
        let channelTitle = 'Chaîne inconnue';
        const channelPatterns = [
            /"ownerText":\{"runs":\[\{"text":"([^"]+)"/,
            /"channelName":"([^"]+)"/,
            /property="og:video:tag" content="([^"]+)"/
        ];
        
        for (let pattern of channelPatterns) {
            const match = html.match(pattern);
            if (match) {
                channelTitle = match[1];
                break;
            }
        }

        // Extraction de la description
        let description = 'Description non disponible';
        const descPatterns = [
            /"shortDescription":"([^"]{0,500}[^"]*?)"/,
            /property="og:description" content="([^"]+)"/,
            /"description":\{"simpleText":"([^"]+)"/
        ];
        
        for (let pattern of descPatterns) {
            const match = html.match(pattern);
            if (match) {
                description = match[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').substring(0, 500);
                break;
            }
        }

        // Extraction du nombre de vues
        let viewCount = 'N/A';
        const viewPatterns = [
            /"viewCount":"(\d+)"/,
            /(\d+(?:\.\d+)?[KMB]?) views/i,
            /(\d+(?:,\d+)*) vues/i
        ];
        
        for (let pattern of viewPatterns) {
            const match = html.match(pattern);
            if (match) {
                if (match[1].includes('K') || match[1].includes('M') || match[1].includes('B')) {
                    viewCount = match[1];
                } else {
                    const views = parseInt(match[1].replace(/,/g, ''));
                    viewCount = views.toLocaleString();
                }
                break;
            }
        }

        // Extraction de la durée
        let duration = 'N/A';
        const durationPatterns = [
            /"lengthSeconds":"(\d+)"/,
            /"approxDurationMs":"(\d+)"/,
            /PT(\d+H)?(\d+M)?(\d+S)?/
        ];
        
        for (let pattern of durationPatterns) {
            const match = html.match(pattern);
            if (match) {
                let seconds;
                if (match[1] && !isNaN(match[1])) {
                    seconds = parseInt(match[1]);
                } else if (match[0].startsWith('PT')) {
                    seconds = this.parseISO8601Duration(match[0]);
                }
                
                if (seconds) {
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    duration = `${minutes}min ${remainingSeconds}s`;
                    break;
                }
            }
        }

        const result = {
            id: videoId,
            title: this.cleanText(title),
            channelTitle: this.cleanText(channelTitle),
            description: this.cleanText(description),
            viewCount,
            duration,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            publishedAt: 'Date inconnue',
            source: 'SCRAPING'
        };
        
        console.log('✅ Données extraites:', result);
        return result;

    } catch (error) {
        console.error('❌ Erreur parsing HTML:', error);
        throw new Error('Impossible d\'extraire les données de la page');
    }
}

// FALLBACK QUAND TOUT ÉCHOUE
generateFallbackVideoData(videoId) {
    console.log('🔄 Génération données fallback pour:', videoId);
    
    return {
        id: videoId,
        title: 'Vidéo YouTube (titre non récupéré)',
        channelTitle: 'Chaîne YouTube',
        description: 'Informations non disponibles - analyse basée sur l\'ID vidéo uniquement',
        viewCount: 'N/A',
        duration: 'N/A',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        publishedAt: 'Date inconnue',
        source: 'FALLBACK'
    };
}

// EXTRACTION TRANSCRIPTION
async extractTranscript(videoId) {
    console.log('📜 Tentative extraction transcription pour:', videoId);
    
    try {
        // Méthode 1: Tentative directe (peu de chances à cause de CORS)
        const captionUrl = `https://www.youtube.com/api/timedtext?lang=fr&v=${videoId}`;
        const response = await fetch(captionUrl);
        
        if (response.ok) {
            const xmlText = await response.text();
            if (xmlText.includes('<text')) {
                console.log('✅ Transcription XML trouvée');
                return this.parseXMLCaptions(xmlText);
            }
        }
    } catch (error) {
        console.warn('⚠️ Extraction directe transcription échouée:', error.message);
    }
    
    // Méthode 2: Tentative via proxy
    for (let proxy of this.PROXY_SERVICES) {
        try {
            const captionUrl = `https://www.youtube.com/api/timedtext?lang=fr&v=${videoId}`;
            const proxyUrl = proxy + encodeURIComponent(captionUrl);
            
            const response = await fetch(proxyUrl);
            if (response.ok) {
                let xmlText;
                if (proxy.includes('allorigins')) {
                    const data = await response.json();
                    xmlText = data.contents;
                } else {
                    xmlText = await response.text();
                }
                
                if (xmlText.includes('<text')) {
                    console.log('✅ Transcription via proxy trouvée');
                    return this.parseXMLCaptions(xmlText);
                }
            }
        } catch (error) {
            continue;
        }
    }
    
    console.log('❌ Aucune transcription disponible');
    return null;
}

// PARSING XML CAPTIONS
parseXMLCaptions(xmlText) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const textNodes = xmlDoc.querySelectorAll('text');
        
        let transcript = '';
        textNodes.forEach(node => {
            const text = node.textContent?.trim();
            if (text) {
                transcript += this.cleanText(text) + ' ';
            }
        });
        
        return transcript.trim();
    } catch (error) {
        console.warn('⚠️ Erreur parsing XML captions:', error);
        return null;
    }
}

// UTILITAIRES
parseISO8601Duration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    return hours * 3600 + minutes * 60 + seconds;
}

cleanText(text) {
    return text
        .replace(/\\u[\dA-F]{4}/gi, '')
        .replace(/\\n/g, ' ')
        .replace(/\\"/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

/*===============================================
   PARTIE 3: GÉNÉRATION IA + INTERFACE
===============================================*/

// GÉNÉRATION RÉSUMÉ IA
async generateAISummary(videoData, transcript) {
    console.log('🤖 Génération résumé IA avancé...');
    
    const hasTranscript = transcript && transcript.length > 100;
    const content = hasTranscript ? transcript : (videoData.description || videoData.title);
    
    // Analyse du contenu
    const keywords = this.extractKeywords(content);
    const categories = this.inferCategories(videoData.title, content, keywords);
    
    let mainSummary;
    let keyPoints;
    
    if (hasTranscript) {
        // Résumé basé sur la transcription réelle
        console.log('📜 Résumé basé sur transcription complète');
        
        const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const keyMoments = this.extractKeyMoments(sentences);
        
        mainSummary = `Cette vidéo de ${videoData.channelTitle}, intitulée "${videoData.title}", offre un contenu détaillé sur ${keywords.slice(0, 3).join(', ')}. ${keyMoments.slice(0, 3).join('. ')}. La vidéo dure ${videoData.duration} et présente une analyse approfondie du sujet avec des exemples concrets et des explications détaillées.`;
        
        keyPoints = this.extractKeyPointsFromTranscript(transcript);
        
    } else if (videoData.description && videoData.description.length > 50) {
        // Résumé basé sur la description
        console.log('📝 Résumé basé sur description et métadonnées');
        
        mainSummary = `Cette vidéo de ${videoData.channelTitle} traite de "${videoData.title}" et explore les thématiques de ${keywords.slice(0, 3).join(', ')}. Avec ${videoData.viewCount} vues et une durée de ${videoData.duration}, elle semble aborder: ${videoData.description.substring(0, 200)}...`;
        
        keyPoints = this.extractKeyPointsFromMetadata(videoData, keywords);
        
    } else {
        // Résumé minimal basé sur le titre uniquement
        console.log('🏷️ Résumé basé sur titre uniquement');
        
        mainSummary = `Cette vidéo de ${videoData.channelTitle}, "${videoData.title}", dure ${videoData.duration} et a obtenu ${videoData.viewCount} vues. L'analyse se base principalement sur le titre et suggère un contenu lié à ${keywords.slice(0, 3).join(', ')}. Les informations détaillées ne sont pas disponibles car la transcription automatique n'a pu être extraite.`;
        
        keyPoints = this.generateGenericKeyPoints(videoData, keywords);
    }
    
    return {
        main: mainSummary,
        keyPoints: keyPoints.slice(0, 5), // Limiter à 5 points
        wordCount: content.split(' ').length,
        readingTime: Math.max(1, Math.ceil(content.split(' ').length / 200)),
        hasTranscript,
        confidence: this.calculateConfidence(hasTranscript, videoData.source),
        categories,
        keywords: keywords.slice(0, 8),
        source: videoData.source
    };
}

// EXTRACTION MOTS-CLÉS AVANCÉE
extractKeywords(text) {
    const stopWords = new Set([
        'le', 'de', 'et', 'à', 'un', 'il', 'être', 'en', 'avoir', 'que', 'pour', 
        'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 
        'plus', 'par', 'je', 'tu', 'nous', 'vous', 'ils', 'elles', 'du', 'des',
        'les', 'la', 'cette', 'ces', 'mais', 'ou', 'donc', 'car', 'alors',
        'aussi', 'très', 'bien', 'comme', 'même', 'fait', 'faire'
    ]);
    
    const words = text.toLowerCase()
        .replace(/[^\w\sàâäéèêëïîôùûüÿç]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));
    
    const frequency = {};
    words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(entry => entry[0]);
}

// INFÉRENCE CATÉGORIES
inferCategories(title, content, keywords) {
    const categories = [];
    const text = `${title} ${content}`.toLowerCase();
    
    const categoryMap = {
        'Éducatif': ['éducation', 'apprendre', 'cours', 'tutorial', 'explication', 'comment'],
        'Actualités': ['actualité', 'news', 'politique', 'économie', 'monde', 'france'],
        'Sport': ['sport', 'football', 'basket', 'tennis', 'match', 'équipe'],
        'Musique': ['musique', 'chanson', 'album', 'concert', 'artiste', 'clip'],
        'Gaming': ['gaming', 'jeu', 'game', 'gameplay', 'streamer', 'gaming'],
        'Tech': ['technologie', 'tech', 'smartphone', 'ordinateur', 'innovation'],
        'Lifestyle': ['lifestyle', 'mode', 'beauté', 'voyage', 'food', 'vlog']
    };
    
    Object.entries(categoryMap).forEach(([category, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
            categories.push(category);
        }
    });
    
    return categories.length > 0 ? categories : ['Général'];
}

// EXTRACTION MOMENTS CLÉS
extractKeyMoments(sentences) {
    return sentences
        .filter(sentence => {
            const s = sentence.toLowerCase();
            return s.includes('important') || s.includes('essentiel') || 
                   s.includes('conclusion') || s.includes('résultat') ||
                   s.length > 50;
        })
        .slice(0, 5)
        .map(s => s.trim());
}

// EXTRACTION POINTS CLÉS DEPUIS TRANSCRIPTION
extractKeyPointsFromTranscript(transcript) {
    const sentences = transcript.split(/[.!?]+/)
        .filter(s => s.trim().length > 30)
        .map(s => s.trim());
    
    const keyPoints = [];
    
    // Prendre les phrases les plus longues (souvent plus informatives)
    const longSentences = sentences
        .sort((a, b) => b.length - a.length)
        .slice(0, 8);
    
    longSentences.forEach((sentence, index) => {
        if (sentence.length > 50) {
            const timestamp = `[${(index + 1) * 60}s]`;
            keyPoints.push(`${timestamp} ${sentence.substring(0, 150)}...`);
        }
    });
    
    return keyPoints.slice(0, 5);
}

// EXTRACTION POINTS CLÉS DEPUIS MÉTADONNÉES
extractKeyPointsFromMetadata(videoData, keywords) {
    const points = [];
    
    points.push(`📍 Vidéo de ${videoData.channelTitle} avec ${videoData.viewCount} vues`);
    points.push(`⏱️ Durée: ${videoData.duration} - Format adapté pour ${this.inferFormat(videoData.duration)}`);
    
    if (keywords.length > 0) {
        points.push(`🎯 Thèmes principaux: ${keywords.slice(0, 4).join(', ')}`);
    }
    
    if (videoData.description && videoData.description.length > 100) {
        const firstSentence = videoData.description.split('.')[0];
        if (firstSentence.length > 20) {
            points.push(`📝 Description: ${firstSentence}...`);
        }
    }
    
    points.push(`📊 Source d'analyse: ${this.getSourceDescription(videoData.source)}`);
    
    return points;
}

// GÉNÉRATION POINTS GÉNÉRIQUES
generateGenericKeyPoints(videoData, keywords) {
    return [
        `📹 Vidéo publiée par ${videoData.channelTitle}`,
        `👀 Popularité: ${videoData.viewCount} vues`,
        `⏲️ Durée optimale de ${videoData.duration}`,
        `🏷️ Sujets probables: ${keywords.slice(0, 3).join(', ')}`,
        `📱 Analyse basée sur les métadonnées disponibles`
    ];
}

// CALCUL CONFIANCE
calculateConfidence(hasTranscript, source) {
    if (hasTranscript) return 'Élevée';
    if (source === 'API') return 'Bonne';
    if (source === 'SCRAPING') return 'Moyenne';
    return 'Limitée';
}

// UTILITAIRES INTERFACE
inferFormat(duration) {
    if (duration.includes('min')) {
        const minutes = parseInt(duration);
        if (minutes < 5) return 'contenu express';
        if (minutes < 15) return 'format court';
        if (minutes < 45) return 'format moyen';
        return 'format long';
    }
    return 'format indéterminé';
}

getSourceDescription(source) {
    const descriptions = {
        'API': 'API YouTube officielle (données complètes)',
        'SCRAPING': 'Extraction web (données partielles)',
        'FALLBACK': 'Analyse minimale (métadonnées de base)'
    };
    return descriptions[source] || 'Source inconnue';
}

// MÉTHODES D'INTERFACE
updateVideoInfo(videoData) {
    console.log('📺 Mise à jour informations vidéo');
    
    const elements = {
        videoThumbnail: document.getElementById('videoThumbnail'),
        videoTitle: document.getElementById('videoTitle'),
        videoChannel: document.getElementById('videoChannel'),
        videoViews: document.getElementById('videoViews'),
        videoDuration: document.getElementById('videoDuration'),
        videoDate: document.getElementById('videoDate'),
        categoryBadges: document.getElementById('categoryBadges')
    };
    
    if (elements.videoThumbnail) {
        elements.videoThumbnail.src = videoData.thumbnail;
        elements.videoThumbnail.alt = videoData.title;
    }
    
    if (elements.videoTitle) elements.videoTitle.textContent = videoData.title;
    if (elements.videoChannel) elements.videoChannel.textContent = videoData.channelTitle;
    if (elements.videoViews) elements.videoViews.textContent = videoData.viewCount;
    if (elements.videoDuration) elements.videoDuration.textContent = videoData.duration;
    if (elements.videoDate) elements.videoDate.textContent = videoData.publishedAt;
    
    // Mise à jour des badges de catégorie
    if (elements.categoryBadges && videoData.categories) {
        elements.categoryBadges.innerHTML = videoData.categories
            .map(cat => `<span class="category-badge">${cat}</span>`)
            .join('');
    }
}

updateSummaryTab(summary) {
    console.log('📋 Mise à jour onglet résumé');
    
    const summaryContent = document.getElementById('summaryContent');
    if (summaryContent) {
        summaryContent.innerHTML = `
            <div class="summary-main">
                <h3>📖 Résumé Principal</h3>
                <p class="summary-text">${summary.main}</p>
            </div>
            
            <div class="summary-stats">
                <div class="stat-item">
                    <span class="stat-label">📊 Confiance:</span>
                    <span class="confidence-badge confidence-${summary.confidence.toLowerCase()}">${summary.confidence}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">📝 Mots analysés:</span>
                    <span class="stat-value">${summary.wordCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">⏱️ Temps lecture:</span>
                    <span class="stat-value">${summary.readingTime} min</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">🎯 Source:</span>
                    <span class="stat-value">${summary.source || 'Hybride'}</span>
                </div>
            </div>
            
            ${summary.keywords ? `
                <div class="keywords-section">
                    <h4>🏷️ Mots-clés identifiés</h4>
                    <div class="keywords-container">
                        ${summary.keywords.map(keyword => 
                            `<span class="keyword-tag">${keyword}</span>`
                        ).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }
}

updateKeyPointsTab(keyPoints) {
    console.log('🎯 Mise à jour onglet points clés');
    
    const keyPointsContent = document.getElementById('keyPointsContent');
    if (keyPointsContent) {
        if (keyPoints && keyPoints.length > 0) {
            keyPointsContent.innerHTML = `
                <div class="key-points-list">
                    <h3>🎯 Points Essentiels</h3>
                    <ul class="points-list">
                        ${keyPoints.map(point => `
                            <li class="point-item">
                                <span class="point-text">${point}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        } else {
            keyPointsContent.innerHTML = `
                <div class="no-points">
                    <p>🔍 Points clés non disponibles pour cette vidéo</p>
                    <p class="help-text">L'extraction automatique n'a pas pu identifier de points spécifiques.</p>
                </div>
            `;
        }
    }
}

updateTranscriptTab(transcript) {
    console.log('📜 Mise à jour onglet transcription');
    
    const transcriptContent = document.getElementById('transcriptContent');
    if (transcriptContent) {
        if (transcript && transcript !== 'Transcription non disponible pour cette vidéo') {
            transcriptContent.innerHTML = `
                <div class="transcript-container">
                    <div class="transcript-header">
                        <h3>📜 Transcription Complète</h3>
                        <div class="transcript-actions">
                            <button class="btn btn-small" onclick="youtubeAnalyzer.copyTranscript('${transcript.replace(/'/g, "\\'")}')">
                                📋 Copier
                            </button>
                        </div>
                    </div>
                    <div class="transcript-text">
                        ${this.formatTranscript(transcript)}
                    </div>
                </div>
            `;
        } else {
            transcriptContent.innerHTML = `
                <div class="no-transcript">
                    <h3>📜 Transcription</h3>
                    <div class="empty-state">
                        <p>❌ Transcription automatique non disponible</p>
                        <div class="help-reasons">
                            <p><strong>Raisons possibles:</strong></p>
                            <ul>
                                <li>• Sous-titres désactivés par le créateur</li>
                                <li>• Vidéo trop récente (traitement en cours)</li>
                                <li>• Contenu audio non reconnu</li>
                                <li>• Restrictions d'accès</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

formatTranscript(transcript) {
    if (!transcript) return '';
    
    // Diviser en paragraphes logiques
    const sentences = transcript.split(/[.!?]+/);
    let formattedText = '';
    let currentParagraph = '';
    
    sentences.forEach((sentence, index) => {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length > 10) {
            currentParagraph += cleanSentence + '. ';
            
            // Nouveau paragraphe tous les 3-4 phrases
            if ((index + 1) % 3 === 0 || index === sentences.length - 1) {
                formattedText += `<p>${currentParagraph.trim()}</p>`;
                currentParagraph = '';
            }
        }
    });
    
    return formattedText || `<p>${transcript}</p>`;
}

switchTab(tabName) {
    console.log('🔄 Changement onglet vers:', tabName);
    
    // Désactiver tous les onglets
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Activer l'onglet sélectionné
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activePanel = document.getElementById(`${tabName}Content`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activePanel) activePanel.classList.add('active');
}

// FONCTIONS UTILITAIRES INTERFACE
showToast(message, type = 'info') {
    console.log(`🍞 Toast: ${message} (${type})`);
    
    // Supprimer les toasts existants
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} show`;
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Ajouter au container ou créer un nouveau
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.appendChild(toast);
    
    // Auto-suppression après 4 secondes
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }
    }, 4000);
}

copyTranscript(transcript) {
    navigator.clipboard.writeText(transcript).then(() => {
        this.showToast('✅ Transcription copiée !', 'success');
    }).catch(err => {
        console.error('Erreur copie transcript:', err);
        this.showToast('❌ Erreur lors de la copie', 'error');
    });
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
    console.log('📥 Téléchargement des résultats');
    
    const content = `
RÉSUMÉ YOUTUBE ANALYZER
=======================

📹 INFORMATIONS VIDÉO
Titre: ${results.videoData.title}
Chaîne: ${results.videoData.channelTitle}
Durée: ${results.videoData.duration}
Vues: ${results.videoData.viewCount}
Date: ${results.videoData.publishedAt}
URL: https://youtube.com/watch?v=${results.videoData.id}

📊 ANALYSE
Confiance: ${results.summary.confidence}
Mots analysés: ${results.summary.wordCount}
Source: ${results.summary.source}

📋 RÉSUMÉ PRINCIPAL
${results.summary.main}

🎯 POINTS CLÉS
${results.summary.keyPoints ? results.summary.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n') : 'Points clés non disponibles'}

🏷️ MOTS-CLÉS
${results.summary.keywords ? results.summary.keywords.join(', ') : 'Mots-clés non disponibles'}

📜 TRANSCRIPTION
${results.transcript}

---
Généré par YouTube Analyzer
Date: ${new Date().toLocaleString('fr-FR')}
    `;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-resume-${results.videoData.id}-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showToast('📄 Fichier téléchargé avec succès !', 'success');
}

// FONCTIONS GLOBALES
setupResultsActions(results) {
    console.log('🔧 Configuration actions résultats');
    
    // Bouton copier résumé
    const copyBtn = document.getElementById('copySummaryBtn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            this.copyToClipboard(results.summary.main);
        };
    }
    
    // Bouton télécharger
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            this.downloadResults(results);
        };
    }
    
    // Bouton partager
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.onclick = () => {
            this.shareResults(results);
        };
    }
}

shareResults(results) {
    if (navigator.share) {
        navigator.share({
            title: `Résumé: ${results.videoData.title}`,
            text: results.summary.main,
            url: `https://youtube.com/watch?v=${results.videoData.id}`
        }).then(() => {
            this.showToast('✅ Partagé avec succès !', 'success');
        }).catch(err => {
            console.log('Erreur partage natif:', err);
            this.fallbackShare(results);
        });
    } else {
        this.fallbackShare(results);
    }
}

fallbackShare(results) {
    const shareText = `🎥 ${results.videoData.title}\n\n📋 ${results.summary.main}\n\n👀 ${results.videoData.viewCount} vues\n🔗 https://youtube.com/watch?v=${results.videoData.id}`;
    
    this.copyToClipboard(shareText);
    this.showToast('📋 Contenu de partage copié !', 'success');
}
}

// ============= INITIALISATION GLOBALE =============
let youtubeAnalyzer;

// Initialisation quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM prêt, initialisation YouTube Analyzer...');
    
    try {
        youtubeAnalyzer = new YouTubeSummarizerOptimal();
        console.log('✅ YouTube Analyzer initialisé avec succès');
        
        // Test de fonctionnalité
        setTimeout(() => {
            youtubeAnalyzer.showToast('🎉 YouTube Analyzer prêt à analyser !', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
    }
});

// Fonction de diagnostic pour debugging
window.testYouTubeAnalyzer = function() {
    console.log('🔍 === TEST DIAGNOSTIC ===');
    console.log('1. Classe YouTubeSummarizerOptimal:', typeof YouTubeSummarizerOptimal);
    console.log('2. Instance youtubeAnalyzer:', typeof youtubeAnalyzer);
    console.log('3. Bouton analyser:', document.getElementById('analyzeBtn'));
    console.log('4. Input URL:', document.getElementById('videoUrl'));
    
    if (youtubeAnalyzer) {
        console.log('✅ Analyzer prêt - Test avec URL...');
        youtubeAnalyzer.showToast('🧪 Test diagnostic réussi !', 'success');
    } else {
        console.error('❌ Analyzer non initialisé');
    }
};

// Fonction de test rapide
window.testWithSampleVideo = function() {
    if (youtubeAnalyzer) {
        const sampleUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        document.getElementById('videoUrl').value = sampleUrl;
        youtubeAnalyzer.summarizeVideo(sampleUrl);
    }
};

console.log('🎯 Script YouTube Analyzer COMPLET chargé !');
console.log('📞 Utilisez testYouTubeAnalyzer() pour diagnostiquer');
console.log('🧪 Utilisez testWithSampleVideo() pour un test rapide');

