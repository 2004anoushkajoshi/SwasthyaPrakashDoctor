import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import pkg from 'twilio';
const { Twilio } = pkg;

import axios from 'axios';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create require function for ES modules if needed
const require = createRequire(import.meta.url);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://pranayeemajorproject_db_user:signlanguage123@cluster0.lwchqcp.mongodb.net/signlanguageapp?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Patient Schema
const patientSchema = new mongoose.Schema({
  patientName: String,
  patientAddress: String,
  patientPhone: String,
  relativeName: String,
  relativePhone: String,
  symptoms: String,
  department: String,
  preferredLanguage: String,
  registeredBy: mongoose.Schema.Types.ObjectId,
  status: String,
  registrationDate: Date,
  queueNumber: Number,
  diagnosis: { type: String, default: '' },
  medicines: { type: String, default: '' },
  nutrition: { type: String, default: '' },
  notes: { type: String, default: '' },
  consultationDate: { type: Date, default: null },
  consultedBy: { type: String, default: '' }
}, { 
  collection: 'patients',
  timestamps: true 
});

const Patient = mongoose.model('Patient', patientSchema);

// Twilio configuration
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SERVICE_SID = process.env.MESSAGING_SERVICE_SID || "MG5f279602eea059dd0207a0ddc7e18290";
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

const twilioClient = new Twilio(ACCOUNT_SID, AUTH_TOKEN);

// Supported languages for translation
const SUPPORTED_LANGUAGES = {
  'mr': {'code': 'mr-IN', 'name': 'Marathi'},
  'hi': {'code': 'hi-IN', 'name': 'Hindi'},
  'ta': {'code': 'ta-IN', 'name': 'Tamil'},
  'te': {'code': 'te-IN', 'name': 'Telugu'},
  'kn': {'code': 'kn-IN', 'name': 'Kannada'},
  'bn': {'code': 'bn-IN', 'name': 'Bengali'},
  'gu': {'code': 'gu-IN', 'name': 'Gujarati'},
  'ml': {'code': 'ml-IN', 'name': 'Malayalam'},
  'pa': {'code': 'pa-IN', 'name': 'Punjabi'},
  'en': {'code': 'en-IN', 'name': 'English'}
};

// SMS formatting functions
function formatSmsMessage(message_type, diagnosis, medicines, nutrition, notes) {
  if (message_type === 'diagnosis') {
    return `Medical Diagnosis: ${diagnosis}\nPlease consult your doctor for any concerns.`;
  }
  // Add other message type formatting as needed
  return "Medical consultation information.";
}

function formatTranslatedSmsMessage(message_type, diagnosis, medicines, nutrition, notes, language_name) {
  if (message_type === 'diagnosis') {
    return `Medical Diagnosis (${language_name}): ${diagnosis}\n\nPlease consult your doctor for any concerns.`;
  }
  // Add other message type formatting as needed
  return `Medical consultation information (${language_name}).`;
}

// ==================== PATIENT ROUTES ====================

// GET all patients with status "consulting"
app.get('/api/patients/consulting', async (req, res) => {
  try {
    const patients = await Patient.find({ status: 'consulting' })
      .sort({ queueNumber: 1 })
      .select('patientName symptoms queueNumber preferredLanguage patientPhone');
    
    res.json({
      status: 'success',
      patients: patients,
      count: patients.length
    });
  } catch (error) {
    console.error('Error fetching consulting patients:', error);
    res.status(500).json({ 
      status: 'error', 
      error: 'Failed to fetch patients' 
    });
  }
});

// GET patient by ID
app.get('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ 
        status: 'error', 
        error: 'Patient not found' 
      });
    }
    
    res.json({
      status: 'success',
      patient: patient
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ 
      status: 'error', 
      error: 'Failed to fetch patient' 
    });
  }
});

// UPDATE patient consultation data
app.put('/api/patients/:id/consultation', async (req, res) => {
  try {
    const { diagnosis, medicines, nutrition, notes, status } = req.body;
    
    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          diagnosis,
          medicines,
          nutrition,
          notes,
          status: status || 'completed',
          consultationDate: new Date()
        }
      },
      { new: true }
    );
    
    if (!updatedPatient) {
      return res.status(404).json({ 
        status: 'error', 
        error: 'Patient not found' 
      });
    }
    
    res.json({
      status: 'success',
      message: 'Patient consultation data saved successfully',
      patient: updatedPatient
    });
  } catch (error) {
    console.error('Error updating patient consultation:', error);
    res.status(500).json({ 
      status: 'error', 
      error: 'Failed to save consultation data' 
    });
  }
});

// UPDATE patient status only
app.patch('/api/patients/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status }
      },
      { new: true }
    );
    
    if (!updatedPatient) {
      return res.status(404).json({ 
        status: 'error', 
        error: 'Patient not found' 
      });
    }
    
    res.json({
      status: 'success',
      message: `Patient status updated to ${status}`,
      patient: updatedPatient
    });
  } catch (error) {
    console.error('Error updating patient status:', error);
    res.status(500).json({ 
      status: 'error', 
      error: 'Failed to update patient status' 
    });
  }
});

// ==================== SMS ROUTES ====================

