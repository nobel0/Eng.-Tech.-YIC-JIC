
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ServerStatusState {
  kvStoreConnected: boolean;
  adminPasswordSet: boolean;
  geminiApiKeySet: boolean;
}

const StatusRow: React.FC<{ label: string; isOk: boolean; fixInstruction: string; }> = ({ label, isOk, fixInstruction }) => (
    <div className={`p-4 rounded-lg flex items-start gap-4 ${isOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
        <div className="flex-shrink-0">
            {isOk ? (
                <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
                <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
        </div>
        <div>
            <h4 className="font-semibold text-slate-800">{label}</h4>
            <p className={`text-sm ${isOk ? 'text-slate-600' : 'text-red-700'}`}>
                {isOk ? 'Configured correctly.' : fixInstruction}
            </p>
        </div>
    </div>
);


const ServerStatus: React.FC = () => {
    const [status, setStatus] = useState<ServerStatusState | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            setIsLoading(true);
            setError('');
            try {
                const res = await fetch('/api/status');
                if (!res.ok) {
                    throw new Error('Failed to fetch server status.');
                }
                const data: ServerStatusState = await res.json();
                setStatus(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();
    }, []);

    if (isLoading) {
        return <div className="flex justify-center py-8"><LoadingSpinner themeColor="#4f46e5" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-600">{error}</div>;
    }

    if (!status) {
        return <div className="text-center text-slate-500">Could not load server status.</div>;
    }

    const allOk = status.kvStoreConnected && status.adminPasswordSet && status.geminiApiKeySet;

    return (
        <div className="space-y-6">
             <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800">Server Configuration Status</h3>
                <p className="text-slate-500 mt-1">This page checks if your server environment is set up correctly.</p>
            </div>
            
            {allOk ? (
                 <div className="p-4 rounded-lg bg-green-50 border-green-200 border text-center">
                    <h4 className="font-semibold text-green-800">All systems operational.</h4>
                    <p className="text-sm text-green-700">Your application is configured correctly and should be fully functional.</p>
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
                    fixInstruction="Go to the 'Storage' tab in your Vercel project dashboard and connect a KV store."
                />
                <StatusRow 
                    label="Gemini API Key"
                    isOk={status.geminiApiKeySet}
                    fixInstruction="Go to 'Settings' > 'Environment Variables' in Vercel and add a variable named API_KEY with your Gemini key."
                />
                <StatusRow 
                    label="Admin Password"
                    isOk={status.adminPasswordSet}
                    fixInstruction="Go to 'Settings' > 'Environment Variables' in Vercel and add a variable named ADMIN_PASSWORD."
                />
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="font-semibold text-slate-800">For Local Development</h4>
                <p className="text-sm text-slate-600 mt-2">
                    If you've made changes to your environment variables on Vercel, you need to sync them to your local machine to see them reflected here. Open your terminal in the project folder and run this command:
                </p>
                <pre className="mt-3 bg-slate-800 text-white p-3 rounded-md text-sm overflow-x-auto">
                    <code>vercel env pull .env.development.local</code>
                </pre>
                <p className="text-sm text-slate-600 mt-2">
                    After running the command, you must restart your local development server for the changes to take effect.
                </p>
            </div>
        </div>
    );
};

export default ServerStatus;
