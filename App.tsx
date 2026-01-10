
import React, { useState, useEffect, useCallback } from 'react';
import { College, AppStatus, FormData, ThemeConfig, FormField, Submission } from './types';
import { INITIAL_COLLEGES, INITIAL_THEME_CONFIG, INITIAL_FORM_FIELDS } from './constants';
import { analyzeCertificate } from './services/geminiService';
import GraduateForm from './components/GraduateForm';
import SuccessPage from './components/SuccessPage';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';

const SETTINGS_KEY = 'alumni_app_settings';
const SUBMISSIONS_KEY = 'alumni_app_submissions';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);

  // App state
  const [colleges, setColleges] = useState<College[]>(INITIAL_COLLEGES);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(INITIAL_THEME_CONFIG);
  const [formFields, setFormFields] = useState<FormField[]>(INITIAL_FORM_FIELDS);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [matchedCollege, setMatchedCollege] = useState<College | null>(null);
  const [extractedCertificateName, setExtractedCertificateName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // Helper for localStorage persistence in local mode
  const persistLocal = (settings: { themeConfig: ThemeConfig; colleges: College[]; formFields: FormField[] }) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  };

  const startupCheck = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // Attempt to check server status
      let statusData = { kvStoreConnected: false, geminiApiKeySet: false, adminPasswordSet: false };
      try {
        const statusRes = await fetch('/api/status');
        if (statusRes.ok) {
          statusData = await statusRes.json();
          setIsLocalMode(false);
        } else if (statusRes.status === 404) {
          console.warn("API not found. Entering Local/Frontend-only mode.");
          setIsLocalMode(true);
        }
      } catch (e) {
        console.warn("Network error checking status. Entering Local mode.", e);
        setIsLocalMode(true);
      }

      const isLocal = !statusData.kvStoreConnected || !statusData.adminPasswordSet;
      
      // Load settings
      if (isLocalMode || isLocal) {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setThemeConfig({ ...INITIAL_THEME_CONFIG, ...parsed.themeConfig });
          setColleges(parsed.colleges || INITIAL_COLLEGES);
          setFormFields(parsed.formFields || INITIAL_FORM_FIELDS);
        }
        
        const savedSubs = localStorage.getItem(SUBMISSIONS_KEY);
        setSubmissions(savedSubs ? JSON.parse(savedSubs) : []);
        
        setIsSetupComplete(true); // Always "setup" in local mode
        setStatus(AppStatus.FORM);
      } else {
        // Fetch from API
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setThemeConfig({ ...INITIAL_THEME_CONFIG, ...(data.themeConfig || {}) });
          setColleges(data.colleges || INITIAL_COLLEGES);
          setFormFields(data.formFields || INITIAL_FORM_FIELDS);
        }

        const subsRes = await fetch('/api/submissions');
        if (subsRes.ok) {
          setSubmissions(await subsRes.json() || []);
        }
        
        setIsSetupComplete(statusData.kvStoreConnected && statusData.adminPasswordSet && statusData.geminiApiKeySet);
        setStatus(statusData.geminiApiKeySet ? AppStatus.FORM : AppStatus.ADMIN_PANEL);
      }
    } catch (error) {
      console.error('Error during startup:', error);
      setErrorMessage('Failed to initialize application.');
      setStatus(AppStatus.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [isLocalMode]);

  useEffect(() => {
    startupCheck();
  }, [startupCheck]);

  const handleSubmit = async (formData: FormData, certificateBase64: string, mimeType: string) => {
    setStatus(AppStatus.PROCESSING);
    setErrorMessage('');
    setMatchedCollege(null);
    setExtractedCertificateName(null);

    try {
      const collegeNames = colleges.map(c => c.name);
      const analysisResult = await analyzeCertificate(certificateBase64, mimeType, collegeNames);
      
      setExtractedCertificateName(analysisResult.extractedName);

      if (analysisResult.matchedName) {
        const matchedName = analysisResult.matchedName;
        const foundCollege = colleges.find(c => c.name.toLowerCase() === matchedName.toLowerCase());

        if (foundCollege) {
            const correctedFormData = { ...formData, collegeId: foundCollege.name };
            const newSubmission: Submission = {
              id: new Date().toISOString(),
              timestamp: new Date().toLocaleString(),
              formData: correctedFormData,
              matchedCollegeName: foundCollege.name,
              extractedName: analysisResult.extractedName || 'N/A',
            };

            if (isLocalMode) {
              const updated = [newSubmission, ...submissions];
              setSubmissions(updated);
              localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
            } else {
              await fetch('/api/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSubmission),
              });
              setSubmissions(prev => [newSubmission, ...prev]);
            }

            setMatchedCollege(foundCollege);
            setStatus(AppStatus.SUCCESS);
            localStorage.removeItem('alumni_saved_form_data');
        } else {
          setErrorMessage(`The AI matched "${matchedName}", but this college isn't in our verified list.`);
          setStatus(AppStatus.ERROR);
        }
      } else {
        setErrorMessage(analysisResult.extractedName 
          ? `Identified "${analysisResult.extractedName}" but couldn't match it to a verified college.`
          : 'Could not identify a recognized college from your certificate.');
        setStatus(AppStatus.ERROR);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Analysis failed.');
      setStatus(AppStatus.ERROR);
    }
  };

  const handleSaveSettings = async (newSettings: {themeConfig: ThemeConfig, colleges: College[], formFields: FormField[]}) => {
     if (isLocalMode) {
        persistLocal(newSettings);
        setThemeConfig(newSettings.themeConfig);
        setColleges(newSettings.colleges);
        setFormFields(newSettings.formFields);
        return;
     }

     try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });
        if (res.ok) {
          setThemeConfig(newSettings.themeConfig);
          setColleges(newSettings.colleges);
          setFormFields(newSettings.formFields);
        }
     } catch (error) {
        throw error;
     }
  };

  const handleClearSubmissions = async () => {
    if (isLocalMode) {
      setSubmissions([]);
      localStorage.removeItem(SUBMISSIONS_KEY);
      return;
    }
    await fetch('/api/submissions', { method: 'DELETE' });
    setSubmissions([]);
  };
  
  const resetApp = () => {
    setStatus(AppStatus.FORM);
    setMatchedCollege(null);
    setErrorMessage('');
    setExtractedCertificateName(null);
  };

  const handleAdminClick = () => {
    if (status === AppStatus.ADMIN_PANEL) {
      setStatus(AppStatus.FORM);
      return;
    }
    // Skip password in local mode if needed, but keeping login for UI consistency
    setShowAdminLogin(true);
  };

  const handleAdminLogin = async (password: string) => {
    if (isLocalMode) {
        // In local mode without a set password, we allow any login if ADMIN_PASSWORD is not set
        setStatus(AppStatus.ADMIN_PANEL);
        setShowAdminLogin(false);
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (res.ok) {
            setStatus(AppStatus.ADMIN_PANEL);
            setShowAdminLogin(false);
        } else {
            alert("Incorrect password.");
            setShowAdminLogin(false);
        }
    } catch (error) {
        alert("Login failed.");
        setShowAdminLogin(false);
    }
  };
  
  const handleSetupComplete = () => {
    window.location.reload();
  };
  
  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center items-center p-10"><LoadingSpinner themeColor={themeConfig.primaryColor}/></div>

    switch (status) {
      case AppStatus.FORM:
        return <GraduateForm colleges={colleges} onSubmit={handleSubmit} formFields={formFields} themeConfig={themeConfig} />;
      case AppStatus.PROCESSING:
        return <LoadingSpinner themeColor={themeConfig.primaryColor}/>;
      case AppStatus.SUCCESS:
        return matchedCollege && <SuccessPage college={matchedCollege} onBack={resetApp} themeConfig={themeConfig} />;
      case AppStatus.ADMIN_PANEL:
        return <AdminDashboard 
                  colleges={colleges} 
                  themeConfig={themeConfig}
                  formFields={formFields}
                  submissions={submissions}
                  onSave={handleSaveSettings}
                  onClearSubmissions={handleClearSubmissions}
                  onSetupComplete={handleSetupComplete}
                  initialTab={isSetupComplete ? 'Submissions' : 'Status'}
                />;
      case AppStatus.ERROR:
        return <ErrorDisplay message={errorMessage} onBack={resetApp} themeConfig={themeConfig} extractedName={extractedCertificateName} />;
      default:
        return <GraduateForm colleges={colleges} onSubmit={handleSubmit} formFields={formFields} themeConfig={themeConfig} />;
    }
  };

  const dynamicStyles = `:root { --primary-color: ${themeConfig.primaryColor}; }`;

  return (
    <>
    <style>{dynamicStyles}</style>
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-4">
      {showAdminLogin && <AdminLogin onLogin={handleAdminLogin} onCancel={() => setShowAdminLogin(false)} themeConfig={themeConfig}/>}
      
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4">
            {isLocalMode && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider border border-amber-200">
                Local Storage Mode
              </span>
            )}
            <div className="flex-1"></div>
            <button
              onClick={handleAdminClick}
              className="bg-white text-slate-700 font-semibold py-2 px-4 border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors duration-200 flex items-center gap-2"
            >
              {status === AppStatus.ADMIN_PANEL ? 'Back to Form' : 'Admin Panel'}
            </button>
        </div>

        <div className="flex flex-col items-center">
            <header className="text-center mb-8">
                {themeConfig.logo && (
                    <img src={themeConfig.logo} alt="logo" className="h-20 md:h-24 w-auto mx-auto mb-6"/>
                )}
                <h1 className="text-4xl font-bold text-slate-800">{themeConfig.headerText}</h1>
                <p className="text-slate-600 mt-2">{themeConfig.subHeaderText}</p>
            </header>

            <main className="w-full max-w-2xl">
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-10 border border-slate-200">
                {renderContent()}
                </div>
            </main>
            <footer className="text-center mt-8 text-slate-500 text-sm">
                <p>Powered by Gemini API</p>
            </footer>
        </div>
      </div>
    </div>
    </>
  );
};

export default App;
