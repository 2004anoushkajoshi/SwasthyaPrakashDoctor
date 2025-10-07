from flask import Flask, request, jsonify
from flask_cors import CORS
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import os
import requests
from dotenv import load_dotenv
from datetime import datetime
import logging
import json

# Load environment variables from the .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # This handles CORS for all routes

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fetch Twilio credentials from environment variables
ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
MESSAGING_SERVICE_SID = os.environ.get("MESSAGING_SERVICE_SID", "MG5f279602eea059dd0207a0ddc7e18290")
SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY")

# Validate that the credentials exist
if not all([ACCOUNT_SID, AUTH_TOKEN]):
    raise ValueError("Twilio credentials are not set in the environment variables.")

# Initialize the Twilio Client
try:
    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    logger.info("Twilio client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Twilio client: {str(e)}")
    raise

# Supported languages for translation
SUPPORTED_LANGUAGES = {
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
}

def format_sms_message(message_type, diagnosis, medicines, nutrition, notes):
    """Format SMS message based on the type of content being sent"""
    
    if message_type == 'diagnosis':
        return f"""Medical Diagnosis: {diagnosis}
Please consult your doctor for any concerns."""

    elif message_type == 'medicines':
        return f"""Prescribed Medicines: {medicines}
Take as directed by doctor."""

    elif message_type == 'nutrition':
        # Take first 150 characters for SMS brevity
        short_nutrition = nutrition[:150] + "..." if len(nutrition) > 150 else nutrition
        return f"""Nutrition Plan: {short_nutrition}
Follow this dietary advice for better recovery."""

    elif message_type == 'notes':
        return f"""Important Notes: {notes}
Please follow these instructions carefully."""

    elif message_type == 'all':
        message = "Medical Consultation Summary:"
        if diagnosis and diagnosis != 'Not specified':
            message += f"Diagnosis: {diagnosis}"
        if medicines and medicines != 'Not specified':
            message += f"Medicines: {medicines}"
        if nutrition and nutrition != 'Not specified':
            # Shorten nutrition for SMS
            short_nutrition = nutrition[:100] + "..." if len(nutrition) > 100 else nutrition
            message += f"Nutrition: {short_nutrition}"
        if notes and notes != 'Not specified':
            message += f"Notes: {notes}"
        message += "Follow medical advice and consult your doctor for concerns."
        return message

    else:
        return "Medical consultation information."

def format_translated_sms_message(message_type, diagnosis, medicines, nutrition, notes, language_name):
    """Format SMS message for translated content"""
    
    if message_type == 'diagnosis':
        return f"""Medical Diagnosis ({language_name}): {diagnosis}

Please consult your doctor for any concerns."""

    elif message_type == 'medicines':
        return f"""Prescribed Medicines ({language_name}): {medicines}
Take as directed by your doctor."""

    elif message_type == 'nutrition':
        # Take first 150 characters for SMS brevity
        short_nutrition = nutrition[:150] + "..." if len(nutrition) > 150 else nutrition
        return f"""Nutrition Plan ({language_name}): {short_nutrition}

Follow this dietary advice for better recovery."""

    elif message_type == 'notes':
        return f"""Important Notes ({language_name}):{notes}

Please follow these instructions carefully."""
    elif message_type == 'all':
        message = f"Medical Consultation Summary ({language_name}):"
        if diagnosis and diagnosis != 'Not specified':
            message += f"Diagnosis: {diagnosis}"
        if medicines and medicines != 'Not specified':
            message += f"Medicines: {medicines}"
        if nutrition and nutrition != 'Not specified':
            # Shorten nutrition for SMS
            short_nutrition = nutrition[:100] + "..." if len(nutrition) > 100 else nutrition
            message += f"Nutrition: {short_nutrition}\n\n"
        if notes and notes != 'Not specified':
            message += f"Notes: {notes}"
        message += "Follow medical advice and consult your doctor for concerns."
        return message

    else:
        return f"Medical consultation information ({language_name})."

