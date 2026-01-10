import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ServerStatusState {
  kvStoreConnected: boolean;
  adminPasswordSet: boolean;
  geminiApiKeySet: boolean;
  kvEnvVarsSet: boolean;
  kvConnectionError?: string | null;
}

interface ServerStatusProps {
    onSetupComplete: () => void;
}

const StatusRow: React.FC<{ label: string; isOk: boolean; fixInstruction: React.ReactNode; }> = ({ label, isOk, fixInstruction }) => (
    <div className={`p-4 rounded-lg flex items-start gap-4 ${isOk ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'} border transition-all duration-300`}>
        <div className="flex-shrink-0 mt-1">
            {isOk ? (
                <div className="bg-green-100 p-1 rounded-full">
                    <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </div>
            ) : (
                <div className="bg-red-100 p-1 rounded-full">
                    <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                </div>
            )}
        </div>
        <div className="flex-1">
            <h4 className={`font-bold ${isOk ? 'text-green-800' : 'text-red-800'}`}>{label}</h4>
            <div className={`text-sm mt-1 ${isOk ? 'text-green-700' : 'text-red-700'}`}>
                {isOk ? 'Successfully configured and connected.' : fixInstruction}
            </div>
        </div>
    </div>
);


const ServerStatus: React.FC<ServerStatusProps> = ({ onSetupComplete }) => {
    const [status, setStatus] = useState<ServerStatusState | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [wasEverIncomplete, setWasEverIncomplete] = useState(false);

    const isDevelopment = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const fetchStatus = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch('/api/status');
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`API unreachable. Vercel error: ${errorText.substring(0, 100)}`);
            }
            const data: ServerStatusState = await res.json();
            setStatus(data);

            const isNowComplete = data.kvStoreConnected && data.adminPasswordSet && data.geminiApiKeySet;
            
            if (!isNowComplete) {
                setWasEverIncomplete(true);
            }

            if (wasEverIncomplete && isNowComplete) {
                onSetupComplete();
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    if (isLoading) {
        return <div className="flex justify-center py-12"><LoadingSpinner themeColor="#4f46e5" /></div>;
    }

    if (error) {
        return (
            <div className="text-center space-y-6 py-8">
                <div className="bg-red-50 border border-red-200 p-6 rounded-xl inline-block max-w-md mx-auto">
                    <h3 className="text-xl font-bold text-red-800 mb-2">Connection Blocked</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <p className="text-sm text-red-500 mb-6 italic text-left">Note: This often happens if your Vercel deployment failed or if environment variables are completely missing.</p>
                    <button onClick={fetchStatus} className="w-full py-3 px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors">
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    if (!status) return null;

    const allOk = status.kvStoreConnected && status.adminPasswordSet && status.geminiApiKeySet;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
             <div className="text-center border-b border-slate-200 pb-6">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">System Configuration</h3>
                 {!allOk && <p className="text-slate-500 mt-2">Required steps to restore application functionality.</p>}
            </div>
            
            {!allOk && (
                <div className="p-5 rounded-xl bg-amber-50 border-2 border-amber-200 text-center shadow-sm">
                    <h4 className="font-bold text-amber-800 text-lg">Action Required</h4>
                    <p className="text-sm text-amber-700 mt-1">The application cannot run until the following services are reconnected.</p>
                 </div>
            )}

            <div className="space-y-5">
                <StatusRow 
                    label="Vercel KV Database"
                    isOk={status.kvStoreConnected}
                    fixInstruction={
                      <div className="space-y-4">
                        <p className="font-medium text-red-800 bg-red-100 p-3 rounded border border-red-200">
                           {status.kvEnvVarsSet 
                             ? "Connection test failed. The database might be archived or the credentials expired." 
                             : "Database credentials (KV_URL, etc.) are missing entirely."}
                        </p>
                        
                        <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
                            <h5 className="font-bold text-slate-800 mb-2">How to reconnect:</h5>
                            <ol className="list-decimal list-outside ml-4 space-y-3 text-slate-700">
                                <li>Open your <span className="font-semibold">Vercel Project Dashboard</span>.</li>
                                <li>Navigate to the <span className="font-semibold">"Storage"</span> tab.</li>
                                <li>If you see an archived KV store, you must <span className="font-bold">create a NEW Upstash for Redis</span> instance.</li>
                                <li>Ensure the new store is <span className="font-semibold">connected</span> to this project.</li>
                                <li><strong className="text-red-600">IMPORTANT:</strong> After connecting the new DB, you MUST redeploy the app or go to <span className="font-semibold text-slate-900">Settings > Deployment</span> and trigger a fresh build to load the new environment variables.</li>
                            </ol>
                        </div>
                      </div>
                    }
                />
                <StatusRow 
                    label="Gemini AI (Vision API)"
                    isOk={status.geminiApiKeySet}
                    fixInstruction={
                        <div className="p-3 bg-white rounded border border-red-200">
                            Add a variable named <code className="bg-slate-100 px-2 py-0.5 rounded text-red-600 font-mono">API_KEY</code> in Vercel Environment Variables.
                        </div>
                    }
                />
                <StatusRow 
                    label="Admin Security"
                    isOk={status.adminPasswordSet}
                    fixInstruction={
                        <div className="p-3 bg-white rounded border border-red-200">
                            Add a variable named <code className="bg-slate-100 px-2 py-0.5 rounded text-red-600 font-mono">ADMIN_PASSWORD</code> for dashboard access.
                        </div>
                    }
                />
            </div>

            <div className="text-center pt-6">
                <button onClick={fetchStatus} className="inline-flex items-center gap-2 py-3 px-8 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Refresh Configuration Status
                </button>
            </div>
           
            {isDevelopment && (
                <div className="mt-10 p-6 bg-slate-900 rounded-2xl text-slate-200 border border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <h4 className="font-bold text-lg">Local Development Detected</h4>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">To sync your local environment with the cloud KV store, run:</p>
                    <div className="bg-black p-4 rounded-lg font-mono text-xs text-indigo-400 border border-slate-700 mb-4">
                        vercel env pull .env.development.local
                    </div>
                    <p className="text-xs text-amber-400 font-semibold bg-amber-900/30 p-3 rounded-lg border border-amber-900/50">
                        Reminder: Restart your local dev server after running this command.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ServerStatus;