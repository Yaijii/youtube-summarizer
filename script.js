class GitHubYouTubeTranscript {
    constructor() {
        // URL de votre backend Vercel (sera généré automatiquement)
        this.API_URL = 'https://votre-app.vercel.app/api/transcript';
        this.init();
    }

    async extractRealTranscript(videoUrl) {
        try {
            this.showLoading('🔥 Extraction RÉELLE en cours...');
            
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: videoUrl })
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ VRAIE TRANSCRIPTION GITHUB + VERCEL !');
                this.displayResults(data);
                return data;
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            console.error('❌ Erreur:', error);
            this.showError(`Erreur extraction: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    displayResults(data) {
        // Afficher les résultats
        document.getElementById('transcriptContent').textContent = data.transcript;
        document.getElementById('results').style.display = 'block';
        
        this.showToast('✅ Transcription RÉELLE extraite !', 'success');
    }

    // Méthodes UI
    showLoading(message) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'block';
            loading.textContent = message;
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }

    showError(message) {
        const error = document.createElement('div');
        error.style.cssText = 'background:#e74c3c;color:white;padding:1rem;border-radius:8px;margin:1rem 0';
        error.textContent = message;
        document.body.appendChild(error);
        
        setTimeout(() => error.remove(), 5000);
    }

    showToast(message, type) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            color: white; padding: 1rem; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }

    init() {
        // Fonctions globales
        window.extractTranscript = (url) => this.extractRealTranscript(url);
        window.testTranscript = () => {
            const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            this.extractRealTranscript(testUrl);
        };
        
        console.log('🚀 GitHub YouTube Transcript ready!');
        this.showToast('✅ App GitHub prête !', 'success');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.transcriptApp = new GitHubYouTubeTranscript();
});