@app.route('/api/send_sms', methods=['POST'])
def send_sms():
    try:
        data = request.get_json()
        
        # Input validation
        to_number = data.get('to')
        if not to_number:
            return jsonify({"status": "error", "error": "Recipient phone number ('to') is required."}), 400

        # Extract other fields from the request
        diagnosis = data.get('diagnosis', 'Not specified')
        nutrition = data.get('nutrition', 'Not specified')
        notes = data.get('notes', 'Not specified')
        medicines = data.get('medicines', 'Not specified')
        message_type = data.get('message_type', 'all')

        # Format the SMS message based on type
        message_body = format_sms_message(message_type, diagnosis, medicines, nutrition, notes)

        # Validate message length for SMS limits
        if len(message_body) > 1600:
            logger.warning(f"Long SMS message detected: {len(message_body)} characters")
            # Truncate if necessary
            message_body = message_body[:1597] + "..."

        # Send SMS via Twilio using the Messaging Service
        message = client.messages.create(
            body=message_body,
            messaging_service_sid=MESSAGING_SERVICE_SID,
            to=to_number
        )
        
        # Log successful sending
        logger.info(f"SMS sent successfully to {to_number}. Message SID: {message.sid}")
        logger.info(f"Message type: {message_type}, Length: {len(message_body)} chars")
        
        # If successful, return a success response
        return jsonify({
            "status": "success",
            "message_sid": message.sid,
            "to": to_number,
            "message_type": message_type,
            "timestamp": datetime.utcnow().isoformat()
        })

    except TwilioRestException as e:
        # Handle Twilio-specific errors (e.g., invalid number, unverified number)
        error_msg = f"Twilio error: {str(e)}"
        logger.error(f"Twilio Error: {e}")
        return jsonify({"status": "error", "error": error_msg}), 400
    except Exception as e:
        # Handle any other unexpected errors
        error_msg = f"Internal server error: {str(e)}"
        logger.error(f"Server Error: {e}")
        return jsonify({"status": "error", "error": error_msg}), 500

@app.route('/api/send-translated-sms', methods=['POST'])
def send_translated_sms():
    """Send SMS with translated medical content"""
    try:
        data = request.get_json()
        
        # Input validation
        to_number = data.get('to')
        if not to_number:
            return jsonify({"status": "error", "error": "Recipient phone number ('to') is required."}), 400

        # Extract translated content
        diagnosis = data.get('diagnosis', '')
        nutrition = data.get('nutrition', '')
        notes = data.get('notes', '')
        medicines = data.get('medicines', '')
        language_name = data.get('language_name', 'Unknown Language')
        message_type = data.get('message_type', 'all')

        # Format the SMS message for translated content
        message_body = format_translated_sms_message(message_type, diagnosis, medicines, nutrition, notes, language_name)

        # Validate message length for SMS limits
        if len(message_body) > 1600:
            logger.warning(f"Long translated SMS message detected: {len(message_body)} characters")
            # Truncate if necessary
            message_body = message_body[:1597] + "..."

        # Send SMS via Twilio using the Messaging Service
        message = client.messages.create(
            body=message_body,
            messaging_service_sid=MESSAGING_SERVICE_SID,
            to=to_number
        )
        
        # Log successful sending
        logger.info(f"Translated SMS sent successfully to {to_number} in {language_name}. Message SID: {message.sid}")
        
        # If successful, return a success response
        return jsonify({
            "status": "success",
            "message_sid": message.sid,
            "to": to_number,
            "language": language_name,
            "message_type": message_type,
            "timestamp": datetime.utcnow().isoformat()
        })

    except TwilioRestException as e:
        error_msg = f"Twilio error: {str(e)}"
        logger.error(f"Twilio Error: {e}")
        return jsonify({"status": "error", "error": error_msg}), 400
    except Exception as e:
        error_msg = f"Internal server error: {str(e)}"
        logger.error(f"Server Error: {e}")
        return jsonify({"status": "error", "error": error_msg}), 500

