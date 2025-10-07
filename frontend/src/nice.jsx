import React, { useState, useRef } from "react";
import "./DoctorScreen.css";
import jsPDF from "jspdf";

export default function DoctorScreen() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [nutrition, setNutrition] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [language, setLanguage] = useState("en-IN");

  const recognitionRef = useRef(null);
  const cumulativeRef = useRef("");
  const autofillTimerRef = useRef(null);

  // Enhanced diagnosis parsing with comprehensive symptom and condition detection
  const parseDiagnosis = (text) => {
    const symptoms = [];
    const conditions = [];
    const textLower = text.toLowerCase();

    // Comprehensive symptom detection
    const symptomPatterns = {
      fever: /\b(fever|high temperature|hot body|shivering|chills|pyrexia)\b/i,
      cough: /\b(cough|coughing|hacking)\b/i,
      headache: /\b(headache|head pain|migraine|cephalgia)\b/i,
      nausea: /\b(nausea|nauseous|queasy|sick to stomach)\b/i,
      fatigue: /\b(fatigue|tired|exhausted|weakness|lethargy)\b/i,
      dizziness: /\b(dizziness|dizzy|vertigo|lightheaded)\b/i,
      vomiting: /\b(vomiting|throwing up|puking|emesis)\b/i,
      diarrhea: /\b(diarrhea|loose motion|watery stool)\b/i,
      pain: /\b(pain|hurting|sore|ache|discomfort)\b/i,
      swelling: /\b(swelling|swollen|inflammation|edema)\b/i
    };

    // Medical condition patterns
    const conditionPatterns = {
      'Viral Infection': /\b(viral|virus|viral infection|viral fever)\b/i,
      'Upper Respiratory Infection': /\b(uri|upper respiratory|respiratory infection|chest infection)\b/i,
      'Hypertension': /\b(high blood pressure|hypertension|htn|bp high)\b/i,
      'Diabetes': /\b(diabetes|diabetic|high sugar|blood sugar|dm)\b/i,
      'Anemia': /\b(anemia|low hemoglobin|low blood|iron deficiency)\b/i,
      'Gastroenteritis': /\b(gastroenteritis|stomach flu|gastric|stomach infection)\b/i,
      'Asthma': /\b(asthma|asthmatic|wheezing|breathing problem)\b/i,
      'Arthritis': /\b(arthritis|joint pain|rheumatoid)\b/i,
      'UTI': /\b(urinary infection|uti|bladder infection|burning urine)\b/i,
      'COPD': /\b(copd|chronic obstructive|lung disease|emphysema)\b/i
    };

    // Detect symptoms
    Object.entries(symptomPatterns).forEach(([symptom, pattern]) => {
      if (pattern.test(textLower)) {
        symptoms.push(symptom);
      }
    });

    // Detect medical conditions
    Object.entries(conditionPatterns).forEach(([condition, pattern]) => {
      if (pattern.test(textLower)) {
        conditions.push(condition);
      }
    });

    // Extract explicit diagnosis mentions
    const diagnosisPatterns = [
      /diagnosis[:\-\s]*([^\.\n,]+)/i,
      /diagnosed with\s+([^\.\n,]+)/i,
      /diagnosis is\s+([^\.\n,]+)/i,
      /suffering from\s+([^\.\n,]+)/i,
      /has\s+([^\.\n,]+)/i,
      /complains of\s+([^\.\n,]+)/i,
      /likely\s+([^\.\n,]+)/i,
      /probable\s+([^\.\n,]+)/i,
      /suspected\s+([^\.\n,]+)/i
    ];

    let explicitDiagnosis = "";
    for (const pattern of diagnosisPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        explicitDiagnosis = match[1].trim();
        break;
      }
    }

    // Build comprehensive diagnosis
    let diagnosisText = "";
    
    if (explicitDiagnosis) {
      diagnosisText = `Diagnosis: ${explicitDiagnosis}`;
    } else if (conditions.length > 0) {
      diagnosisText = `Detected Conditions: ${conditions.join(", ")}`;
    }
    
    if (symptoms.length > 0) {
      diagnosisText += diagnosisText ? `\nSymptoms: ${symptoms.join(", ")}` : `Symptoms Reported: ${symptoms.join(", ")}`;
    }

    if (!diagnosisText) {
      // Fallback: look for any medical terminology patterns
      const medicalTermPatterns = [
        /\b(infection|inflammation|deficiency|disorder|syndrome|disease)\b/i,
        /\b(acute|chronic|severe|mild|moderate)\b/i,
        /\b(hypertension|diabetes|anemia|asthma|arthritis)\b/i
      ];

      const foundTerms = [];
      medicalTermPatterns.forEach(pattern => {
        const matches = textLower.match(pattern);
        if (matches) foundTerms.push(...matches);
      });

      if (foundTerms.length > 0) {
        diagnosisText = `Medical terms detected: ${[...new Set(foundTerms)].join(", ")} - Review recommended`;
      } else {
        diagnosisText = "No specific diagnosis detected. General checkup recommended.";
      }
    }

    return diagnosisText;
  };

  // Enhanced medicine parsing
  const parseMedicines = (text) => {
    const meds = new Set();

    // Enhanced medicine patterns
    const medicinePatterns = [
      /(?:prescribe|prescribed|give|take|recommend|advise|suggest|start)\s+([a-zA-Z0-9\-\s\,]{3,80}?(?:\s*\d+\s*mg|\s*\d+\s*ml|\s*twice daily|\s*once daily|\s*thrice daily|\s*after food|\s*before food|\s*at night|\s*in the morning)?)/gi,
      /(?:medicine|medication|drug|tablet|pill)\s+(?:is|are|should be|recommended)\s+([a-zA-Z0-9\s\-\,]{3,50})/gi,
      /(?:take|use|administer)\s+([a-zA-Z][a-zA-Z0-9\s\-]*\s*\d+\s*(?:mg|ml)(?:\s*(?:once|twice|thrice|daily|bd|tds|per day|a day|every day))?)/gi
    ];

    medicinePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          const candidate = cleanMedString(match[1].trim());
          if (candidate.length > 2) meds.add(candidate);
        }
      }
    });

    // Common medicine combinations based on symptoms
    const symptomMeds = {
      fever: ["Paracetamol 500mg twice daily", "Ibuprofen 400mg as needed"],
      cough: ["Cough syrup as needed", "Amoxicillin 500mg thrice daily if bacterial"],
      headache: ["Paracetamol 500mg every 6 hours", "Ibuprofen 400mg as needed"],
      pain: ["Ibuprofen 400mg every 8 hours", "Paracetamol 500mg as needed"]
    };

    // Add medicines based on detected symptoms
    Object.entries(symptomMeds).forEach(([symptom, medications]) => {
      if (text.toLowerCase().includes(symptom)) {
        medications.forEach(med => meds.add(med));
      }
    });

    return Array.from(meds).join("; ");
  };

  const cleanMedString = (s) => s.replace(/\s{2,}/g, " ").replace(/\s+,$/, "").trim();

  // Enhanced notes parsing
  const parseNotes = (text) => {
    const notesOut = [];
    const textLower = text.toLowerCase();

    // Follow-up patterns
    const followPatterns = [
      /follow up in\s+([^\.\n,]+)/gi,
      /review after\s+([^\.\n,]+)/gi,
      /come back after\s+([^\.\n,]+)/gi,
      /next visit in\s+([^\.\n,]+)/gi,
      /see you in\s+([^\.\n,]+)/gi,
      /return in\s+([^\.\n,]+)/gi
    ];

    followPatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) notesOut.push(`Follow-up: ${match[0]}`);
    });

    // Important instructions
    const instructionPatterns = [
      /remember to\s+([^\.\n,]+)/gi,
      /important to\s+([^\.\n,]+)/gi,
      /make sure to\s+([^\.\n,]+)/gi,
      /avoid\s+([^\.\n,]+)/gi,
      /take rest\s+([^\.\n,]*)/gi,
      /drink plenty\s+([^\.\n,]*)/gi,
      /get enough\s+([^\.\n,]*)/gi,
      /monitor\s+([^\.\n,]*)/gi,
      /watch for\s+([^\.\n,]*)/gi
    ];

    instructionPatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) notesOut.push(match[0].charAt(0).toUpperCase() + match[0].slice(1));
    });

    // Default follow-up if nothing specific found
    if (notesOut.length === 0) {
      notesOut.push("Follow-up in 3 days if symptoms persist. Take rest and stay hydrated.");
    }

    return notesOut.join(". ");
  };

  // Enhanced nutrition planning
  const generateNutritionPlan = (text, diag) => {
    const plan = [];
    const textLower = text.toLowerCase();

    // Base hydration
    plan.push("💧 Hydration: Aim for 2-3 liters of water daily. Include ORS/electrolyte drinks if fever or dehydration present.");

    // Enhanced condition-specific plans
    const conditionPlans = {
      fever: "🍵 During fever: Warm fluids (ginger tea, honey lemon water), light soups, khichdi, soft fruits. Avoid cold drinks and heavy fried foods.",
      cough: "🍯 Cough relief: Warm water with honey, turmeric milk, steam inhalation. Stay hydrated and avoid cold foods.",
      diabetes: "🩸 Diabetes diet: Low glycemic index foods; prioritize whole grains, legumes, lean protein; avoid sweets & refined carbs; monitor portions.",
      hypertension: "🧂 Hypertension: Reduce salt intake, avoid processed foods, increase fruits/vegetables, intake potassium-rich foods (banana, spinach).",
      anemia: "🔴 Anemia nutrition: Iron-rich foods (leafy greens, legumes, jaggery, dates), combine with vitamin C rich foods to enhance absorption.",
      fatigue: "💪 Fatigue/weakness: Include protein-rich items (eggs, dal, paneer), nuts/seeds, and small frequent meals."
    };

    // Add condition-specific plans based on detected conditions or symptoms
    Object.entries(conditionPlans).forEach(([condition, advice]) => {
      if (textLower.includes(condition) || (diag && diag.toLowerCase().includes(condition))) {
        plan.push(advice);
      }
    });

    // General balanced plan
    plan.push(`📊 Balanced Daily Plan:
• Breakfast: Protein + whole grain (eggs/oats)
• Mid-morning: Fruit or nuts
• Lunch: Veg + protein + small complex carb
• Evening: Fruit or light snack
• Dinner: Light protein + vegetables
• Supplements: Vitamin D/Multivitamin if indicated by labs.
• Lifestyle: Light physical activity (30 min), good sleep (7-8 hrs), stress reduction.`);

    return plan.join("\n\n");
  };

  // Analysis function
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

  // Export to PDF function
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(44, 90, 160);
    doc.text("Medical Consultation Report", 105, 20, { align: 'center' });
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });
    
    let yPosition = 50;
    
    // Diagnosis section
    doc.setFontSize(14);
    doc.setTextColor(44, 90, 160);
    doc.text("Diagnosis:", 20, yPosition);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const diagnosisLines = doc.splitTextToSize(diagnosis || 'Not specified', 170);
    doc.text(diagnosisLines, 20, yPosition + 7);
    yPosition += diagnosisLines.length * 5 + 15;
    
    // Medicines section
    doc.setFontSize(14);
    doc.setTextColor(44, 90, 160);
    doc.text("Medicines:", 20, yPosition);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const medicineLines = doc.splitTextToSize(medicines || 'Not specified', 170);
    doc.text(medicineLines, 20, yPosition + 7);
    yPosition += medicineLines.length * 5 + 15;
    
    // Nutrition section
    doc.setFontSize(14);
    doc.setTextColor(44, 90, 160);
    doc.text("Nutrition Plan:", 20, yPosition);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const nutritionLines = doc.splitTextToSize(nutrition || 'Not specified', 170);
    doc.text(nutritionLines, 20, yPosition + 7);
    yPosition += nutritionLines.length * 5 + 15;
    
    // Notes section
    doc.setFontSize(14);
    doc.setTextColor(44, 90, 160);
    doc.text("Important Notes:", 20, yPosition);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const notesLines = doc.splitTextToSize(notes || 'Not specified', 170);
    doc.text(notesLines, 20, yPosition + 7);
    
    // Save the PDF
    doc.save(`consultation-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export to JSON function
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

  // Your existing recording functions remain exactly the same
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
    recognition.lang = language;

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
    clearTimeout(autofillTimerRef.current);
  };

  const analyzeNow = () => {
    clearTimeout(autofillTimerRef.current);
    analyzeAndAutofill(cumulativeRef.current.trim());
  };

  return (
    <div className="doctor-screen">
      <h1>Doctor Consultation</h1>

      <div className="top-controls">
        <div className="lang-group">
          <label>Language:</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en-IN">English (India)</option>
            <option value="hi-IN">Hindi (India)</option>
            <option value="mr-IN">Marathi (India)</option>
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

      <div className="analyze-status">{analyzing ? "Analyzing… please wait." : ""}</div>

      <h2>Auto-filled Consultation Form</h2>

      <label>Diagnosis</label>
      <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />

      <label>Nutrition (detailed plan)</label>
      <textarea value={nutrition} onChange={(e) => setNutrition(e.target.value)} rows={6} />

      <label>Important Notes / Follow-up</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />

      <label>Medicines</label>
      <textarea value={medicines} onChange={(e) => setMedicines(e.target.value)} />

      {/* Export Controls */}
      <div className="export-controls">
        <h3>Export Consultation</h3>
        <div className="export-buttons">
          <button onClick={exportToPDF} className="export-btn pdf-btn">
            📄 Print as PDF
          </button>
          <button onClick={exportToJSON} className="export-btn json-btn">
            💾 Export as JSON
          </button>
        </div>
      </div>

      <div className="footer-note">
        Tip: speak clearly. Recording auto-analyzes 10s after silence or when you press Done.
      </div>
    </div>
  );
}