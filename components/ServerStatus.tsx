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

const EnvVarBadge: React.FC<{ name: string; exists: boolean }> = ({ name, exists }) => (
    <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-mono border ${exists ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
        <span className={`w-2 h-2 rounded-full ${exists ? 'bg-green-500' : 'bg-red-500'}`}></span>
        {name}
        <button 
            onClick={() => { navigator.clipboard.writeText(name); alert(`Copied ${name} to clipboard`); }}
            className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
            title="Copy variable name"
        >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        </button>
    </div>
);

const StatusRow: React.FC<{ label: string; isOk: boolean; fixInstruction: React.ReactNode; }> = ({ label, isOk, fixInstruction }) => (
    <div className={`p-4 rounded-lg flex items-start gap-4 ${isOk ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'} border transition-all duration-300 shadow-sm`}>
        <div className="flex-shrink-0 mt-1">
            {isOk ? (
                <div className="bg-green-100 p-1.5 rounded-full">
                    <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </div>
            ) : (
                <div className="bg-red-100 p-1.5 rounded-full">
                    <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                </div>
            )}
        </div>
        <div className="flex-1">
            <h4 className={`font-bold ${isOk ? 'text-green-800' : 'text-red-800'}`}>{label}</h4>
            <div className={`text-sm mt-1 ${isOk ? 'text-green-700' : 'text-red-700'}`}>
                {isOk ? 'Service is operational and connected.' : fixInstruction}
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
                throw new Error(`API unreachable (Status ${res.status}). This usually means the 'api/' routes are not yet deployed.`);
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
                    <h3 className="text-xl font-bold text-red-800 mb-2">Connection Problem</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <div className="text-xs text-red-500 mb-6 text-left space-y-2">
                        <p>1. Check if the project is finished deploying on Vercel.</p>
                        <p>2. Ensure the <code>api/</code> folder is included in the build.</p>
                        <p>3. Refresh this page in 30 seconds.</p>
                    </div>
                    <button onClick={fetchStatus} className="w-full py-3 px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors">
                        Retry Status Check
                    </button>
                </div>
            </div>
        );
    }

    if (!status) return null;

    const allOk = status.kvStoreConnected && status.adminPasswordSet && status.geminiApiKeySet;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="text-center border-b border-slate-200 pb-6">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Backend Configuration</h3>
                 {!allOk && <p className="text-slate-500 mt-2">The application requires the following environment variables to be set in your Vercel project.</p>}
            </div>

            <div className="space-y-5">
                <StatusRow 
                    label="Database (Upstash Redis)"
                    isOk={status.kvStoreConnected}
                    fixInstruction={
                      <div className="space-y-4">
                        <div className="p-3 bg-white rounded border border-red-200 space-y-2">
                            <p className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Required Environment Variables:</p>
                            <div className="flex flex-wrap gap-2">
                                <EnvVarBadge name="KV_REST_API_URL" exists={status.kvEnvVarsSet} />
                                <EnvVarBadge name="KV_REST_API_TOKEN" exists={status.kvEnvVarsSet} />
                            </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm text-slate-700">
                            <h5 className="font-bold text-slate-900 mb-2">How to Fix:</h5>
                            <ol className="list-decimal list-outside ml-4 space-y-3">
                                <li>Log in to <a href="https://console.upstash.com" target="_blank" className="text-indigo-600 font-medium underline">Upstash Console</a> and copy your REST credentials.</li>
                                <li>Go to your project in <span className="font-semibold">Vercel > Settings > Environment Variables</span>.</li>
                                <li>Update <code>KV_REST_API_URL</code> and <code>KV_REST_API_TOKEN</code>.</li>
                                <li><strong className="text-red-600">IMPORTANT:</strong> You must <span className="underline">redeploy</span> the project for these changes to take effect.</li>
                            </ol>
                        </div>
                      </div>
                    }
                />
                
                <StatusRow 
                    label="Gemini AI API"
                    isOk={status.geminiApiKeySet}
                    fixInstruction={
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                <EnvVarBadge name="API_KEY" exists={status.geminiApiKeySet} />
                            </div>
                            <p className="p-3 bg-white rounded border border-red-200">
                                Get a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-600 underline">AI Studio</a> and add it to Vercel as <code>API_KEY</code>.
                            </p>
                        </div>
                    }
                />

                <StatusRow 
                    label="Admin Security"
                    isOk={status.adminPasswordSet}
                    fixInstruction={
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                <EnvVarBadge name="ADMIN_PASSWORD" exists={status.adminPasswordSet} />
                            </div>
                            <p className="p-3 bg-white rounded border border-red-200">
                                Set an <code>ADMIN_PASSWORD</code> in Vercel to protect your dashboard.
                            </p>
                        </div>
                    }
                />
            </div>

            <div className="flex flex-col items-center gap-4 pt-4">
                <button onClick={fetchStatus} className="inline-flex items-center gap-2 py-3 px-10 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Check Again
                </button>
                <p className="text-xs text-slate-400 italic">Remember: Most changes require a redeployment to active.</p>
            </div>
           
            {isDevelopment && (
                <div className="mt-10 p-6 bg-slate-900 rounded-2xl text-slate-200 border border-slate-700 shadow-2xl">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <h4 className="font-bold text-lg">Local Sync Helper</h4>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">If the cloud is configured but local is failing, run this in your terminal:</p>
                    <div className="bg-black p-4 rounded-lg font-mono text-xs text-indigo-400 border border-slate-700 mb-4 select-all">
                        vercel env pull .env.development.local
                    </div>
                    <p className="text-xs text-amber-400 font-semibold bg-amber-900/30 p-3 rounded-lg border border-amber-900/50">
                        Reminder: Restart your local dev server after pulling.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ServerStatus;