app.post('/api/send_sms', async (req, res) => {
  try {
    const data = req.body;
    
    const to_number = data.to;
    if (!to_number) {
      return res.status(400).json({ status: "error", error: "Recipient phone number ('to') is required." });
    }

    const diagnosis = data.diagnosis || 'Not specified';
    const nutrition = data.nutrition || 'Not specified';
    const notes = data.notes || 'Not specified';
    const medicines = data.medicines || 'Not specified';
    const message_type = data.message_type || 'all';

    const message_body = formatSmsMessage(message_type, diagnosis, medicines, nutrition, notes);

    const message = await twilioClient.messages.create({
      body: message_body,
      messagingServiceSid: MESSAGING_SERVICE_SID,
      to: to_number
    });
    
    console.log(`SMS sent successfully to ${to_number}. Message SID: ${message.sid}`);
    
    res.json({
      status: "success",
      message_sid: message.sid,
      to: to_number,
      message_type: message_type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('SMS sending error:', error);
    res.status(400).json({ status: "error", error: `Twilio error: ${error.message}` });
  }
});

app.post('/api/send-translated-sms', async (req, res) => {
  try {
    const data = req.body;
    
    const to_number = data.to;
    if (!to_number) {
      return res.status(400).json({ status: "error", error: "Recipient phone number ('to') is required." });
    }

    const diagnosis = data.diagnosis || '';
    const nutrition = data.nutrition || '';
    const notes = data.notes || '';
    const medicines = data.medicines || '';
    const language_name = data.language_name || 'Unknown Language';
    const message_type = data.message_type || 'all';

    const message_body = formatTranslatedSmsMessage(message_type, diagnosis, medicines, nutrition, notes, language_name);

    const message = await twilioClient.messages.create({
      body: message_body,
      messagingServiceSid: MESSAGING_SERVICE_SID,
      to: to_number
    });
    
    console.log(`Translated SMS sent to ${to_number} in ${language_name}. SID: ${message.sid}`);
    
    res.json({
      status: "success",
      message_sid: message.sid,
      to: to_number,
      language: language_name,
      message_type: message_type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Translated SMS sending error:', error);
    res.status(400).json({ status: "error", error: `Twilio error: ${error.message}` });
  }
});

// ==================== TRANSLATION ROUTES ====================

app.post('/api/translate', async (req, res) => {
  try {
    const data = req.body;
    
    if (!data) {
      return res.status(400).json({ status: "error", error: "No JSON data provided" });
    }
    
    const text = data.text || '';
    const source_lang = data.sourceLang || 'en-IN';
    const target_lang = data.targetLang || 'mr-IN';
    
    if (!text) {
      return res.status(400).json({ status: "error", error: "No text provided for translation" });
    }
    
    if (!SARVAM_API_KEY) {
      return res.status(500).json({ status: "error", error: "SARVAM_API_KEY not configured" });
    }

    const url = "https://api.sarvam.ai/translate";
    const payload = {
      "input": text,
      "source_language_code": source_lang,
      "target_language_code": target_lang,
      "model": "sarvam-translate:v1"
    };
    const headers = {
      "api-subscription-key": SARVAM_API_KEY,
      "Content-Type": "application/json"
    };

    const sarvam_response = await axios.post(url, payload, { headers, timeout: 30000 });

    if (sarvam_response.status === 200) {
      const translation_data = sarvam_response.data;
      res.json({
        status: "success",
        translated_text: translation_data.translated_text || '',
        source_language: source_lang,
        target_language: target_lang,
        language_name: SUPPORTED_LANGUAGES[target_lang.split('-')[0]]?.name || target_lang,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(sarvam_response.status).json({
        status: "error", 
        error: "Translation service unavailable",
        details: sarvam_response.data ? JSON.stringify(sarvam_response.data).substring(0, 200) : "No error details"
      });
    }

  } catch (error) {
    console.error('Translation error:', error);
    if (error.code === 'ECONNABORTED') {
      res.status(408).json({ status: "error", error: "Translation request timeout" });
    } else if (error.response) {
      res.status(error.response.status).json({
        status: "error",
        error: "Translation service error",
        details: error.response.data
      });
    } else {
      res.status(500).json({ status: "error", error: `Translation failed: ${error.message}` });
    }
  }
});

// ==================== UTILITY ROUTES ====================

app.get('/api/languages', (req, res) => {
  res.json({
    status: "success",
    languages: SUPPORTED_LANGUAGES,
    default_source: "en-IN",
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  const health_status = {
    status: "healthy",
    service: "Medical Consultation API with MongoDB",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    features: {
      sms: "enabled",
      translation: "enabled",
      patient_management: "enabled",
      mongodb: "connected"
    },
    dependencies: {
      twilio: ACCOUNT_SID && AUTH_TOKEN ? "connected" : "misconfigured",
      sarvam_ai: SARVAM_API_KEY ? "configured" : "not_configured",
      mongodb: "connected"
    }
  };
  
  res.json(health_status);
});

// Error handlers
app.use((req, res) => {
  res.status(404).json({ status: "error", error: "Endpoint not found" });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ status: "error", error: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 MongoDB connected: ${MONGODB_URI}`);
  console.log(`🏥 Patient API: http://localhost:${PORT}/api/patients/consulting`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

export default app;