@app.route('/api/generate-translated-pdf', methods=['POST'])
def generate_translated_pdf():
    """Generate PDF data for translated medical content (frontend will handle actual PDF generation)"""
    try:
        data = request.get_json()
        
        # Extract translated content
        diagnosis = data.get('diagnosis', '')
        nutrition = data.get('nutrition', '')
        notes = data.get('notes', '')
        medicines = data.get('medicines', '')
        language_name = data.get('language_name', 'Unknown Language')
        patient_info = data.get('patient_info', {})
        
        # Prepare PDF content structure
        pdf_content = {
            "title": f"Medical Consultation Report ({language_name})",
            "language": language_name,
            "sections": {
                "diagnosis": diagnosis,
                "nutrition": nutrition,
                "notes": notes,
                "medicines": medicines
            },
            "patient_info": patient_info,
            "timestamp": datetime.utcnow().isoformat(),
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        logger.info(f"PDF content prepared for {language_name} translation")
        
        return jsonify({
            "status": "success",
            "pdf_content": pdf_content,
            "message": "PDF content prepared for frontend generation",
            "timestamp": datetime.utcnow().isoformat()
        })

    except Exception as e:
        error_msg = f"PDF generation error: {str(e)}"
        logger.error(f"PDF Generation Error: {e}")
        return jsonify({"status": "error", "error": error_msg}), 500

@app.route('/api/translate', methods=['POST'])
def translate_text():
    """Translate medical consultation data to multiple Indian languages using Sarvam AI"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({"status": "error", "error": "No JSON data provided"}), 400
        
        # Get translation parameters
        text = data.get('text', '')
        source_lang = data.get('sourceLang', 'en-IN')
        target_lang = data.get('targetLang', 'mr-IN')
        
        if not text:
            return jsonify({"status": "error", "error": "No text provided for translation"}), 400
        
        # Validate target language
        if target_lang not in [lang['code'] for lang in SUPPORTED_LANGUAGES.values()]:
            return jsonify({
                "status": "error", 
                "error": f"Unsupported target language. Supported: {list(SUPPORTED_LANGUAGES.keys())}"
            }), 400
        
        # Validate Sarvam API key
        if not SARVAM_API_KEY:
            logger.error("SARVAM_API_KEY not configured in environment variables")
            return jsonify({"status": "error", "error": "SARVAM_API_KEY not configured"}), 500

        logger.info(f"Translation request: {source_lang} -> {target_lang}, Length: {len(text)}")

        # Sarvam AI Translation API request
        url = "https://api.sarvam.ai/translate"
        payload = {
            "input": text,
            "source_language_code": source_lang,
            "target_language_code": target_lang,
            "model": "sarvam-translate:v1"
        }
        headers = {
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json"
        }

        # Call Sarvam AI Translation API
        sarvam_response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=30
        )

        # Handle Sarvam API response
        if sarvam_response.status_code == 200:
            translation_data = sarvam_response.json()
            logger.info(f"Translation completed successfully for {target_lang}")
            return jsonify({
                "status": "success",
                "translated_text": translation_data.get('translated_text', ''),
                "source_language": source_lang,
                "target_language": target_lang,
                "language_name": SUPPORTED_LANGUAGES.get(target_lang.split('-')[0], {}).get('name', target_lang),
                "timestamp": datetime.utcnow().isoformat()
            })
        else:
            error_detail = f"Sarvam API error: {sarvam_response.status_code} - {sarvam_response.text}"
            logger.error(f"Translation API Error: {error_detail}")
            return jsonify({
                "status": "error", 
                "error": "Translation service unavailable",
                "details": sarvam_response.text[:200] if sarvam_response.text else "No error details"
            }), sarvam_response.status_code

    except requests.exceptions.Timeout:
        logger.error("Translation request timeout")
        return jsonify({"status": "error", "error": "Translation request timeout"}), 408
    except requests.exceptions.ConnectionError:
        logger.error("Cannot connect to translation service")
        return jsonify({"status": "error", "error": "Cannot connect to translation service"}), 503
    except Exception as e:
        error_msg = f"Translation failed: {str(e)}"
        logger.error(f"Translation Error: {e}")
        return jsonify({"status": "error", "error": error_msg}), 500

@app.route('/api/languages', methods=['GET'])
def get_supported_languages():
    """Return list of supported languages for translation"""
    return jsonify({
        "status": "success",
        "languages": SUPPORTED_LANGUAGES,
        "default_source": "en-IN",
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/api/batch-translate', methods=['POST'])
def batch_translate():
    """Translate to multiple languages at once"""
    try:
        data = request.get_json()
        
        text = data.get('text', '')
        target_languages = data.get('targetLanguages', [])
        
        if not text:
            return jsonify({"status": "error", "error": "No text provided for translation"}), 400
        
        if not target_languages:
            return jsonify({"status": "error", "error": "No target languages specified"}), 400
        
        # Validate languages
        for lang in target_languages:
            if lang not in [lang['code'] for lang in SUPPORTED_LANGUAGES.values()]:
                return jsonify({
                    "status": "error", 
                    "error": f"Unsupported language: {lang}"
                }), 400
        
        results = {}
        
        # Translate to each target language
        for target_lang in target_languages:
            try:
                url = "https://api.sarvam.ai/translate"
                payload = {
                    "input": text,
                    "source_language_code": "en-IN",
                    "target_language_code": target_lang,
                    "model": "sarvam-translate:v1"
                }
                headers = {
                    "api-subscription-key": SARVAM_API_KEY,
                    "Content-Type": "application/json"
                }

                sarvam_response = requests.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=30
                )

                if sarvam_response.status_code == 200:
                    translation_data = sarvam_response.json()
                    results[target_lang] = {
                        "translated_text": translation_data.get('translated_text', ''),
                        "language_name": SUPPORTED_LANGUAGES.get(target_lang.split('-')[0], {}).get('name', target_lang),
                        "status": "success"
                    }
                else:
                    results[target_lang] = {
                        "translated_text": "",
                        "language_name": SUPPORTED_LANGUAGES.get(target_lang.split('-')[0], {}).get('name', target_lang),
                        "status": "error",
                        "error": f"API returned {sarvam_response.status_code}"
                    }
                    
            except Exception as e:
                results[target_lang] = {
                    "translated_text": "",
                    "language_name": SUPPORTED_LANGUAGES.get(target_lang.split('-')[0], {}).get('name', target_lang),
                    "status": "error",
                    "error": str(e)
                }
        
        return jsonify({
            "status": "success",
            "translations": results,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        error_msg = f"Batch translation failed: {str(e)}"
        logger.error(f"Batch Translation Error: {e}")
        return jsonify({"status": "error", "error": error_msg}), 500

@app.route('/api/test-translate', methods=['POST'])
def test_translate():
    """Test endpoint for translation service with multiple languages"""
    test_text = "Hello, how are you today? This is a test of the translation service."
    target_languages = ['hi-IN', 'mr-IN', 'ta-IN', 'te-IN']
    
    try:
        results = {}
        for target_lang in target_languages:
            url = "https://api.sarvam.ai/translate"
            payload = {
                "input": test_text,
                "source_language_code": "en-IN",
                "target_language_code": target_lang,
                "model": "sarvam-translate:v1"
            }
            headers = {
                "api-subscription-key": SARVAM_API_KEY,
                "Content-Type": "application/json"
            }

            sarvam_response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=10
            )
            
            results[target_lang] = {
                "status": sarvam_response.status_code,
                "language": SUPPORTED_LANGUAGES.get(target_lang.split('-')[0], {}).get('name', target_lang),
                "preview": sarvam_response.text[:50] if sarvam_response.text else "No response"
            }
        
        return jsonify({
            "status": "success",
            "test_text": test_text,
            "results": results
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Enhanced health check endpoint to verify the server is running"""
    health_status = {
        "status": "healthy",
        "service": "Medical Consultation API",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.2.0",
        "features": {
            "sms": "enabled",
            "translation": "enabled",
            "translated_sms": "enabled",
            "pdf_generation": "enabled",
            "supported_languages": len(SUPPORTED_LANGUAGES)
        },
        "dependencies": {
            "twilio": "connected" if ACCOUNT_SID and AUTH_TOKEN else "misconfigured",
            "sarvam_ai": "configured" if SARVAM_API_KEY else "not_configured"
        }
    }
    
    # Check if essential services are configured
    if not all([ACCOUNT_SID, AUTH_TOKEN, SARVAM_API_KEY]):
        health_status["status"] = "degraded"
        health_status["message"] = "Some dependencies are not properly configured"
    
    return jsonify(health_status), 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"status": "error", "error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"status": "error", "error": "Internal server error"}), 500

if __name__ == '__main__':
    # Use environment variable for debug mode, default to False in production
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # For production, use debug=False
    app.run(debug=debug_mode, port=5000, host='0.0.0.0')