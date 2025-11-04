
import React, { useState, useEffect } from 'react';
import { College, AppStatus, FormData, ThemeConfig, FormField, Submission } from './types';
import { INITIAL_COLLEGES, INITIAL_THEME_CONFIG, INITIAL_FORM_FIELDS } from './constants';
import { analyzeCertificate } from './services/geminiService';
import GraduateForm from './components/GraduateForm';
import SuccessPage from './components/SuccessPage';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';

// Helper function to safely load and parse from localStorage
const loadStateFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      return JSON.parse(storedValue) as T;
    }
  } catch (error) {
    console.error(`Failed to load or parse '${key}' from localStorage`, error);
  }
  return defaultValue;
};

// Helper function to get the current admin password
const getAdminPassword = (): string => {
  try {
    const storedPassword = localStorage.getItem('admin_password');
    // Use stored password if it exists, otherwise fall back to default
    return storedPassword || process.env.ADMIN_PASSWORD || 'admin123';
  } catch (error) {
    console.error("Failed to read admin password from localStorage", error);
    // Fallback in case of error
    return process.env.ADMIN_PASSWORD || 'admin123';
  }
};


const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.FORM);
  
  // Use lazy initialization to load from localStorage only once on component mount
  const [colleges, setColleges] = useState<College[]>(() =>
    loadStateFromLocalStorage('colleges', INITIAL_COLLEGES)
  );
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() =>
    loadStateFromLocalStorage('themeConfig', INITIAL_THEME_CONFIG)
  );
  const [formFields, setFormFields] = useState<FormField[]>(() =>
    loadStateFromLocalStorage('formFields', INITIAL_FORM_FIELDS)
  );
  const [submissions, setSubmissions] = useState<Submission[]>(() =>
    loadStateFromLocalStorage('submissions', [])
  );

  const [matchedCollege, setMatchedCollege] = useState<College | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  // useEffect hooks for SAVING data to localStorage when state changes.
  // Splitting them ensures that an error in one doesn't stop others from saving.
  useEffect(() => {
    try {
      localStorage.setItem('colleges', JSON.stringify(colleges));
    } catch (error) {
      console.error("Failed to save 'colleges' to localStorage", error);
    }
  }, [colleges]);

  useEffect(() => {
    try {
      localStorage.setItem('themeConfig', JSON.stringify(themeConfig));
    } catch (error) {
      console.error("Failed to save 'themeConfig' to localStorage", error);
    }
  }, [themeConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('formFields', JSON.stringify(formFields));
    } catch (error) {
      console.error("Failed to save 'formFields' to localStorage", error);
    }
  }, [formFields]);

  useEffect(() => {
    try {
      localStorage.setItem('submissions', JSON.stringify(submissions));
    } catch (error) {
      console.error("Failed to save 'submissions' to localStorage", error);
    }
  }, [submissions]);

  const handleSubmit = async (formData: FormData, certificateBase64: string, mimeType: string) => {
    setStatus(AppStatus.PROCESSING);
    setErrorMessage('');
    setMatchedCollege(null);

    try {
      const collegeNames = colleges.map(c => c.name);
      const matchedName = await analyzeCertificate(certificateBase64, mimeType, collegeNames);

      if (matchedName) {
        const foundCollege = colleges.find(c => c.name.toLowerCase() === matchedName.toLowerCase());
        if (foundCollege) {
          const newSubmission: Submission = {
            id: new Date().toISOString(),
            timestamp: new Date().toLocaleString(),
            formData: formData,
            matchedCollegeName: foundCollege.name,
          };
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
          setErrorMessage(`The certificate is for "${matchedName}". This college or university is not part of this community group.`);
          setStatus(AppStatus.ERROR);
        }
      } else {
        setErrorMessage('We could not identify a recognized college from your certificate. Please ensure the uploaded file is clear and high-resolution.');
        setStatus(AppStatus.ERROR);
      }
    } catch (error) {
      console.error('Error processing certificate:', error);
      setErrorMessage('An unexpected error occurred while analyzing your certificate. Please try again later.');
      setStatus(AppStatus.ERROR);
    }
  };

  const resetApp = () => {
    setStatus(AppStatus.FORM);
    setMatchedCollege(null);
    setErrorMessage('');
  };

  const handleAdminClick = () => {
    if (status === AppStatus.ADMIN_PANEL) {
      setStatus(AppStatus.FORM);
      return;
    }
    setShowAdminLogin(true);
  };

  const handleAdminLogin = (password: string) => {
    const adminPassword = getAdminPassword();
    if (password === adminPassword) {
      setStatus(AppStatus.ADMIN_PANEL);
      setShowAdminLogin(false);
    } else {
      alert("Incorrect password.");
      setShowAdminLogin(false);
    }
  };

  const handleSetAdminPassword = (newPassword: string): boolean => {
    try {
      localStorage.setItem('admin_password', newPassword);
      return true;
    } catch (error) {
      console.error("Failed to save new admin password to localStorage", error);
      return false;
    }
  };
  
  const renderContent = () => {
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
                  setColleges={setColleges}
                  themeConfig={themeConfig}
                  setThemeConfig={setThemeConfig}
                  formFields={formFields}
                  setFormFields={setFormFields}
                  submissions={submissions}
                  setSubmissions={setSubmissions}
                  setAdminPassword={handleSetAdminPassword}
                />;
      case AppStatus.ERROR:
        return <ErrorDisplay message={errorMessage} onBack={resetApp} themeConfig={themeConfig} />;
      default:
        return <GraduateForm colleges={colleges} onSubmit={handleSubmit} formFields={formFields} themeConfig={themeConfig} />;
    }
  };

  // Create a dynamic style tag to apply the primary color
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
              className="bg-white text-slate-700 font-semibold py-2 px-4 border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors duration-200 flex items-center gap-2"
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
