from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
import re
import os

app = Flask(__name__)
CORS(app)

@app.route('/api/transcript', methods=['POST'])
def get_transcript():
    try:
        data = request.json
        video_url = data.get('url')
        
        # Extraire l'ID vidéo
        video_id = extract_video_id(video_url)
        if not video_id:
            return jsonify({'error': 'URL YouTube invalide'}), 400
        
        # Récupérer la transcription RÉELLE
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, 
            languages=['fr', 'en', 'auto'])
        
        # Joindre le texte
        full_transcript = ' '.join([item['text'] for item in transcript_list])
        
        return jsonify({
            'success': True,
            'transcript': full_transcript,
            'video_id': video_id,
            'segments': transcript_list[:100]  # Limiter pour éviter timeout
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Erreur: {str(e)}',
            'success': False
        }), 500

def extract_video_id(url):
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

if __name__ == '__main__':
    app.run(debug=True)
