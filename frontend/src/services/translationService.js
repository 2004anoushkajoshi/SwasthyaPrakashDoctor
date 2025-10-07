// Translation service using Google Cloud Translation API
class TranslationService {
  constructor() {
    this.apiKey = process.env.REACT_APP_GOOGLE_TRANSLATE_API_KEY;
    this.apiUrl = 'https://translation.googleapis.com/language/translate/v2';
  }

  async translateText(text, targetLanguage) {
    if (!text || !text.trim()) return text;
    
    // For demo purposes - in production, use Google Cloud Translation API
    // You'll need to set up a backend proxy for security
    try {
      // Mock translation - replace with actual API call
      const translations = {
        'hi': {
          'Fever': 'बुखार',
          'Cough': 'खांसी',
          'Headache': 'सिरदर्द',
          'Hydration: Aim for 2–3 L water/day': 'जलयोजन: प्रतिदिन 2-3 लीटर पानी पिएं',
          'Follow-up in 3 days if symptoms persist': 'यदि लक्षण बने रहें तो 3 दिनों में फॉलो-अप करें'
        },
        'mr': {
          'Fever': 'ताप',
          'Cough': 'खोकला',
          'Headache': 'डोकेदुखी',
          'Hydration: Aim for 2–3 L water/day': 'जलयोजन: दररोज 2-3 लिटर पाणी प्या',
          'Follow-up in 3 days if symptoms persist': 'जर लक्षणे कायम राहिली तर 3 दिवसांनी फॉलो-अप करा'
        }
      };

      // Simple word-by-word translation for demo
      let translatedText = text;
      if (translations[targetLanguage]) {
        Object.keys(translations[targetLanguage]).forEach(englishText => {
          translatedText = translatedText.replace(
            new RegExp(englishText, 'gi'),
            translations[targetLanguage][englishText]
          );
        });
      }

      return translatedText;

      // For production, use this:
      /*
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          format: 'text'
        }),
      });

      const data = await response.json();
      return data.data.translations[0].translatedText;
      */
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text if translation fails
    }
  }
}

export default TranslationService;