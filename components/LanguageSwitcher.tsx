import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="relative flex items-center bg-slate-900/60 backdrop-blur-md rounded-full cursor-pointer w-20 h-7 select-none shadow-xl group overflow-hidden">
      {/* Flags Background Layer */}
      <div className="absolute inset-0 flex">
        <div
          onClick={() => setLanguage('en')}
          className={`flex-1 bg-cover bg-center transition-all duration-500 ${language === 'en' ? 'opacity-100 scale-100' : 'opacity-20 grayscale scale-100 hover:opacity-40'}`}
          style={{ backgroundImage: 'url("/assets/flags/uk.png")' }}
          title="English"
        />
        <div
          onClick={() => setLanguage('it')}
          className={`flex-1 bg-cover bg-center transition-all duration-500 ${language === 'it' ? 'opacity-100 scale-100' : 'opacity-20 grayscale scale-100 hover:opacity-40'}`}
          style={{ backgroundImage: 'url("/assets/flags/it.png")' }}
          title="Italiano"
        />
      </div>
    </div>
  );
};
