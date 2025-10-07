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
  const [patientPhone, setPatientPhone] = useState("");
  const [sendingSMS, setSendingSMS] = useState(false);
  const [smsStatus, setSmsStatus] = useState("");

  const recognitionRef = useRef(null);
  const cumulativeRef = useRef("");
  const autofillTimerRef = useRef(null);

  // Enhanced diagnosis parsing focusing on symptoms and medical conditions
  const parseDiagnosis = (text) => {
    const symptoms = [];
    const conditions = [];
    
    // Convert to lowercase for easier matching
    const lowerText = text.toLowerCase();
    
    // Symptom detection with context
    if (/\b(fever|high temperature|hot body|shivering)\b/i.test(text)) symptoms.push("Fever");
    if (/\b(cough|dry cough|wet cough|persistent cough)\b/i.test(text)) symptoms.push("Cough");
    if (/\b(cold|runny nose|nasal congestion|sneezing)\b/i.test(text)) symptoms.push("Cold symptoms");
    if (/\b(sore throat|throat pain|difficulty swallowing)\b/i.test(text)) symptoms.push("Sore throat");
    if (/\b(headache|migraine|head pain)\b/i.test(text)) symptoms.push("Headache");
    if (/\b(nausea|vomiting|sickness)\b/i.test(text)) symptoms.push("Nausea/Vomiting");
    if (/\b(body ache|muscle pain|joint pain)\b/i.test(text)) symptoms.push("Body aches");
    if (/\b(weakness|fatigue|tiredness)\b/i.test(text)) symptoms.push("Fatigue/Weakness");
    if (/\b(chest pain|breathing difficulty|shortness of breath)\b/i.test(text)) symptoms.push("Respiratory issues");
    if (/\b(diarrhea|loose motion|stomach upset)\b/i.test(text)) symptoms.push("Diarrhea");
    
    // Medical condition detection
    if (/\b(viral|viral infection|viral fever)\b/i.test(text)) conditions.push("Viral Infection");
    if (/\b(bacterial|bacterial infection)\b/i.test(text)) conditions.push("Bacterial Infection");
    if (/\b(flu|influenza)\b/i.test(text)) conditions.push("Influenza");
    if (/\b(uti|urinary infection|burning urine)\b/i.test(text)) conditions.push("Urinary Tract Infection");
    if (/\b(hypertension|high blood pressure|high bp)\b/i.test(text)) conditions.push("Hypertension");
    if (/\b(diabetes|high sugar|blood sugar)\b/i.test(text)) conditions.push("Diabetes");
    if (/\b(asthma|breathing problem|wheezing)\b/i.test(text)) conditions.push("Asthma");
    if (/\b(anemia|low hemoglobin|low blood)\b/i.test(text)) conditions.push("Anemia");
    if (/\b(infection|infected)\b/i.test(text) && conditions.length === 0) conditions.push("General Infection");
    
    // Build diagnosis summary
    let diagnosisText = "";
    
    if (symptoms.length > 0) {
      diagnosisText += `Symptoms: ${symptoms.join(", ")}`;
    }
    
    if (conditions.length > 0) {
      if (diagnosisText) diagnosisText += "\n";
      diagnosisText += `Condition: ${conditions.join(", ")}`;
    }
    
    // Fallback if no specific symptoms/conditions detected
    if (!diagnosisText) {
      // Look for explicit diagnosis mentions
      const diagnosisPatterns = [
        /diagnosis[:\-\s]*([^\.\n,]+)/i,
        /diagnosed with\s+([^\.\n,]+)/i,
        /diagnosis is\s+([^\.\n,]+)/i,
        /suffering from\s+([^\.\n,]+)/i,
        /has\s+([^\.\n,]+)/i,
        /complains of\s+([^\.\n,]+)/i
      ];
      
      for (const pattern of diagnosisPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          diagnosisText = match[1].trim();
          break;
        }
      }
      
      // Ultimate fallback
      if (!diagnosisText && text.trim().length > 0) {
        diagnosisText = "General medical consultation required - symptoms need evaluation";
      }
    }
    
    return diagnosisText;
  };

  // Enhanced medicine parsing
  const parseMedicines = (text) => {
    const meds = new Set();

    const medicinePatterns = [
      /(?:prescribe|prescribed|give|take|recommend|advise|suggest)\s+([a-zA-Z0-9\-\s\,]{3,80}?)(?=[\.\n,]|$)/ig,
      /([A-Za-z][A-Za-z0-9\-\s]{1,40}\s*\d{0,4}\s*mg(?:\s*(?:once|twice|thrice|daily|bd|tds|per day|a day|once a day|twice a day))?)/ig,
    ];

    medicinePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          const candidate = match[1].trim();
          if (candidate.length > 1) meds.add(candidate.replace(/\s{2,}/g, " ").replace(/\s+,$/, "").trim());
        }
      }
    });

    const common = ["paracetamol", "ibuprofen", "amoxicillin", "vitamin c", "vitamin d", "cetirizine", "ondansetron", "metformin", "insulin"];
    common.forEach(name => {
      const re = new RegExp("\\b" + name + "\\b", "i");
      if (re.test(text)) meds.add(name);
    });

    return Array.from(meds).join("; ");
  };

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
    
    if (notesOut.length === 0) {
      notesOut.push("Follow-up in 3 days if symptoms persist");
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

  // SMS Functions
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const sendSMS = async (type) => {
    if (!patientPhone) {
      setSmsStatus("Please enter patient's phone number");
      return;
    }

    if (!validatePhoneNumber(patientPhone)) {
      setSmsStatus("Please enter a valid phone number (e.g., +919876543210)");
      return;
    }

    let messageBody = "";
    let sectionName = "";

    switch (type) {
      case 'diagnosis':
        if (!diagnosis) {
          setSmsStatus("No diagnosis to send");
          return;
        }
        sectionName = "Diagnosis";
        messageBody = `🏥 Medical Diagnosis:\n\n${diagnosis}\n\nPlease consult your doctor for any concerns.`;
        break;
      
      case 'medicines':
        if (!medicines) {
          setSmsStatus("No medicines to send");
          return;
        }
        sectionName = "Medicines";
        messageBody = `💊 Prescribed Medicines:\n\n${medicines}\n\nTake as directed by your doctor.`;
        break;
      
      case 'nutrition':
        if (!nutrition) {
          setSmsStatus("No nutrition plan to send");
          return;
        }
        sectionName = "Nutrition Plan";
        // Take first 3 lines for SMS brevity
        const nutritionShort = nutrition.split('\n').slice(0, 3).join('\n');
        messageBody = `🍎 Nutrition Plan:\n\n${nutritionShort}\n\nFollow this dietary advice for better recovery.`;
        break;
      
      case 'notes':
        if (!notes) {
          setSmsStatus("No notes to send");
          return;
        }
        sectionName = "Important Notes";
        messageBody = `📝 Important Notes:\n\n${notes}\n\nPlease follow these instructions carefully.`;
        break;
      
      case 'all':
        if (!diagnosis && !medicines && !notes) {
          setSmsStatus("No consultation data to send");
          return;
        }
        sectionName = "Complete Consultation";
        messageBody = `🏥 Medical Consultation Summary:\n\n`;
        if (diagnosis) messageBody += `Diagnosis: ${diagnosis}\n\n`;
        if (medicines) messageBody += `Medicines: ${medicines}\n\n`;
        if (notes) messageBody += `Notes: ${notes}\n\n`;
        messageBody += `Follow medical advice and consult your doctor for concerns.`;
        break;
      
      default:
        return;
    }

    setSendingSMS(true);
    setSmsStatus(`Sending ${sectionName}...`);

    try {
      const response = await fetch('http://localhost:5000/api/send_sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: patientPhone,
          diagnosis: type === 'diagnosis' || type === 'all' ? diagnosis : '',
          medicines: type === 'medicines' || type === 'all' ? medicines : '',
          nutrition: type === 'nutrition' || type === 'all' ? nutrition : '',
          notes: type === 'notes' || type === 'all' ? notes : '',
          message_type: type
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        setSmsStatus(`✅ ${sectionName} sent successfully to ${patientPhone}`);
      } else {
        setSmsStatus(`❌ Failed to send: ${result.error}`);
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      setSmsStatus('❌ Network error. Please check if backend server is running.');
    } finally {
      setSendingSMS(false);
    }
  };

  // Professional PDF Export
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add professional header
    doc.setFillColor(44, 90, 160);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MEDICAL CONSULTATION REPORT', 105, 20, { align: 'center' });
    
    // Patient information and date
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 35, { align: 'center' });
    
    let yPosition = 50;
    
    // Diagnosis section with professional styling
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setTextColor(44, 90, 160);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DIAGNOSIS', 25, yPosition + 6);
    
    yPosition += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const diagnosisLines = doc.splitTextToSize(diagnosis || 'No diagnosis specified', 170);
    diagnosisLines.forEach(line => {
      doc.text(line, 25, yPosition);
      yPosition += 5;
    });
    
    yPosition += 10;
    
    // Medicines section
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setTextColor(44, 90, 160);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MEDICATIONS', 25, yPosition + 6);
    
    yPosition += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const medicineLines = doc.splitTextToSize(medicines || 'No medications specified', 170);
    medicineLines.forEach(line => {
      doc.text(line, 25, yPosition);
      yPosition += 5;
    });
    
    yPosition += 10;
    
    // Nutrition section
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setTextColor(44, 90, 160);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('NUTRITION PLAN', 25, yPosition + 6);
    
    yPosition += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const nutritionLines = doc.splitTextToSize(nutrition || 'No nutrition plan specified', 170);
    nutritionLines.forEach(line => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 25, yPosition);
      yPosition += 5;
    });
    
    yPosition += 10;
    
    // Notes section
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setTextColor(44, 90, 160);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANT NOTES & FOLLOW-UP', 25, yPosition + 6);
    
    yPosition += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const notesLines = doc.splitTextToSize(notes || 'No notes specified', 170);
    notesLines.forEach(line => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 25, yPosition);
      yPosition += 5;
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('This is an auto-generated medical consultation report. Consult your healthcare provider for any concerns.', 105, 285, { align: 'center' });
    
    doc.save(`medical-consultation-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // JSON Export
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
    setPatientPhone("");
    setSmsStatus("");
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

      {/* SMS Controls */}
      <div className="sms-controls">
        <h3>📱 Send SMS to Patient</h3>
        
        <div className="phone-input-group">
          <label>Patient Phone Number:</label>
          <input
            type="tel"
            placeholder="+919876543210"
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
            className="phone-input"
          />
          <small>Format: +91 followed by 10 digits</small>
        </div>

        <div className="sms-buttons">
          <button 
            onClick={() => sendSMS('diagnosis')} 
            disabled={sendingSMS || !diagnosis}
            className="sms-btn diagnosis-btn"
          >
            🏥 Send Diagnosis
          </button>
          
          <button 
            onClick={() => sendSMS('medicines')} 
            disabled={sendingSMS || !medicines}
            className="sms-btn medicines-btn"
          >
            💊 Send Medicines
          </button>
          
          <button 
            onClick={() => sendSMS('nutrition')} 
            disabled={sendingSMS || !nutrition}
            className="sms-btn nutrition-btn"
          >
            🍎 Send Nutrition Plan
          </button>
          
          <button 
            onClick={() => sendSMS('notes')} 
            disabled={sendingSMS || !notes}
            className="sms-btn notes-btn"
          >
            📝 Send Notes
          </button>
          
          <button 
            onClick={() => sendSMS('all')} 
            disabled={sendingSMS || (!diagnosis && !medicines && !notes)}
            className="sms-btn all-btn"
          >
            📋 Send Complete Summary
          </button>
        </div>

        {smsStatus && (
          <div className={`sms-status ${smsStatus.includes('✅') ? 'success' : 'error'}`}>
            {smsStatus}
          </div>
        )}
      </div>

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