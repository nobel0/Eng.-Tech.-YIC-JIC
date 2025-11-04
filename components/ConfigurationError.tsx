
import React from 'react';

const ConfigurationError: React.FC = () => {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
        <svg className="h-10 w-10 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-800">Application Not Configured</h2>
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-left">
        <p className="font-semibold">This application requires server-side configuration to function.</p>
        <p className="mt-2 text-sm">The connection to the database (Vercel KV Store) is missing. Please follow the steps below to resolve this.</p>
      </div>
      
      <div className="space-y-6 text-left">
        <div>
          <h3 className="font-semibold text-slate-700">1. For the Live Website (Production)</h3>
          <p className="text-sm text-slate-600 mt-1">If you are the owner of this site, you need to link a database in your Vercel project settings:</p>
          <ol className="list-decimal list-inside text-sm text-slate-600 mt-2 space-y-1">
            <li>Go to your project dashboard on Vercel.</li>
            <li>Click the <strong className="font-semibold">"Storage"</strong> tab at the top.</li>
            <li>Find <strong className="font-semibold">KV (Serverless Redis)</strong> and click <strong className="font-semibold">"Connect Store"</strong>.</li>
            <li>Follow the prompts to create and link a new database.</li>
            <li>After connecting, you <strong className="font-semibold">must redeploy</strong> your project for the changes to take effect.</li>
          </ol>
        </div>
        
        <div>
          <h3 className="font-semibold text-slate-700">2. For Local Development</h3>
          <p className="text-sm text-slate-600 mt-1">If you are running this project on your computer, you need to sync the environment variables from Vercel:</p>
            <ol className="list-decimal list-inside text-sm text-slate-600 mt-2 space-y-1">
                 <li>First, complete the steps for the live website above.</li>
                 <li>Open a terminal in your project's folder.</li>
                 <li>Run the following command to download the secrets:</li>
            </ol>
          <pre className="mt-2 bg-slate-800 text-white p-3 rounded-md text-sm overflow-x-auto">
            <code>vercel env pull .env.development.local</code>
          </pre>
          <p className="text-sm text-slate-600 mt-2"><strong className="font-semibold">Important:</strong> After running the command, you must <strong className="font-semibold">restart your local development server</strong>.</p>
        </div>
      </div>

    </div>
  );
};

export default ConfigurationError;
