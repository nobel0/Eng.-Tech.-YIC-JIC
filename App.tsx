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

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.FORM);
  const [isLoading, setIsLoading] = useState(true);

  // State is now initialized with defaults, then fetched from the server.
  const [colleges, setColleges] = useState<College[]>(INITIAL_COLLEGES);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(INITIAL_THEME_CONFIG);
  const [formFields, setFormFields] = useState<FormField[]>(INITIAL_FORM_FIELDS);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [matchedCollege, setMatchedCollege] = useState<College | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // A robust error handler for fetch requests
  const handleFetchError = async (response: Response, context: string): Promise<void> => {
    const errorText = await response.text();
    let errorMessage = `Error with ${context}. Status: ${response.status}.`;
    try {
      // Try to parse as JSON for a structured error from our API
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
    } catch (e) {
      // If it's not JSON, it's likely an error from Vercel infrastructure.
      errorMessage += ` Response: ${errorText.substring(0, 200)}...`;
    }
    throw new Error(errorMessage);
  };

  const startupCheck = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(''); // Clear previous error messages on retry
    try {
      // 1. Check server status first
      const statusRes = await fetch('/api/status');
      if (!statusRes.ok) {
        await handleFetchError(statusRes, "server status check");
      }
      const statusData = await statusRes.json();
      
      const setupOk = statusData.kvStoreConnected && statusData.geminiApiKeySet && statusData.adminPasswordSet;
      setIsSetupComplete(setupOk);

      if (!statusData.kvStoreConnected || !statusData.adminPasswordSet) {
        // If critical configs are missing, go straight to the Admin Panel to fix them.
        // No point in fetching data if the DB isn't connected.
        setStatus(AppStatus.ADMIN_PANEL);
        setIsLoading(false);
        return;
      }

      // 2. DB is connected, proceed to fetch data
      // Fetch settings (theme, colleges, fields)
      const settingsRes = await fetch('/api/settings');
      if (!settingsRes.ok) {
          await handleFetchError(settingsRes, "settings fetch");
      }
      const settingsData = await settingsRes.json();
      if (settingsData) {
          // Merge fetched theme config with defaults to ensure all keys are present
          setThemeConfig({ ...INITIAL_THEME_CONFIG, ...(settingsData.themeConfig || {}) });
          setColleges(settingsData.colleges || INITIAL_COLLEGES);
          setFormFields(settingsData.formFields || INITIAL_FORM_FIELDS);
      } else {
           console.log("No settings found in database, using initial defaults.");
      }

      // Fetch submissions
      const submissionsRes = await fetch('/api/submissions');
      if (!submissionsRes.ok) {
          await handleFetchError(submissionsRes, "submissions fetch");
      }
      const subsData = await submissionsRes.json();
      setSubmissions(subsData || []);
      
      // 3. Decide where to go. Form is only usable if API key is set.
      if (!statusData.geminiApiKeySet) {
          // Data is loaded, but API key is missing. Go to admin to fix.
          setStatus(AppStatus.ADMIN_PANEL);
      } else {
          // Everything loaded and configured, set status to FORM
          setStatus(AppStatus.FORM);
      }

    } catch (error) {
      console.error('Error during application startup:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred during startup.');
      setStatus(AppStatus.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array as it has no external dependencies.

  // Fetch all application data from the server on initial load.
  useEffect(() => {
    startupCheck();
  }, [startupCheck]);

  const handleSubmit = async (formData: FormData, certificateBase64: string, mimeType: string) => {
    setStatus(AppStatus.PROCESSING);
    setErrorMessage('');
    setMatchedCollege(null);

    const userSelectedCollegeName = formData.collegeId;

    try {
      const collegeNames = colleges.map(c => c.name);
      const identifiedCollegeName = await analyzeCertificate(certificateBase64, mimeType, collegeNames);

      if (identifiedCollegeName) {
        // AI found a recognized college in the certificate
        const foundCollege = colleges.find(c => c.name.toLowerCase() === identifiedCollegeName.toLowerCase());

        if (foundCollege) {
            // Check if the AI's finding matches the user's selection
            if (identifiedCollegeName.toLowerCase() === userSelectedCollegeName.toLowerCase()) {
                // SUCCESS: Match is successful
                const newSubmission: Submission = {
                  id: new Date().toISOString(),
                  timestamp: new Date().toLocaleString(),
                  formData: formData,
                  matchedCollegeName: foundCollege.name,
                };

                // Save new submission to the server
                const res = await fetch('/api/submissions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newSubmission),
                });
                
                if (!res.ok) {
                  await handleFetchError(res, "submission save");
                }

                setSubmissions(prev => [newSubmission, ...prev]);
                setMatchedCollege(foundCollege);
                setStatus(AppStatus.SUCCESS);
                // Clear saved form data on successful submission
                try {
                  localStorage.removeItem('alumni_saved_form_data');
                } catch (error) {
                    console.error("Could not remove saved form data.", error);
                }
            } else {
                // ERROR (Mismatch): User selected one college, but certificate is for another recognized one.
                setErrorMessage(`It looks like your certificate is from "${identifiedCollegeName}", but you selected "${userSelectedCollegeName}". Please try again and select the correct college from the list.`);
                setStatus(AppStatus.ERROR);
            }
        } else {
          // This case is unlikely if identifiedCollegeName is in collegeNames, but it's a safe fallback.
          setErrorMessage(`The certificate is for "${identifiedCollegeName}". This college or university is not part of this community group.`);
          setStatus(AppStatus.ERROR);
        }
      } else {
        // ERROR (Unrecognized): AI could not identify a recognized college from the list.
        setErrorMessage('We could not identify a recognized college from your certificate. Please ensure the uploaded file is clear, high-resolution, and from one of the listed institutions.');
        setStatus(AppStatus.ERROR);
      }
    } catch (error) {
      console.error('Error processing submission:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again later.');
      setStatus(AppStatus.ERROR);
    }
  };

  const handleSaveSettings = async (newSettings: {themeConfig: ThemeConfig, colleges: College[], formFields: FormField[]}) => {
     try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });
        if (!res.ok) {
           await handleFetchError(res, "settings save");
        }
        // Update local state to match saved state
        setThemeConfig(newSettings.themeConfig);
        setColleges(newSettings.colleges);
        setFormFields(newSettings.formFields);
     } catch (error) {
        console.error("Failed to save settings:", error);
        throw error; // Re-throw to be caught by the calling component
     }
  };

  const handleClearSubmissions = async () => {
    try {
        const res = await fetch('/api/submissions', { method: 'DELETE' });
        if (!res.ok) {
            await handleFetchError(res, "clear submissions");
        }
        setSubmissions([]);
    } catch(error) {
        console.error("Failed to clear submissions:", error);
        throw error; // Re-throw
    }
  };
  
  const resetApp = () => {
    if (isSetupComplete) {
      setStatus(AppStatus.FORM);
    } else {
      // If setup is still not complete, return to the admin panel.
      setStatus(AppStatus.ADMIN_PANEL);
    }
    setMatchedCollege(null);
    setErrorMessage('');
  };

  const handleAdminClick = () => {
    if (status === AppStatus.ADMIN_PANEL) {
      // Only allow returning to form if setup is complete
      if (isSetupComplete) {
        setStatus(AppStatus.FORM);
      }
      return;
    }
    setShowAdminLogin(true);
  };

  const handleAdminLogin = async (password: string) => {
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });
        
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                setStatus(AppStatus.ADMIN_PANEL);
                setShowAdminLogin(false);
            }
        } else {
             const errorData = await res.json();
             alert(errorData.error || "Incorrect password.");
             setShowAdminLogin(false);
        }
    } catch (error) {
        console.error("Login failed:", error);
        alert("An error occurred during login. Please try again.");
        setShowAdminLogin(false);
    }
  };
  
  const handleSetupComplete = () => {
    // A simple page reload is the most reliable way to refetch all data and reset state
    // after critical setup changes (like connecting a database).
    window.location.reload();
  };
  
  const renderContent = () => {
    if (isLoading) {
        return <div className="flex justify-center items-center p-10"><LoadingSpinner themeColor={themeConfig.primaryColor}/></div>
    }

    switch (status) {
      case AppStatus.FORM:
        return <GraduateForm 
                  colleges={colleges} 
                  onSubmit={handleSubmit} 
                  formFields={formFields} 
                  themeConfig={themeConfig}
                />;
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
        return <ErrorDisplay message={errorMessage} onBack={resetApp} themeConfig={themeConfig} />; // Changed onBack to resetApp for user flow
      default:
        // Fallback to form, which will internally be replaced by admin panel if setup is needed.
        return <GraduateForm colleges={colleges} onSubmit={handleSubmit} formFields={formFields} themeConfig={themeConfig} />;
    }
  };

  // Create a dynamic style tag to apply the primary color from the theme config
  const dynamicStyles = `
    :root {
      --primary-color: ${themeConfig.primaryColor};
    }
  `;

  return (
    <>
    <style>{dynamicStyles}</style>
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-4">
      {showAdminLogin && <AdminLogin onLogin={handleAdminLogin} onCancel={() => setShowAdminLogin(false)} themeConfig={themeConfig}/>}
      
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-end mb-4">
            <button
              onClick={handleAdminClick}
              disabled={status === AppStatus.ADMIN_PANEL && !isSetupComplete}
              className="bg-white text-slate-700 font-semibold py-2 px-4 border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === AppStatus.ADMIN_PANEL ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" /></svg>
                  Back to Form
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                  Admin Panel
                </>
              )}
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