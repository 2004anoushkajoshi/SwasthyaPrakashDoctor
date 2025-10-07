import React, { useState, useRef } from "react";
import "./DoctorScreen.css";

export default function DoctorScreen() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState(""); // visible live transcript (final + interim)
  const [diagnosis, setDiagnosis] = useState("");
  const [nutrition, setNutrition] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [language, setLanguage] = useState("en-IN"); // change to hi-IN or mr-IN as needed

  const recognitionRef = useRef(null);
  const cumulativeRef = useRef(""); // stores only final recognized text across session
  const autofillTimerRef = useRef(null);

  // Start (or resume) recording. Transcript accumulates in cumulativeRef.
  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser. Use Chrome/Edge.");
      return;
    }

    // If already recording, ignore
    if (recording) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let interim = "";
      // accumulate final chunks into cumulativeRef, keep interim separately
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          cumulativeRef.current += res[0].transcript + " ";
        } else {
          interim += res[0].transcript;
        }
      }
      // update visible transcript = full final text + interim
      setTranscript(cumulativeRef.current + interim);

      // reset 10s silence timer for auto analysis
      clearTimeout(autofillTimerRef.current);
      autofillTimerRef.current = setTimeout(() => {
        analyzeAndAutofill(cumulativeRef.current.trim());
      }, 10000);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      // don't clear transcript on no-speech; just inform
      if (event.error === "no-speech") {
        // optional: show small helper message rather than blocking
        console.warn("No speech detected. Try speaking louder or check mic.");
      }
    };

    // When recognition stops unexpectedly, restart it while user expects continuous recording
    recognition.onend = () => {
      if (recognitionRef.current && recognitionRef.current._keepGoing) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Auto-restart failed:", e);
        }
      }
    };

    // attach and start
    recognitionRef.current = recognition;
    recognitionRef.current._keepGoing = true; // custom flag to control auto-restart
    recognition.start();
    setRecording(true);
  };

  // Stop recording and immediately analyze
  const stopRecording = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current._keepGoing = false;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.warn("Stop error:", e);
    }
    setRecording(false);

    // clear pending timer and analyze immediately
    clearTimeout(autofillTimerRef.current);
    analyzeAndAutofill(cumulativeRef.current.trim());
  };

  // New consultation (clears transcript and fields)
  const newSession = () => {
    // stop existing recognition if any
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

  // Manually trigger analysis (without waiting 10s)
  const analyzeNow = () => {
    clearTimeout(autofillTimerRef.current);
    analyzeAndAutofill(cumulativeRef.current.trim());
  };

  // ----- Analysis & parsing functions -----
  const analyzeAndAutofill = (fullText) => {
    if (!fullText || fullText.trim().length === 0) return;
    setAnalyzing(true);

    const diag = parseDiagnosis(fullText);
    const meds = parseMedicines(fullText);
    const notesParsed = parseNotes(fullText);
    const nutritionPlan = generateNutritionPlan(fullText, diag);

    // set the fields (do not overwrite manual medicines if already typed)
    setDiagnosis((prev) => (prev && prev.trim() ? prev : diag));
    setNutrition((prev) => (prev && prev.trim() ? prev : nutritionPlan));
    setNotes((prev) => (prev && prev.trim() ? prev : notesParsed));
    setMedicines((prev) => (prev && prev.trim() ? prev : meds));

    setAnalyzing(false);
  };

  // Diagnosis heuristic
  const parseDiagnosis = (text) => {
    // 1) explicit patterns
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

    // 2) symptom-based heuristics
    const symptoms = [];
    if (/\bfever\b/i.test(text)) symptoms.push("fever");
    if (/\bcough\b/i.test(text)) symptoms.push("cough");
    if (/\bcold\b|\bsore throat\b/i.test(text)) symptoms.push("cold/sore throat");
    if (/\bheadache\b/i.test(text)) symptoms.push("headache");
    if (/\bnausea\b/i.test(text)) symptoms.push("nausea");
    if (symptoms.length) return `${symptoms.join(", ")} — likely viral/acute symptomatic condition`;

    return ""; // fallback empty
  };

  // Extract medicines from phrases like "take ...", "prescribed ..." or explicit drug mentions
  const parseMedicines = (text) => {
    const meds = new Set();

    // 1) phrases after 'prescribe', 'prescribed', 'give', 'take'
    const presRE = /(?:prescribe(?:d)?|prescribed|give|take|start)\s+([a-zA-Z0-9\-\s\,]{3,80}?)(?=[\.\n,]|$)/ig;
    let m;
    while ((m = presRE.exec(text)) !== null) {
      const candidate = m[1].trim();
      if (candidate.length > 1) meds.add(cleanMedString(candidate));
    }

    // 2) explicit drug+dosage patterns like "Paracetamol 500 mg twice a day"
    const drugRE = /([A-Za-z][A-Za-z0-9\-\s]{1,40}\s*\d{0,4}\s*mg(?:\s*(?:once|twice|thrice|daily|bd|tds|per day|a day|once a day|twice a day))?)/ig;
    while ((m = drugRE.exec(text)) !== null) {
      meds.add(cleanMedString(m[1].trim()));
    }

    // 3) common medicine names (fallback)
    const common = ["paracetamol", "ibuprofen", "amoxicillin", "vitamin c", "vitamin d", "cetirizine", "ondansetron", "metformin", "insulin"];
    for (const name of common) {
      const re = new RegExp("\\b" + name + "\\b", "i");
      if (re.test(text)) meds.add(name);
    }

    return Array.from(meds).join("; ");
  };

  const cleanMedString = (s) => s.replace(/\s{2,}/g, " ").replace(/\s+,$/, "").trim();

  // Extract notes (follow-up, remember, next visit)
  const parseNotes = (text) => {
    const notesOut = [];
    const noteRE = /(?:remember|note|important|follow(?:-| )?up|next visit|check)\s+([^.\n,]+)/ig;
    let m;
    while ((m = noteRE.exec(text)) !== null) {
      if (m[1]) notesOut.push(m[1].trim());
    }
    // fallback: find "follow up in 2 weeks" etc
    const followRE = /follow(?:-| )?up(?: in)?\s+([^\.\n,]+)/ig;
    while ((m = followRE.exec(text)) !== null) {
      if (m[1]) notesOut.push("Follow-up: " + m[1].trim());
    }
    return notesOut.join(". ");
  };

  // Generate a detailed nutrition plan based on conditions & keywords
  const generateNutritionPlan = (text, diag) => {
    const plan = [];
    plan.push("Hydration: Aim for 2–3 L water/day; oral rehydration or electrolyte drinks if febrile or dehydrated.");

    if (/\bfever\b|\bviral\b|\bcough\b|\bcold\b/i.test(text) || /fever|viral/i.test(diag)) {
      plan.push(
        "During fever/cold: Warm fluids (ginger/honey if >1 yr), soups, light khichdi, avoid cold drinks and heavy fried foods."
      );
    }
    if (/\bdiabetes\b|\bsugar\b/i.test(text) || /diabetes/i.test(diag)) {
      plan.push(
        "Diabetes: Low glycemic index foods; prioritize whole grains, legumes, lean protein; avoid sweets & refined carbs; monitor portions."
      );
      plan.push(
        "Sample: Breakfast - oats/egg + veggies; Lunch - salad + dal/roti (controlled portion); Evening snack - fruit/nuts; Dinner - vegetables + protein."
      );
    }
    if (/\bhypertension\b|\bbp\b|\bblood pressure\b/i.test(text) || /hypertension/i.test(diag)) {
      plan.push(
        "Hypertension: Reduce salt intake, avoid processed foods, increase fruits/vegetables, intake potassium-rich foods (banana, spinach)."
      );
    }
    if (/\banemia\b|\blow hemoglobin\b/i.test(text) || /anemia/i.test(diag)) {
      plan.push(
        "Anemia: Iron-rich foods (leafy greens, legumes, jaggery, dates), combine with vitamin C rich foods to enhance absorption."
      );
    }
    if (/\bweak\b|\bfatigued\b|\btired\b/i.test(text)) {
      plan.push(
        "Fatigue/weakness: Include protein-rich items (eggs, dal, paneer), nuts/seeds, and small frequent meals."
      );
    }

    // General balanced plan
    plan.push(
      "Balanced sample day:\nBreakfast: Protein + whole grain (eggs/oats)\nMid-morning: Fruit or nuts\nLunch: Veg + protein + small complex carb\nEvening: Fruit or light snack\nDinner: Light protein + vegetables\nSupplements: Vitamin D/Multivitamin if indicated by labs.\nLifestyle: Light physical activity (30 min), good sleep (7–8 hrs), stress reduction."
    );

    return plan.join("\n\n");
  };

  // UI
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

      <div className="footer-note">
        Tip: speak clearly. Recording auto-analyzes 10s after silence or when you press Done.
      </div>
    </div>
  );
}
