import React from 'react';
import { College, ThemeConfig } from '../types';

interface SuccessPageProps {
  college: College;
  onBack: () => void;
  themeConfig: ThemeConfig;
}

const SuccessPage: React.FC<SuccessPageProps> = ({ college, onBack, themeConfig }) => {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
        <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-800">Verification Successful!</h2>
      <p className="text-slate-600">
        Welcome! We've confirmed you are a graduate of <span className="font-semibold" style={{color: themeConfig.primaryColor}}>{college.name}</span>.
      </p>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-slate-700 mb-4">Click the button below to join your alumni group:</p>
        <a 
          href={college.groupLink}
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-block w-full max-w-sm py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200"
          style={{backgroundColor: themeConfig.primaryColor, borderColor: themeConfig.primaryColor, '--focus-ring-color': themeConfig.primaryColor} as React.CSSProperties}
        >
          Join {college.name} Group
        </a>
      </div>
      <button 
        onClick={onBack}
        className="text-sm font-medium transition-colors"
        style={{color: themeConfig.primaryColor}}
      >
        Register another person
      </button>
    </div>
  );
};

export default SuccessPage;