import React, { useState, useRef } from "react";
import "./DoctorScreen.css";

export default function DoctorScreen() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [nutrition, setNutrition] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [language, setLanguage] = useState("en");
  const [translating, setTranslating] = useState(false);

  const recognitionRef = useRef(null);
  const cumulativeRef = useRef("");
  const autofillTimerRef = useRef(null);

  // Enhanced translation function with comprehensive medical terminology
  const translateText = async (text, targetLang) => {
    if (!text || !text.trim()) return text;

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const langCode = targetLang;

    if (langCode === 'en') {
      return text;
    }

    // Comprehensive medical translations
    const translations = {
      'hi': {
        // Medical conditions
        'fever': 'बुखार',
        'cough': 'खांसी', 
        'cold': 'जुकाम',
        'headache': 'सिरदर्द',
        'nausea': 'मतली',
        'viral': 'वायरल',
        'diabetes': 'मधुमेह',
        'hypertension': 'उच्च रक्तचाप',
        'anemia': 'एनीमिया',
        'infection': 'संक्रमण',
        'inflammation': 'सूजन',
        'asthma': 'दमा',
        'arthritis': 'गठिया',
        'pneumonia': 'निमोनिया',
        'diarrhea': 'दस्त',
        'constipation': 'कब्ज',
        
        // Symptoms
        'pain': 'दर्द',
        'weakness': 'कमजोरी',
        'fatigue': 'थकान',
        'dizziness': 'चक्कर आना',
        'vomiting': 'उल्टी',
        
        // Medical terms
        'diagnosis': 'निदान',
        'treatment': 'इलाज',
        'medicine': 'दवा',
        'prescription': 'प्रिस्क्रिप्शन',
        'symptoms': 'लक्षण',
        'patient': 'मरीज',
        'doctor': 'डॉक्टर',
        'hospital': 'अस्पताल',
        
        // Nutrition terms
        'hydration': 'जलयोजन',
        'water': 'पानी',
        'nutrition': 'पोषण',
        'diet': 'आहार',
        'protein': 'प्रोटीन',
        'vitamin': 'विटामिन',
        'minerals': 'खनिज',
        'calories': 'कैलोरी',
        'fiber': 'फाइबर',
        
        // Food items
        'fruits': 'फल',
        'vegetables': 'सब्जियां',
        'grains': 'अनाज',
        'milk': 'दूध',
        'eggs': 'अंडे',
        'meat': 'मांस',
        'fish': 'मछली',
        
        // Directions & dosage
        'twice a day': 'दिन में दो बार',
        'once daily': 'रोज एक बार',
        'after food': 'खाने के बाद',
        'before food': 'खाने से पहले',
        'with water': 'पानी के साथ',
        'mg': 'मिलीग्राम',
        'ml': 'मिलीलीटर',
        
        // Common medicines
        'paracetamol': 'पेरासिटामोल',
        'ibuprofen': 'आइबुप्रोफेन',
        'amoxicillin': 'एमोक्सिसिलिन',
        'vitamin c': 'विटामिन सी',
        'vitamin d': 'विटामिन डी',
        'insulin': 'इंसुलिन'
      },
      'mr': {
        // Medical conditions
        'fever': 'ताप',
        'cough': 'खोकला',
        'cold': 'सर्दी',
        'headache': 'डोकेदुखी',
        'nausea': 'मळमळ',
        'viral': 'व्हायरल',
        'diabetes': 'मधुमेह',
        'hypertension': 'उच्च रक्तदाब',
        'anemia': 'रक्तक्षय',
        'infection': 'इन्फेक्शन',
        'inflammation': 'दाह',
        'asthma': 'दमा',
        'arthritis': 'संधिवात',
        'pneumonia': 'न्यूमोनिया',
        'diarrhea': 'अतिसार',
        'constipation': 'मलबद्धता',
        
        // Symptoms
        'pain': 'वेदना',
        'weakness': 'अशक्तपणा',
        'fatigue': 'थकवा',
        'dizziness': 'चक्कर',
        'vomiting': 'उलटी',
        
        // Medical terms
        'diagnosis': 'निदान',
        'treatment': 'उपचार',
        'medicine': 'औषध',
        'prescription': 'प्रिस्क्रिप्शन',
        'symptoms': 'लक्षणे',
        'patient': 'रुग्ण',
        'doctor': 'डॉक्टर',
        'hospital': 'रुग्णालय',
        
        // Nutrition terms
        'hydration': 'जलयोजन',
        'water': 'पाणी',
        'nutrition': 'पोषण',
        'diet': 'आहार',
        'protein': 'प्रथिन',
        'vitamin': 'जीवनसत्त्व',
        'minerals': 'खनिजे',
        'calories': 'कॅलरी',
        'fiber': 'तंतुमय',
        
        // Food items
        'fruits': 'फळे',
        'vegetables': 'भाज्या',
        'grains': 'धान्य',
        'milk': 'दूध',
        'eggs': 'अंडी',
        'meat': 'मांस',
        'fish': 'मासे',
        
        // Directions & dosage
        'twice a day': 'दिवसातून दोन वेळा',
        'once daily': 'दररोज एकदा',
        'after food': 'जेवणानंतर',
        'before food': 'जेवणापूर्वी',
        'with water': 'पाण्यासह',
        'mg': 'मिलीग्रॅम',
        'ml': 'मिलीलीटर',
        
        // Common medicines
        'paracetamol': 'पॅरासिटामॉल',
        'ibuprofen': 'आयबुप्रोफेन',
        'amoxicillin': 'अमोक्सिसिलिन',
        'vitamin c': 'जीवनसत्त्व क',
        'vitamin d': 'जीवनसत्त्व ड',
        'insulin': 'इन्सुलिन'
      }
    };

    let translated = text;
    const langTranslations = translations[langCode];
    
    if (langTranslations) {
      // Replace terms (longer phrases first to avoid partial replacements)
      const sortedTerms = Object.entries(langTranslations)
        .sort(([a], [b]) => b.length - a.length);
      
      for (const [english, translatedWord] of sortedTerms) {
        const regex = new RegExp(`\\b${english}\\b`, 'gi');
        translated = translated.replace(regex, translatedWord);
      }
    }

    return translated || text;
  };

  // Change language and translate all form content
  const changeLanguageAndTranslate = async (lng) => {
    if (lng === language) return;
    
    setTranslating(true);
    
    try {
      // Translate all fields
      const [translatedDiagnosis, translatedNutrition, translatedNotes, translatedMedicines] = await Promise.all([
        translateText(diagnosis, lng),
        translateText(nutrition, lng),
        translateText(notes, lng),
        translateText(medicines, lng)
      ]);

      // Update state with translations
      setDiagnosis(translatedDiagnosis);
      setNutrition(translatedNutrition);
      setNotes(translatedNotes);
      setMedicines(translatedMedicines);
      setLanguage(lng);

    } catch (error) {
      console.error("Translation error:", error);
      alert("Translation failed. Please try again.");
    } finally {
      setTranslating(false);
    }
  };

  // Get label text based on current language
  const getLabel = (field) => {
    const labels = {
      diagnosis: { en: "Diagnosis", hi: "निदान", mr: "निदान" },
      nutrition: { en: "Nutrition (detailed plan)", hi: "पोषण (विस्तृत योजना)", mr: "पोषण (तपशीलवार योजना)" },
      notes: { en: "Important Notes / Follow-up", hi: "महत्वपूर्ण नोट्स / फॉलो-अप", mr: "महत्वाच्या नोट्स / फॉलो-अप" },
      medicines: { en: "Medicines", hi: "दवाएं", mr: "औषधे" }
    };
    return labels[field][language] || labels[field].en;
  };

  // Speech recognition functions (unchanged from your original code)
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser. Use Chrome/Edge.");
      return;
    }

    if (recording) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'en' ? 'en-IN' : language === 'hi' ? 'hi-IN' : 'mr-IN';

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          cumulativeRef.current += res[0].transcript + " ";
        } else {
          interim += res[0].transcript;
        }
      }
      setTranscript(cumulativeRef.current + interim);

      clearTimeout(autofillTimerRef.current);
      autofillTimerRef.current = setTimeout(() => {
        analyzeAndAutofill(cumulativeRef.current.trim());
      }, 10000);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        console.warn("No speech detected. Try speaking louder or check mic.");
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current && recognitionRef.current._keepGoing) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Auto-restart failed:", e);
        }
      }
    };

    recognitionRef.current = recognition;
    recognitionRef.current._keepGoing = true;
    recognition.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current._keepGoing = false;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.warn("Stop error:", e);
    }
    setRecording(false);

    clearTimeout(autofillTimerRef.current);
    analyzeAndAutofill(cumulativeRef.current.trim());
  };

  const newSession = () => {
    if (recognitionRef.current) {
      recognitionRef.current._keepGoing = false;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    cumulativeRef.current = "";
    setTranscript("");
    setDiagnosis("");
    setNutrition("");
    setNotes("");
    setMedicines("");
    setRecording(false);
    setLanguage('en');
    clearTimeout(autofillTimerRef.current);
  };

  const analyzeNow = () => {
    clearTimeout(autofillTimerRef.current);
    analyzeAndAutofill(cumulativeRef.current.trim());
  };

  // Analysis functions (unchanged from your original code)
  const analyzeAndAutofill = (fullText) => {
    if (!fullText || fullText.trim().length === 0) return;
    setAnalyzing(true);

    const diag = parseDiagnosis(fullText);
    const meds = parseMedicines(fullText);
    const notesParsed = parseNotes(fullText);
    const nutritionPlan = generateNutritionPlan(fullText, diag);

    setDiagnosis((prev) => (prev && prev.trim() ? prev : diag));
    setNutrition((prev) => (prev && prev.trim() ? prev : nutritionPlan));
    setNotes((prev) => (prev && prev.trim() ? prev : notesParsed));
    setMedicines((prev) => (prev && prev.trim() ? prev : meds));

    setAnalyzing(false);
  };

  const parseDiagnosis = (text) => {
    const patterns = [
      /diagnosis[:\-\s]*([^\.\n,]+)/i,
      /diagnosed with\s+([^\.\n,]+)/i,
      /diagnosis is\s+([^\.\n,]+)/i,
      /patient (?:has|is suffering from|complains of|complains about)\s+([^\.\n,]+)/i
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m && m[1]) return m[1].trim();
    }

    const symptoms = [];
    if (/\bfever\b/i.test(text)) symptoms.push("fever");
    if (/\bcough\b/i.test(text)) symptoms.push("cough");
    if (/\bcold\b|\bsore throat\b/i.test(text)) symptoms.push("cold/sore throat");
    if (/\bheadache\b/i.test(text)) symptoms.push("headache");
    if (/\bnausea\b/i.test(text)) symptoms.push("nausea");
    if (symptoms.length) return `${symptoms.join(", ")} — likely viral/acute symptomatic condition`;

    return "";
  };

  const parseMedicines = (text) => {
    const meds = new Set();
    const presRE = /(?:prescribe(?:d)?|prescribed|give|take|start)\s+([a-zA-Z0-9\-\s\,]{3,80}?)(?=[\.\n,]|$)/ig;
    let m;
    while ((m = presRE.exec(text)) !== null) {
      const candidate = m[1].trim();
      if (candidate.length > 1) meds.add(cleanMedString(candidate));
    }

    const drugRE = /([A-Za-z][A-Za-z0-9\-\s]{1,40}\s*\d{0,4}\s*mg(?:\s*(?:once|twice|thrice|daily|bd|tds|per day|a day|once a day|twice a day))?)/ig;
    while ((m = drugRE.exec(text)) !== null) {
      meds.add(cleanMedString(m[1].trim()));
    }

    const common = ["paracetamol", "ibuprofen", "amoxicillin", "vitamin c", "vitamin d", "cetirizine", "ondansetron", "metformin", "insulin"];
    for (const name of common) {
      const re = new RegExp("\\b" + name + "\\b", "i");
      if (re.test(text)) meds.add(name);
    }

    return Array.from(meds).join("; ");
  };

  const cleanMedString = (s) => s.replace(/\s{2,}/g, " ").replace(/\s+,$/, "").trim();

  const parseNotes = (text) => {
    const notesOut = [];
    const noteRE = /(?:remember|note|important|follow(?:-| )?up|next visit|check)\s+([^.\n,]+)/ig;
    let m;
    while ((m = noteRE.exec(text)) !== null) {
      if (m[1]) notesOut.push(m[1].trim());
    }
    const followRE = /follow(?:-| )?up(?: in)?\s+([^\.\n,]+)/ig;
    while ((m = followRE.exec(text)) !== null) {
      if (m[1]) notesOut.push("Follow-up: " + m[1].trim());
    }
    return notesOut.join(". ");
  };

  const generateNutritionPlan = (text, diag) => {
    const plan = [];
    plan.push("Hydration: Aim for 2–3 L water/day; oral rehydration or electrolyte drinks if febrile or dehydrated.");

    if (/\bfever\b|\bviral\b|\bcough\b|\bcold\b/i.test(text) || /fever|viral/i.test(diag)) {
      plan.push("During fever/cold: Warm fluids (ginger/honey if >1 yr), soups, light khichdi, avoid cold drinks and heavy fried foods.");
    }
    if (/\bdiabetes\b|\bsugar\b/i.test(text) || /diabetes/i.test(diag)) {
      plan.push("Diabetes: Low glycemic index foods; prioritize whole grains, legumes, lean protein; avoid sweets & refined carbs; monitor portions.");
      plan.push("Sample: Breakfast - oats/egg + veggies; Lunch - salad + dal/roti (controlled portion); Evening snack - fruit/nuts; Dinner - vegetables + protein.");
    }
    if (/\bhypertension\b|\bbp\b|\bblood pressure\b/i.test(text) || /hypertension/i.test(diag)) {
      plan.push("Hypertension: Reduce salt intake, avoid processed foods, increase fruits/vegetables, intake potassium-rich foods (banana, spinach).");
    }
    if (/\banemia\b|\blow hemoglobin\b/i.test(text) || /anemia/i.test(diag)) {
      plan.push("Anemia: Iron-rich foods (leafy greens, legumes, jaggery, dates), combine with vitamin C rich foods to enhance absorption.");
    }
    if (/\bweak\b|\bfatigued\b|\btired\b/i.test(text)) {
      plan.push("Fatigue/weakness: Include protein-rich items (eggs, dal, paneer), nuts/seeds, and small frequent meals.");
    }

    plan.push("Balanced sample day:\nBreakfast: Protein + whole grain (eggs/oats)\nMid-morning: Fruit or nuts\nLunch: Veg + protein + small complex carb\nEvening: Fruit or light snack\nDinner: Light protein + vegetables\nSupplements: Vitamin D/Multivitamin if indicated by labs.\nLifestyle: Light physical activity (30 min), good sleep (7–8 hrs), stress reduction.");

    return plan.join("\n\n");
  };

  // Export functions
  const exportToPDF = () => {
    if (!diagnosis && !nutrition && !notes && !medicines) {
      alert("No consultation data to export. Please fill the form first.");
      return;
    }

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Doctor Consultation Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; color: #2c5aa0; margin-bottom: 5px; }
          .section-content { margin-left: 20px; white-space: pre-line; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Doctor Consultation Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Language: ${language.toUpperCase()}</p>
        </div>
        
        <div class="section">
          <div class="section-title">Diagnosis:</div>
          <div class="section-content">${diagnosis || 'Not specified'}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Nutrition Plan:</div>
          <div class="section-content">${nutrition || 'Not specified'}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Important Notes / Follow-up:</div>
          <div class="section-content">${notes || 'Not specified'}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Medicines:</div>
          <div class="section-content">${medicines || 'Not specified'}</div>
        </div>
        
        <div class="footer">
          <p>This is an auto-generated consultation report. Please consult your doctor for any concerns.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const exportToJSON = () => {
    const consultationData = {
      diagnosis,
      nutrition,
      notes,
      medicines,
      transcript: cumulativeRef.current,
      timestamp: new Date().toISOString(),
      language
    };

    const dataStr = JSON.stringify(consultationData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consultation-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="doctor-screen">
      <h1>Doctor Consultation</h1>

      <div className="top-controls">
        <div className="lang-group">
          <label>Speech Language:</label>
          <select 
            value={language} 
            onChange={(e) => {
              setLanguage(e.target.value);
              // Update speech recognition language but don't translate content
            }}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
          </select>
        </div>

        <div className="buttons">
          <button onClick={startRecording} disabled={recording}>
            {recording ? "Recording…" : "Start Recording"}
          </button>
          <button onClick={stopRecording} disabled={!recording}>
            Done / Analyze Now
          </button>
          <button onClick={analyzeNow} className="secondary">Analyze Now</button>
          <button onClick={newSession} className="danger">New Session</button>
        </div>
      </div>

      <h2>Live Transcription</h2>
      <div className="transcription">{transcript || <i>No transcription yet.</i>}</div>

      <div className="analyze-status">
        {analyzing && "Analyzing… please wait."}
        {translating && "Translating… please wait."}
      </div>

      <h2>Auto-filled Consultation Form</h2>

      <div className="translation-controls">
        <label>Translate form content to:</label>
        <button 
          onClick={() => changeLanguageAndTranslate('en')} 
          disabled={translating || language === 'en'}
          className={`translation-btn ${language === 'en' ? 'active' : ''}`}
        >
          English
        </button>
        <button 
          onClick={() => changeLanguageAndTranslate('hi')} 
          disabled={translating || language === 'hi'}
          className={`translation-btn ${language === 'hi' ? 'active' : ''}`}
        >
          Hindi
        </button>
        <button 
          onClick={() => changeLanguageAndTranslate('mr')} 
          disabled={translating || language === 'mr'}
          className={`translation-btn ${language === 'mr' ? 'active' : ''}`}
        >
          Marathi
        </button>
      </div>

      <label>{getLabel('diagnosis')}</label>
      <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />

      <label>{getLabel('nutrition')}</label>
      <textarea value={nutrition} onChange={(e) => setNutrition(e.target.value)} rows={6} />

      <label>{getLabel('notes')}</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />

      <label>{getLabel('medicines')}</label>
      <textarea value={medicines} onChange={(e) => setMedicines(e.target.value)} />

      <div className="export-controls">
        <h3>Export</h3>
        <div className="export-buttons">
          <button onClick={exportToPDF} className="export-btn">
            Print as PDF
          </button>
          <button onClick={exportToJSON} className="export-btn">
            Export as JSON
          </button>
        </div>
      </div>

      <div className="footer-note">
        Tip: speak clearly. Recording auto-analyzes 10s after silence or when you press Done.
        Use translation buttons to convert form content between languages.
      </div>
    </div>
  );
}