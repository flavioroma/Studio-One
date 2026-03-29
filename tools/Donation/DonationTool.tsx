import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const DonationTool: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="h-full overflow-y-auto bg-slate-900 scroll-smooth animate-fadeIn">
      <div className="min-h-full flex flex-col items-center py-12 px-6">
        <div className="my-auto w-full max-w-2xl text-center space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">{t.home.donation.title}</h2>
            <p className="text-slate-400 text-lg">{t.home.donation.description}</p>
          </div>

          <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 flex flex-col items-center">
            <img
              src="/assets/donations/qrcode.png"
              alt="Donation QR Code"
              className="w-64 h-64 object-contain rounded-xl bg-white p-2 mx-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
