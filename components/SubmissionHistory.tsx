
import React from 'react';
import { Submission } from '../types';

interface SubmissionHistoryProps {
  submissions: Submission[];
  onClearSubmissions: () => Promise<void>;
}

const SubmissionHistory: React.FC<SubmissionHistoryProps> = ({ submissions, onClearSubmissions }) => {
  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to delete all submission records? This action cannot be undone.')) {
      try {
        await onClearSubmissions();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        alert(`Failed to clear submission history: ${message}`);
      }
    }
  };

  const getVisibleFields = (formData: { [key: string]: any }) => {
    // Exclude file data and other non-display fields from the detailed view
    const excludedKeys = ['certificate', 'collegeId'];
    return Object.entries(formData).filter(([key]) => !excludedKeys.includes(key) && formData[key]);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">Submission History</h3>
        {submissions.length > 0 && (
          <button 
            onClick={handleClearHistory} 
            className="py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 border-red-300 text-red-700 bg-white hover:bg-red-50"
          >
            Clear History
          </button>
        )}
      </div>
      {submissions.length === 0 ? (
        <div className="text-center py-12 bg-white">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No submissions</h3>
            <p className="mt-1 text-sm text-slate-500">Successful submissions will be recorded here.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {submissions.map(submission => (
            <li key={submission.id} className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-start flex-wrap gap-2">
                  <p className="font-semibold text-slate-800">{submission.formData.name || 'N/A'}</p>
                  <p className="text-sm text-slate-500 flex-shrink-0">{submission.timestamp}</p>
              </div>
              <p className="text-sm text-slate-600 mt-1">Matched College: <span className="font-medium">{submission.matchedCollegeName}</span></p>
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {getVisibleFields(submission.formData).map(([key, value]) => (
                     <div key={key} className="text-xs text-slate-500 overflow-hidden">
                        <span className="capitalize font-medium">{key.replace(/([A-Z])/g, ' $1')}: </span>
                        <span className="truncate">{value}</span>
                     </div>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SubmissionHistory;
