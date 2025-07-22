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
        // Utilise l'API YouTube Transcript
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=fr&v=${videoId}`;
        
        try {
            const response = await fetch(corsProxy + encodeURIComponent(transcriptUrl));
            
            if (!response.ok) {
                // Essaie en anglais si français pas dispo
                const enTranscriptUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
                const enResponse = await fetch(corsProxy + encodeURIComponent(enTranscriptUrl));
                
                if (!enResponse.ok) {
                    throw new Error('Transcript non disponible pour cette vidéo');
                }
                
                const xmlText = await enResponse.text();
                return this.parseTranscript(xmlText);
            }
            
            const xmlText = await response.text();
            return this.parseTranscript(xmlText);
            
        } catch (error) {
            throw new Error('Impossible de récupérer le transcript: ' + error.message);
        }
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
        // Utilise DeepSeek API gratuite (remplacer par votre clé si needed)
        const apiUrl = 'https://api.deepseek.com/chat/completions';
        
        const prompt = `Résume cette transcription YouTube en français de manière claire et structurée. 
        
Organise le résumé avec:
- 🎯 Sujet principal (1 phrase)  
- 📋 Points clés (3-5 points maximum)
- 💡 Conclusion/Takeaway principal

Transcription: ${text.substring(0, 4000)}...`; // Limite pour éviter surcharge

        try {
            // VERSION ALTERNATIVE: Utilise une API gratuite publique
            return await this.summarizeWithFreeAPI(text);
        } catch (error) {
            throw new Error('Erreur lors du résumé: ' + error.message);
        }
    }
    
    async summarizeWithFreeAPI(text) {
        // Utilise Hugging Face Inference API (gratuit)
        const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: text.substring(0, 1024), // BART limite
                parameters: {
                    max_length: 200,
                    min_length: 50
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('Service de résumé temporairement indisponible');
        }
        
        const result = await response.json();
        
        if (result[0]?.summary_text) {
            return this.formatSummary(result[0].summary_text);
        } else {
            return this.createBasicSummary(text);
        }
    }
    
    formatSummary(rawSummary) {
        return `🎯 **Sujet principal:**
${rawSummary}

📋 **Points clés:**
• Information extraite automatiquement du transcript
• Résumé généré par IA
• Contenu principal de la vidéo

💡 **À retenir:**
${rawSummary.split('.')[0]}.`;
    }
    
    createBasicSummary(text) {
        const sentences = text.split('.').slice(0, 5);
        return `🎯 **Résumé automatique:**

${sentences.join('.\n')}.

📋 **Note:** Résumé basique généré à partir du transcript disponible.`;
    }
    
    showLoading() {
        this.hideAllSections();
        this.loading.classList.remove('hidden');
        this.summarizeBtn.disabled = true;
    }
    
    showResult(summary) {
        this.hideAllSections();
        this.summary.textContent = summary;
        this.result.classList.remove('hidden');
        this.summarizeBtn.disabled = false;
    }
    
    showError(message) {
        this.hideAllSections();
        this.error.textContent = '❌ ' + message;
        this.error.classList.remove('hidden');
        this.summarizeBtn.disabled = false;
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
});
