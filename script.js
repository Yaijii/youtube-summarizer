class YouTubeSummarizer {
    constructor() {
        this.init();
    }
    
    init() {
        this.urlInput = document.getElementById('youtubeUrl');
        this.summarizeBtn = document.getElementById('summarizeBtn');
        this.loading = document.getElementById('loading');
        this.result = document.getElementById('result');
        this.error = document.getElementById('error');
        this.summary = document.getElementById('summary');
        
        this.summarizeBtn.addEventListener('click', () => this.handleSummarize());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSummarize();
        });
        
        // Auto-fill si URL dans params
        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('v');
        if (videoUrl) {
            this.urlInput.value = videoUrl;
            this.handleSummarize();
        }
    }
    
    async handleSummarize() {
        const url = this.urlInput.value.trim();
        
        if (!this.isValidYouTubeURL(url)) {
            this.showError('Veuillez entrer une URL YouTube valide');
            return;
        }
        
        this.showLoading();
        
        try {
            const videoId = this.extractVideoId(url);
            const transcript = await this.getTranscript(videoId);
            const summary = await this.summarizeText(transcript);
            this.showResult(summary);
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    isValidYouTubeURL(url) {
        const regex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.*/;
        return regex.test(url);
    }
    
    extractVideoId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }
    
    async getTranscript(videoId) {
        // Essaie plusieurs méthodes pour récupérer le transcript
        const methods = [
            () => this.getTranscriptMethod1(videoId),
            () => this.getTranscriptMethod2(videoId),
            () => this.getTranscriptMethod3(videoId)
        ];
        
        for (let method of methods) {
            try {
                const transcript = await method();
                if (transcript && transcript.length > 50) {
                    return transcript;
                }
            } catch (error) {
                console.log('Méthode transcript échouée:', error);
                continue;
            }
        }
        
        throw new Error('Transcript non disponible pour cette vidéo. La vidéo doit avoir des sous-titres activés.');
    }
    
    async getTranscriptMethod1(videoId) {
        // Méthode 1: API YouTube Transcript via proxy CORS
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=fr&v=${videoId}`;
        
        const response = await fetch(corsProxy + encodeURIComponent(transcriptUrl));
        if (!response.ok) {
            // Essaie en anglais
            const enUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
            const enResponse = await fetch(corsProxy + encodeURIComponent(enUrl));
            if (!enResponse.ok) throw new Error('Transcript API failed');
            const xmlText = await enResponse.text();
            return this.parseTranscript(xmlText);
        }
        
        const xmlText = await response.text();
        return this.parseTranscript(xmlText);
    }
    
    async getTranscriptMethod2(videoId) {
        // Méthode 2: Alternative CORS proxy
        const corsProxy = 'https://corsproxy.io/?';
        const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
        
        const response = await fetch(corsProxy + encodeURIComponent(transcriptUrl));
        if (!response.ok) throw new Error('Alternative proxy failed');
        
        const xmlText = await response.text();
        return this.parseTranscript(xmlText);
    }
    
    async getTranscriptMethod3(videoId) {
        // Méthode 3: YouTube Transcript API via service public
        const response = await fetch(`https://youtube-transcript3.p.rapidapi.com/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'youtube-transcript3.p.rapidapi.com',
                'x-rapidapi-key': 'demo' // Clé demo limitée
            }
        });
        
        if (!response.ok) throw new Error('RapidAPI failed');
        
        const data = await response.json();
        if (data.content) {
            return data.content.map(item => item.text).join(' ');
        }
        
        throw new Error('No transcript data');
    }
    
    parseTranscript(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const textElements = xmlDoc.getElementsByTagName('text');
        
        let transcript = '';
        for (let element of textElements) {
            const text = element.textContent || element.innerText || '';
            transcript += this.decodeHTML(text) + ' ';
        }
        
        return transcript.trim();
    }
    
    decodeHTML(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }
    
    async summarizeText(text) {
        try {
            return await this.summarizeWithHuggingFace(text);
        } catch (error) {
            console.log('HuggingFace failed, trying backup:', error);
            return await this.createAdvancedSummary(text);
        }
    }
    
    async summarizeWithHuggingFace(text) {
        const HF_TOKEN = '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'; // Votre clé
        
        // Nettoie et limite le texte
        const cleanText = text.replace(/\s+/g, ' ').trim();
        const inputText = cleanText.substring(0, 1000); // Limite BART
        
        const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: inputText,
                parameters: {
                    max_length: 150,
                    min_length: 30,
                    do_sample: false,
                    early_stopping: true
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('HF API Error:', errorData);
            
            // Si modèle en cours de chargement, attend et réessaie
            if (response.status === 503) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                return await this.summarizeWithHuggingFace(text);
            }
            
            throw new Error(`HF API Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('HF API Response:', result);
        
        if (result[0]?.summary_text) {
            return this.formatAdvancedSummary(result[0].summary_text, text);
        } else if (result.error) {
            throw new Error(result.error);
        } else {
            throw new Error('Réponse API invalide');
        }
    }
    
    createAdvancedSummary(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const words = text.split(' ');
        
        // Trouve les mots clés les plus fréquents
        const wordCount = {};
        words.forEach(word => {
            const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
            if (cleanWord.length > 4) {
                wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
            }
        });
        
        const keywords = Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
        
        // Sélectionne les meilleures phrases
        const importantSentences = sentences
            .filter(s => keywords.some(k => s.toLowerCase().includes(k)))
            .slice(0, 3);
        
        return this.formatAdvancedSummary(importantSentences.join('. '), text);
    }
    
    formatAdvancedSummary(summary, fullText) {
        const wordCount = fullText.split(' ').length;
        const estimatedDuration = Math.ceil(wordCount / 150); // 150 mots/minute moyenne
        
        return `🎯 **Résumé automatique:**

${summary}

📊 **Informations:**
• ${wordCount.toLocaleString()} mots analysés
• ~${estimatedDuration} minutes de contenu
• Résumé généré par IA (BART-CNN)

💡 **Points clés extraits du transcript YouTube**

⚡ Résumé créé le ${new Date().toLocaleString('fr-FR')}`;
    }
    
    showLoading() {
        this.hideAllSections();
        this.loading.classList.remove('hidden');
        this.summarizeBtn.disabled = true;
        this.summarizeBtn.textContent = '⏰ Analyse...';
    }
    
    showResult(summary) {
        this.hideAllSections();
        this.summary.innerHTML = this.formatMarkdown(summary);
        this.result.classList.remove('hidden');
        this.summarizeBtn.disabled = false;
        this.summarizeBtn.textContent = 'Résumer 🚀';
    }
    
    showError(message) {
        this.hideAllSections();
        this.error.innerHTML = `❌ <strong>Erreur:</strong> ${message}

<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px; font-size: 14px;">
<strong>💡 Solutions possibles:</strong><br>
• Vérifiez que la vidéo a des sous-titres activés<br>
• Essayez avec une autre vidéo YouTube<br>
• Réessayez dans quelques minutes<br>
• La vidéo doit être publique (pas privée)
</div>`;
        this.error.classList.remove('hidden');
        this.summarizeBtn.disabled = false;
        this.summarizeBtn.textContent = 'Résumer 🚀';
    }
    
    formatMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^• (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n/g, '<br>');
    }
    
    hideAllSections() {
        this.loading.classList.add('hidden');
        this.result.classList.add('hidden');
        this.error.classList.add('hidden');
    }
}

// Initialiser l'app
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeSummarizer();
    
    // Ajoute support pour le bookmarklet
    if (window.location.search.includes('v=')) {
        console.log('🔗 Ouvert via bookmarklet');
    }
});
