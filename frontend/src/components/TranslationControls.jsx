import React from 'react';
import './TranslationControls.css';

const TranslationControls = ({ fieldName, onTranslate, currentLanguage, onLanguageChange }) => {
  return (
    <div className="translation-controls">
      <span className="language-badge">{currentLanguage.toUpperCase()}</span>
      <button 
        type="button"
        onClick={() => onTranslate(fieldName, 'hi')}
        className="translate-btn"
        title="Translate to Hindi"
      >
        हिंदी
      </button>
      <button 
        type="button"
        onClick={() => onTranslate(fieldName, 'mr')}
        className="translate-btn"
        title="Translate to Marathi"
      >
        मराठी
      </button>
      <button 
        type="button"
        onClick={() => onLanguageChange('en')}
        className="translate-btn english"
        title="Switch to English"
      >
        EN
      </button>
    </div>
  );
};

export default TranslationControls;