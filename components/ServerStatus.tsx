
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ServerStatusState {
  kvStoreConnected: boolean;
  adminPasswordSet: boolean;
  geminiApiKeySet: boolean;
}

interface ServerStatusProps {
    onSetupComplete: () => void;
}

const StatusRow: React.FC<{ label: string; isOk: boolean; fixInstruction: React.ReactNode; }> = ({ label, isOk, fixInstruction }) => (
    <div className={`p-4 rounded-lg flex items-start gap-4 ${isOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
        <div className="flex-shrink-0">
            {isOk ? (
                <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
                <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            )}
        </div>
        <div>
            <h4 className="font-semibold text-slate-800">{label}</h4>
            <div className={`text-sm ${isOk ? 'text-slate-600' : 'text-red-700'}`}>
                {isOk ? 'Configured correctly.' : fixInstruction}
            </div>
        </div>
    </div>
);


const ServerStatus: React.FC<ServerStatusProps> = ({ onSetupComplete }) => {
    const [status, setStatus] = useState<ServerStatusState | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [wasEverIncomplete, setWasEverIncomplete] = useState(false);

    const fetchStatus = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch('/api/status');
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to fetch server status. Server responded with: ${errorText}`);
            }
            const data: ServerStatusState = await res.json();
            setStatus(data);

            const isNowComplete = data.kvStoreConnected && data.adminPasswordSet && data.geminiApiKeySet;
            
            if (!isNowComplete) {
                setWasEverIncomplete(true);
            }

            // Only trigger reload if we started in a bad state and are now in a good one.
            if (wasEverIncomplete && isNowComplete) {
                onSetupComplete();
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    if (isLoading) {
        return <div className="flex justify-center py-8"><LoadingSpinner themeColor="#4f46e5" /></div>;
    }

    if (error) {
        return (
            <div className="text-center space-y-4">
                <h3 className="text-xl font-bold text-slate-800">Error Checking Status</h3>
                <p className="text-red-600 bg-red-50 p-4 rounded-md">{error}</p>
                <button onClick={fetchStatus} className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                    Retry
                </button>
            </div>
        );
    }

    if (!status) {
        return <div className="text-center text-slate-500">Could not load server status.</div>;
    }

    const allOk = status.kvStoreConnected && status.adminPasswordSet && status.geminiApiKeySet;

    return (
        <div className="space-y-6">
             <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800">Application Setup & Status</h3>
                 {!allOk && <p className="text-slate-500 mt-1">Follow the steps below to complete your application setup.</p>}
            </div>
            
            {allOk ? (
                 <div className="p-4 rounded-lg bg-green-50 border-green-200 border text-center">
                    <h4 className="font-semibold text-green-800">All systems operational.</h4>
                    <p className="text-sm text-green-700">Your application is configured correctly and is fully functional.</p>
                 </div>
            ) : (
                <div className="p-4 rounded-lg bg-yellow-50 border-yellow-200 border text-center">
                    <h4 className="font-semibold text-yellow-800">Action Required</h4>
                    <p className="text-sm text-yellow-700">One or more configurations are missing. Please follow the instructions below.</p>
                 </div>
            )}


            <div className="space-y-4">
                <StatusRow 
                    label="Vercel KV Database"
                    isOk={status.kvStoreConnected}
                    fixInstruction={
                      <>
                        <p>Go to the <strong className="font-semibold">"Storage"</strong> tab in your Vercel project dashboard to connect a KV store.</p>
                        <strong className="block mt-1">IMPORTANT: After connecting, you must trigger a new deployment for the change to take effect.</strong>
                      </>
                    }
                />
                <StatusRow 
                    label="Gemini API Key"
                    isOk={status.geminiApiKeySet}
                    fixInstruction={<>Go to <strong className="font-semibold">"Settings"</strong> &gt; <strong className="font-semibold">"Environment Variables"</strong> in Vercel and add a variable named <code className="text-xs bg-red-100 p-1 rounded">API_KEY</code> with your Gemini key.</>}
                />
                <StatusRow 
                    label="Admin Password"
                    isOk={status.adminPasswordSet}
                    fixInstruction={<>Go to <strong className="font-semibold">"Settings"</strong> &gt; <strong className="font-semibold">"Environment Variables"</strong> in Vercel and add a variable named <code className="text-xs bg-red-100 p-1 rounded">ADMIN_PASSWORD</code>. This will be the password for the admin panel.</>}
                />
            </div>

            {!allOk && (
                 <div className="text-center pt-4">
                    <p className="text-slate-500 text-sm mb-4">After you've updated the settings in Vercel, click the button below to check again.</p>
                    <button onClick={fetchStatus} className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        I've updated my settings, check again
                    </button>
                </div>
            )}
           

            <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="font-semibold text-slate-800">For Local Development</h4>
                <p className="text-sm text-slate-600 mt-2">
                    To use your new Vercel environment variables on your local machine, run this command in your terminal:
                </p>
                <pre className="mt-3 bg-slate-800 text-white p-3 rounded-md text-sm overflow-x-auto">
                    <code>vercel env pull .env.development.local</code>
                </pre>
                <p className="text-sm text-slate-600 mt-2">
                    After running the command, you must <strong className="font-semibold">restart your local development server</strong>.
                </p>
            </div>
        </div>
    );
};

export default ServerStatus;
