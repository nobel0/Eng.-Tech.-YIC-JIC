
import React from 'react';

interface LoadingSpinnerProps {
  themeColor: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ themeColor }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <div 
        className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4"
        style={{borderColor: themeColor}}
      ></div>
      <h2 className="text-xl font-semibold text-slate-700">Analyzing Certificate...</h2>
      <p className="text-slate-500">This may take a moment. Please wait.</p>
    </div>
  );
};

export default LoadingSpinner;
