# 🔥 YouTube Transcript Extractor

**Extraction RÉELLE de transcriptions YouTube** - Application web complète et fonctionnelle.

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-green)](https://votre-username.github.io/youtube-transcript-extractor/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Fonctionnalités

- ✅ **Extraction réelle** depuis les serveurs YouTube
- 🎯 **Interface moderne** et responsive
- 🌐 **Support multilingue** (français, anglais)
- 📋 **Copie** en un clic
- 💾 **Téléchargement** au format TXT
- 🌍 **Traduction** via Google Translate
- 🧪 **Mode test** avec vidéos d'exemple

## 🚀 Utilisation

1. **Collez l'URL YouTube** dans le champ
2. **Cliquez sur "EXTRAIRE"** ou appuyez sur Entrée
3. **Attendez** l'extraction (15-30 secondes)
4. **Copiez, téléchargez ou traduisez** le résultat

### URLs supportées :
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `VIDEO_ID` directement

## 🔧 Comment ça marche

### Méthodes d'extraction :
1. **API interne YouTube** (`timedtext`)
2. **Scraping des métadonnées** de la page
3. **APIs alternatives** de Google

### Technologies :
- **HTML5/CSS3/JavaScript** pur
- **APIs proxy CORS** pour contourner les restrictions
- **Parser XML** pour les captions YouTube

## ⚠️ Limitations

- ✅ Fonctionne avec les vidéos **publiques ayant des sous-titres**
- ❌ Ne fonctionne pas avec les vidéos **privées** ou **sans sous-titres**
- ⏱️ Délai d'extraction : **15-30 secondes**

## 🛠️ Installation locale

```bash
git clone https://github.com/VOTRE-USERNAME/youtube-transcript-extractor.git
cd youtube-transcript-extractor
# Ouvrir index.html dans votre navigateur
