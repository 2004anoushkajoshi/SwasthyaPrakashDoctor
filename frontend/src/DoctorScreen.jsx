import React, { useState, useRef, useEffect } from "react";
import "./DoctorScreen.css";
import jsPDF from "jspdf";
import { nodeAPI, flaskAPI } from "./services/apiService.js";

// Example: Node backend request
async function getPatientData() {
  try {
    const response = await nodeAPI.get("/api/patients");
    console.log("Node Response:", response.data);
  } catch (error) {
    console.error("Error fetching from Node:", error);
  }
}

// Example: Flask backend request
async function analyzeReport(data) {
  try {
    const response = await flaskAPI.post("/analyze", data);
    console.log("Flask Response:", response.data);
  } catch (error) {
    console.error("Error fetching from Flask:", error);
  }
}

export default function DoctorScreen() {
  // Existing states
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
  const [translating, setTranslating] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState({});
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState("hi-IN");
  const [translations, setTranslations] = useState({
    'hi-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Hindi" },
    'mr-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Marathi" },
    'ta-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Tamil" },
    'te-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Telugu" },
    'kn-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Kannada" },
    'bn-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Bengali" },
    'gu-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Gujarati" }
  });

  // New states for patient management
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [savingConsultation, setSavingConsultation] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  // Existing states for translation actions
  const [sendingTranslatedSMS, setSendingTranslatedSMS] = useState(false);
  const [translationActionStatus, setTranslationActionStatus] = useState("");

  const recognitionRef = useRef(null);
  const cumulativeRef = useRef("");
  const autofillTimerRef = useRef(null);

  // Fetch supported languages and patients on component mount
  useEffect(() => {
    fetchSupportedLanguages();
    fetchConsultingPatients();
  }, []);

  // Fetch patients with "consulting" status
  const fetchConsultingPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await fetch('http://localhost:5000/api/patients/consulting');
      const result = await response.json();
      if (result.status === 'success') {
        setPatients(result.patients);
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      setSaveStatus("Failed to load patients. Check if server is running.");
    } finally {
      setLoadingPatients(false);
    }
  };

  const fetchSupportedLanguages = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/languages');
      const result = await response.json();
      if (result.status === 'success') {
        setSupportedLanguages(result.languages);
      }
    } catch (error) {
      console.error("Failed to fetch supported languages:", error);
    }
  };

  // Handle patient selection
  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    
    // Reset form when selecting new patient
    setDiagnosis("");
    setNutrition("");
    setNotes("");
    setMedicines("");
    setTranscript("");
    cumulativeRef.current = "";
    
    // If you want to load existing consultation data for the patient:
    try {
      const response = await fetch(`http://localhost:5000/api/patients/${patient._id}`);
      const result = await response.json();
      if (result.status === 'success' && result.patient) {
        const patientData = result.patient;
        setDiagnosis(patientData.diagnosis || "");
        setNutrition(patientData.nutrition || "");
        setNotes(patientData.notes || "");
        setMedicines(patientData.medicines || "");
        setPatientPhone(patientData.patientPhone || "");
      }
    } catch (error) {
      console.error("Failed to fetch patient details:", error);
    }
  };

  // Save consultation data to MongoDB
  const saveConsultation = async () => {
    if (!selectedPatient) {
      setSaveStatus("Please select a patient first");
      return;
    }

    if (!diagnosis && !medicines && !nutrition && !notes) {
      setSaveStatus("Please add at least some consultation data before saving");
      return;
    }

    setSavingConsultation(true);
    setSaveStatus("Saving consultation data...");

    try {
      const response = await fetch(`http://localhost:5000/api/patients/${selectedPatient._id}/consultation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diagnosis,
          medicines,
          nutrition,
          notes,
          status: 'completed' // Change status to completed after consultation
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        setSaveStatus("Consultation saved successfully! Patient status updated to completed.");
        // Refresh patient list to remove the completed patient
        setTimeout(() => {
          fetchConsultingPatients();
          setSelectedPatient(null);
        }, 2000);
      } else {
        setSaveStatus(`Failed to save: ${result.error}`);
      }
    } catch (error) {
      console.error('Save consultation error:', error);
      setSaveStatus('Network error. Please check if backend server is running.');
    } finally {
      setSavingConsultation(false);
    }
  };

  // Enhanced translation function for multiple languages
  const translateText = async (targetLang = selectedTargetLanguage) => {
    if (!diagnosis && !nutrition && !notes && !medicines) {
      alert("No content available to translate");
      return;
    }

    setTranslating(true);

    try {
      const sections = {
        diagnosis: diagnosis || "No diagnosis",
        nutrition: nutrition || "No nutrition plan", 
        notes: notes || "No notes",
        medicines: medicines || "No medicines"
      };

      const translatedSections = {};
      
      for (const [section, text] of Object.entries(sections)) {
        if (text && text !== "No diagnosis" && text !== "No nutrition plan" && text !== "No notes" && text !== "No medicines") {
          const response = await fetch('http://localhost:5000/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: text,
              sourceLang: 'en-IN',
              targetLang: targetLang,
            })
          });

          const result = await response.json();
          
          if (response.ok && result.status === 'success') {
            translatedSections[section] = result.translated_text;
          } else {
            throw new Error(result.error || `Translation failed for ${section}`);
          }
        } else {
          translatedSections[section] = "";
        }
      }

      setTranslations(prev => ({
        ...prev,
        [targetLang]: {
          ...prev[targetLang],
          ...translatedSections,
          name: supportedLanguages[targetLang.split('-')[0]]?.name || targetLang
        }
      }));

    } catch (error) {
      console.error("Translation error:", error);
      alert(`Translation to ${supportedLanguages[targetLang.split('-')[0]]?.name || targetLang} failed: ${error.message}`);
    } finally {
      setTranslating(false);
    }
  };

  // Translate to all supported languages
  const translateToAllLanguages = async () => {
    if (!diagnosis && !nutrition && !notes && !medicines) {
      alert("No content available to translate");
      return;
    }

    setTranslating(true);

    try {
      const targetLangs = ['hi-IN', 'mr-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'gu-IN'];
      
      for (const lang of targetLangs) {
        await translateText(lang);
      }

      alert("Translation to all languages completed!");
    } catch (error) {
      console.error("Batch translation error:", error);
      alert("Some translations failed. Please check console for details.");
    } finally {
      setTranslating(false);
    }
  };

  // Function to send translated SMS for individual fields
  const sendTranslatedSMS = async (targetLang, messageType = 'all', fieldName = '') => {
    const translation = translations[targetLang];
    
    if (!patientPhone) {
      setTranslationActionStatus("Please enter patient's phone number");
      return;
    }

    if (!validatePhoneNumber(patientPhone)) {
      setTranslationActionStatus("Please enter a valid phone number (e.g., +919876543210)");
      return;
    }

    if (messageType !== 'all' && !translation[messageType]) {
      setTranslationActionStatus(`No ${fieldName} content available to send`);
      return;
    }

    if (messageType === 'all' && !translation.diagnosis && !translation.medicines && !translation.notes && !translation.nutrition) {
      setTranslationActionStatus("No translated content available to send");
      return;
    }

    setSendingTranslatedSMS(true);
    const actionName = messageType === 'all' ? 'Complete Summary' : fieldName;
    setTranslationActionStatus(`Sending ${actionName} in ${translation.name}...`);

    try {
      const response = await fetch('http://localhost:5000/api/send-translated-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: patientPhone,
          diagnosis: translation.diagnosis || '',
          nutrition: translation.nutrition || '',
          notes: translation.notes || '',
          medicines: translation.medicines || '',
          language_name: translation.name,
          message_type: messageType
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        setTranslationActionStatus(`${actionName} in ${translation.name} sent successfully to ${patientPhone}`);
      } else {
        setTranslationActionStatus(`Failed to send ${actionName}: ${result.error}`);
      }
    } catch (error) {
      console.error('Translated SMS sending error:', error);
      setTranslationActionStatus('Network error. Please check if backend server is running.');
    } finally {
      setSendingTranslatedSMS(false);
    }
  };

  // Fixed PDF generation for translated content
  const generateTranslatedPDF = (targetLang) => {
    const translation = translations[targetLang];
    
    if (!translation.diagnosis && !translation.nutrition && !translation.notes && !translation.medicines) {
      alert(`No translated content available for ${translation.name}`);
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Add professional header with language name
      doc.setFillColor(44, 90, 160);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`MEDICAL CONSULTATION REPORT (${translation.name})`, 105, 20, { align: 'center' });
      
      // Patient information and date
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 35, { align: 'center' });
      
      let yPosition = 50;
      
      // Diagnosis section
      if (translation.diagnosis) {
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
        const diagnosisLines = doc.splitTextToSize(translation.diagnosis, 170);
        diagnosisLines.forEach(line => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 25, yPosition);
          yPosition += 5;
        });
        yPosition += 10;
      }
      
      // Medicines section
      if (translation.medicines) {
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
        const medicineLines = doc.splitTextToSize(translation.medicines, 170);
        medicineLines.forEach(line => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 25, yPosition);
          yPosition += 5;
        });
        yPosition += 10;
      }
      
      // Nutrition section
      if (translation.nutrition) {
        doc.setFillColor(240, 240, 240);
        doc.rect(20, yPosition, 170, 8, 'F');
        doc.setTextColor(44, 90, 160);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('NUTRITION PLAN', 25, yPosition + 6);
        
        yPosition += 15;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        const nutritionLines = doc.splitTextToSize(translation.nutrition, 170);
        nutritionLines.forEach(line => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 25, yPosition);
          yPosition += 5;
        });
        yPosition += 10;
      }
      
      // Notes section
      if (translation.notes) {
        doc.setFillColor(240, 240, 240);
        doc.rect(20, yPosition, 170, 8, 'F');
        doc.setTextColor(44, 90, 160);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('IMPORTANT NOTES & FOLLOW-UP', 25, yPosition + 6);
        
        yPosition += 15;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        const notesLines = doc.splitTextToSize(translation.notes, 170);
        notesLines.forEach(line => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 25, yPosition);
          yPosition += 5;
        });
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('This is an auto-generated medical consultation report. Consult your healthcare provider for any concerns.', 105, 285, { align: 'center' });
      
      // Save the PDF
      doc.save(`medical-consultation-${translation.name}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      setTranslationActionStatus(`${translation.name} PDF generated successfully!`);
    } catch (error) {
      console.error('PDF generation error:', error);
      setTranslationActionStatus('PDF generation failed. Please try again.');
      alert('PDF generation error: ' + error.message);
    }
  };

  // Your existing parsing functions remain the same
  const parseDiagnosis = (text) => {
    const symptoms = [];
    const conditions = [];
    
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
      
      if (!diagnosisText && text.trim().length > 0) {
        diagnosisText = "General medical consultation required - symptoms need evaluation";
      }
    }
    
    return diagnosisText;
  };

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

  const sendSMS = async (type, targetLang = 'en-IN') => {
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

    // Use translated content if target language is not English
    const useTranslation = targetLang !== 'en-IN';
    const translation = translations[targetLang];

    switch (type) {
      case 'diagnosis':
        const diagnosisText = useTranslation ? translation.diagnosis : diagnosis;
        if (!diagnosisText) {
          setSmsStatus("No diagnosis to send");
          return;
        }
        sectionName = "Diagnosis";
        messageBody = `Medical Diagnosis:\n\n${diagnosisText}\n\nPlease consult your doctor for any concerns.`;
        break;
      
      case 'medicines':
        const medicinesText = useTranslation ? translation.medicines : medicines;
        if (!medicinesText) {
          setSmsStatus("No medicines to send");
          return;
        }
        sectionName = "Medicines";
        messageBody = `Prescribed Medicines:\n\n${medicinesText}\n\nTake as directed by your doctor.`;
        break;
      
      case 'nutrition':
        const nutritionText = useTranslation ? translation.nutrition : nutrition;
        if (!nutritionText) {
          setSmsStatus("No nutrition plan to send");
          return;
        }
        sectionName = "Nutrition Plan";
        const nutritionShort = nutritionText.split('\n').slice(0, 3).join('\n');
        messageBody = `Nutrition Plan:\n\n${nutritionShort}\n\nFollow this dietary advice for better recovery.`;
        break;
      
      case 'notes':
        const notesText = useTranslation ? translation.notes : notes;
        if (!notesText) {
          setSmsStatus("No notes to send");
          return;
        }
        sectionName = "Important Notes";
        messageBody = `Important Notes:\n\n${notesText}\n\nPlease follow these instructions carefully.`;
        break;
      
      case 'all':
        const allDiagnosis = useTranslation ? translation.diagnosis : diagnosis;
        const allMedicines = useTranslation ? translation.medicines : medicines;
        const allNotes = useTranslation ? translation.notes : notes;
        
        if (!allDiagnosis && !allMedicines && !allNotes) {
          setSmsStatus("No consultation data to send");
          return;
        }
        sectionName = "Complete Consultation";
        messageBody = `Medical Consultation Summary:\n\n`;
        if (allDiagnosis) messageBody += `Diagnosis: ${allDiagnosis}\n\n`;
        if (allMedicines) messageBody += `Medicines: ${allMedicines}\n\n`;
        if (allNotes) messageBody += `Notes: ${allNotes}\n\n`;
        messageBody += `Follow medical advice and consult your doctor for concerns.`;
        break;
      
      default:
        return;
    }

    setSendingSMS(true);
    const langSuffix = useTranslation ? ` in ${translation.name}` : "";
    setSmsStatus(`Sending ${sectionName}${langSuffix}...`);

    try {
      const endpoint = useTranslation ? '/api/send-translated-sms' : '/api/send_sms';
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: patientPhone,
          diagnosis: type === 'diagnosis' || type === 'all' ? (useTranslation ? translation.diagnosis : diagnosis) : '',
          medicines: type === 'medicines' || type === 'all' ? (useTranslation ? translation.medicines : medicines) : '',
          nutrition: type === 'nutrition' || type === 'all' ? (useTranslation ? translation.nutrition : nutrition) : '',
          notes: type === 'notes' || type === 'all' ? (useTranslation ? translation.notes : notes) : '',
          language_name: useTranslation ? translation.name : 'English',
          message_type: type
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        setSmsStatus(`${sectionName}${langSuffix} sent successfully to ${patientPhone}`);
      } else {
        setSmsStatus(`Failed to send: ${result.error}`);
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      setSmsStatus('Network error. Please check if backend server is running.');
    } finally {
      setSendingSMS(false);
    }
  };

  // Your existing recording functions
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
    setTranslationActionStatus("");
    setSelectedPatient(null);
    setTranslations({
      'hi-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Hindi" },
      'mr-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Marathi" },
      'ta-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Tamil" },
      'te-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Telugu" },
      'kn-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Kannada" },
      'bn-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Bengali" },
      'gu-IN': { diagnosis: "", nutrition: "", notes: "", medicines: "", name: "Gujarati" }
    });
    clearTimeout(autofillTimerRef.current);
  };

  const analyzeNow = () => {
    clearTimeout(autofillTimerRef.current);
    analyzeAndAutofill(cumulativeRef.current.trim());
  };

  // Professional PDF Export for English content
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
      language,
      translations
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

  // Helper function to check if a language has translations
  const hasTranslations = (langCode) => {
    const translation = translations[langCode];
    return translation && (
      translation.diagnosis || 
      translation.nutrition || 
      translation.notes || 
      translation.medicines
    );
  };

  return (
    <div className="doctor-screen">
      <div className="layout-container">
        {/* Left Sidebar - Patient List */}
        <div className="patient-sidebar">
          <h3>Consulting Patients</h3>
          {loadingPatients && <div className="loading">Loading patients...</div>}
          
          {!loadingPatients && patients.length === 0 && (
            <div className="no-patients">
              <p>No patients currently consulting</p>
            </div>
          )}

          {patients.map(patient => (
            <div 
              key={patient._id} 
              className={`patient-item ${selectedPatient?._id === patient._id ? 'selected' : ''}`}
              onClick={() => handlePatientSelect(patient)}
            >
              <div className="patient-name">{patient.patientName}</div>
              <div className="patient-symptoms">{patient.symptoms.substring(0, 60)}...</div>
              <div className="patient-queue">Queue: #{patient.queueNumber}</div>
              <div className="patient-language">Language: {patient.preferredLanguage}</div>
            </div>
          ))}
          
          <button 
            onClick={fetchConsultingPatients} 
            className="refresh-btn"
            disabled={loadingPatients}
          >
            🔄 Refresh List
          </button>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          <h1>Doctor Consultation {selectedPatient && `- ${selectedPatient.patientName}`}</h1>

          {selectedPatient && (
            <div className="patient-info-banner">
              <h3>Currently Consulting: {selectedPatient.patientName}</h3>
              <p><strong>Symptoms:</strong> {selectedPatient.symptoms}</p>
              <p><strong>Preferred Language:</strong> {selectedPatient.preferredLanguage}</p>
              <p><strong>Phone:</strong> {selectedPatient.patientPhone}</p>
              
              <button 
                onClick={saveConsultation} 
                disabled={savingConsultation}
                className="save-consultation-btn"
              >
                {savingConsultation ? "Saving..." : "Save Consultation & Complete"}
              </button>
              
              {saveStatus && (
                <div className={`save-status ${saveStatus.includes('✅') ? 'success' : 'error'}`}>
                  {saveStatus}
                </div>
              )}
            </div>
          )}

          <div className="top-controls">
            <div className="lang-group">
              <label>Speech Language:</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi (India)</option>
                <option value="mr-IN">Marathi (India)</option>
              </select>
            </div>

            <div className="buttons">
              <button onClick={startRecording} disabled={recording || !selectedPatient}>
                {recording ? "Recording…" : "Start Recording"}
              </button>
              <button onClick={stopRecording} disabled={!recording}>
                Done / Analyze Now
              </button>
              <button onClick={analyzeNow} className="secondary" disabled={!selectedPatient}>Analyze Now</button>
              <button onClick={newSession} className="danger">New Session</button>
            </div>
          </div>

          <h2>Live Transcription</h2>
          <div className="transcription">{transcript || <i>No transcription yet. Select a patient and start recording.</i>}</div>

          <div className="analyze-status">{analyzing ? "Analyzing… please wait." : ""}</div>

          <h2>Auto-filled Consultation Form</h2>

          <label>Diagnosis</label>
          <textarea 
            value={diagnosis} 
            onChange={(e) => setDiagnosis(e.target.value)}
            disabled={!selectedPatient}
            placeholder={!selectedPatient ? "Select a patient first" : "Enter diagnosis..."}
          />

          <label>Nutrition (detailed plan)</label>
          <textarea 
            value={nutrition} 
            onChange={(e) => setNutrition(e.target.value)} 
            rows={6}
            disabled={!selectedPatient}
            placeholder={!selectedPatient ? "Select a patient first" : "Enter nutrition plan..."}
          />

          <label>Important Notes / Follow-up</label>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            disabled={!selectedPatient}
            placeholder={!selectedPatient ? "Select a patient first" : "Enter important notes..."}
          />

          <label>Medicines</label>
          <textarea 
            value={medicines} 
            onChange={(e) => setMedicines(e.target.value)}
            disabled={!selectedPatient}
            placeholder={!selectedPatient ? "Select a patient first" : "Enter prescribed medicines..."}
          />

          {/* Enhanced Translation Controls */}
          <div className="translation-controls">
            <h3>Multi-Language Translation</h3>
            
            <div className="translation-config">
              <div className="lang-select-group">
                <label>Translate to:</label>
                <select 
                  value={selectedTargetLanguage} 
                  onChange={(e) => setSelectedTargetLanguage(e.target.value)}
                >
                  <option value="hi-IN">Hindi</option>
                  <option value="mr-IN">Marathi</option>
                  <option value="ta-IN">Tamil</option>
                  <option value="te-IN">Telugu</option>
                  <option value="kn-IN">Kannada</option>
                  <option value="bn-IN">Bengali</option>
                  <option value="gu-IN">Gujarati</option>
                </select>
              </div>

              <div className="translation-buttons">
                <button 
                  onClick={() => translateText(selectedTargetLanguage)} 
                  disabled={translating || (!diagnosis && !nutrition && !notes && !medicines) || !selectedPatient}
                  className="translate-btn primary"
                >
                  {translating ? "Translating..." : `Translate to ${supportedLanguages[selectedTargetLanguage.split('-')[0]]?.name || selectedTargetLanguage}`}
                </button>
                
                <button 
                  onClick={translateToAllLanguages}
                  disabled={translating || (!diagnosis && !nutrition && !notes && !medicines) || !selectedPatient}
                  className="translate-btn secondary"
                >
                  {translating ? "Translating..." : "Translate to All Languages"}
                </button>
              </div>
            </div>

            {/* Translation Results Tabs */}
            <div className="translation-results">
              <h4>Translations:</h4>
              
              <div className="translation-tabs">
                {Object.entries(translations).map(([langCode, translation]) => (
                  hasTranslations(langCode) && (
                    <div key={langCode} className="translation-tab">
                      <div className="translation-header">
                        <h5>{translation.name} Translation</h5>
                        <div className="translation-actions">
                          <button 
                            onClick={() => generateTranslatedPDF(langCode)}
                            className="pdf-btn"
                          >
                            PDF
                          </button>
                        </div>
                      </div>
                      
                      <div className="translation-section">
                        <div className="translation-field-header">
                          <label>Diagnosis ({translation.name}):</label>
                          <button 
                            onClick={() => sendTranslatedSMS(langCode, 'diagnosis', 'Diagnosis')}
                            disabled={sendingTranslatedSMS || !translation.diagnosis || !patientPhone}
                            className="field-sms-btn"
                          >
                            Send Diagnosis
                          </button>
                        </div>
                        <textarea 
                          value={translation.diagnosis} 
                          readOnly 
                          rows={2}
                          className="translated-text"
                        />
                      </div>

                      <div className="translation-section">
                        <div className="translation-field-header">
                          <label>Nutrition Plan ({translation.name}):</label>
                          <button 
                            onClick={() => sendTranslatedSMS(langCode, 'nutrition', 'Nutrition Plan')}
                            disabled={sendingTranslatedSMS || !translation.nutrition || !patientPhone}
                            className="field-sms-btn"
                          >
                            Send Nutrition
                          </button>
                        </div>
                        <textarea 
                          value={translation.nutrition} 
                          readOnly 
                          rows={3}
                          className="translated-text"
                        />
                      </div>

                      <div className="translation-section">
                        <div className="translation-field-header">
                          <label>Important Notes ({translation.name}):</label>
                          <button 
                            onClick={() => sendTranslatedSMS(langCode, 'notes', 'Important Notes')}
                            disabled={sendingTranslatedSMS || !translation.notes || !patientPhone}
                            className="field-sms-btn"
                          >
                            Send Notes
                          </button>
                        </div>
                        <textarea 
                          value={translation.notes} 
                          readOnly 
                          rows={2}
                          className="translated-text"
                        />
                      </div>

                      <div className="translation-section">
                        <div className="translation-field-header">
                          <label>Medicines ({translation.name}):</label>
                          <button 
                            onClick={() => sendTranslatedSMS(langCode, 'medicines', 'Medicines')}
                            disabled={sendingTranslatedSMS || !translation.medicines || !patientPhone}
                            className="field-sms-btn"
                          >
                            Send Medicines
                          </button>
                        </div>
                        <textarea 
                          value={translation.medicines} 
                          readOnly 
                          rows={2}
                          className="translated-text"
                        />
                      </div>
                    </div>
                  )
                ))}
              </div>

              {translationActionStatus && (
                <div className={`translation-status ${translationActionStatus.includes('✅') ? 'success' : 'error'}`}>
                  {translationActionStatus}
                </div>
              )}

              {!Object.values(translations).some(t => hasTranslations(t)) && (
                <div className="no-translations">
                  <i>No translations yet. Use the translation buttons above to generate translations.</i>
                </div>
              )}
            </div>
          </div>

          {/* SMS Controls */}
          <div className="sms-controls">
            <h3>Send SMS to Patient</h3>
            
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
                disabled={sendingSMS || !diagnosis || !patientPhone}
                className="sms-btn diagnosis-btn"
              >
                Send Diagnosis
              </button>
              
              <button 
                onClick={() => sendSMS('medicines')} 
                disabled={sendingSMS || !medicines || !patientPhone}
                className="sms-btn medicines-btn"
              >
                Send Medicines
              </button>
              
              <button 
                onClick={() => sendSMS('nutrition')} 
                disabled={sendingSMS || !nutrition || !patientPhone}
                className="sms-btn nutrition-btn"
              >
                Send Nutrition Plan
              </button>
              
              <button 
                onClick={() => sendSMS('notes')} 
                disabled={sendingSMS || !notes || !patientPhone}
                className="sms-btn notes-btn"
              >
                Send Notes
              </button>
              
              <button 
                onClick={() => sendSMS('all')} 
                disabled={sendingSMS || (!diagnosis && !medicines && !notes) || !patientPhone}
                className="sms-btn all-btn"
              >
                Send Complete Summary
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
              <button onClick={exportToPDF} className="export-btn pdf-btn" disabled={!selectedPatient}>
                Print as PDF (English)
              </button>
              <button onClick={exportToJSON} className="export-btn json-btn" disabled={!selectedPatient}>
                Export as JSON
              </button>
            </div>
          </div>

          <div className="footer-note">
            Tip: Select a patient from the sidebar, speak clearly. Recording auto-analyzes 10s after silence or when you press Done.
          </div>
        </div>
      </div>
    </div>
  );
}