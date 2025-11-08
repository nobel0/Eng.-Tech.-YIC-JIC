import React from 'react';
import { ThemeConfig } from '../types';

interface ErrorDisplayProps {
  message: string;
  onBack: () => void;
  themeConfig: ThemeConfig;
  extractedName?: string | null;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onBack, themeConfig, extractedName }) => {
  return (
    <div className="text-center space-y-6">
      <div 
        className="mx-auto flex items-center justify-center h-16 w-16 rounded-full"
        style={{ backgroundColor: themeConfig.errorIconBackgroundColor }}
      >
        <svg 
          className="h-10 w-10" 
          style={{ color: themeConfig.errorIconColor }} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-800">{themeConfig.errorTitle}</h2>
      
      {extractedName && (
         <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm">
          <p>
            The AI identified the institution on your certificate as: <br/>
            <strong className="font-semibold text-base">"{extractedName}"</strong>
          </p>
        </div>
      )}

      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
        <p>{message}</p>
      </div>

      <button 
        onClick={onBack}
        className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200"
        style={{backgroundColor: themeConfig.primaryColor, '--focus-ring-color': themeConfig.primaryColor} as React.CSSProperties}
      >
        Try Again
      </button>
    </div>
  );
};

export default ErrorDisplay;