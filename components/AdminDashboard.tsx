
import React, { useState, useEffect } from 'react';
import { College, ThemeConfig, FormField, Submission } from '../types';
import FormFieldEditor from './FormFieldEditor';
import SubmissionHistory from './SubmissionHistory';
import ServerStatus from './ServerStatus';

interface AdminDashboardProps {
  colleges: College[];
  themeConfig: ThemeConfig;
  formFields: FormField[];
  submissions: Submission[];
  onSave: (newSettings: { themeConfig: ThemeConfig, colleges: College[], formFields: FormField[] }) => Promise<void>;
  onClearSubmissions: () => Promise<void>;
  setAdminPassword: (newPassword: string) => boolean;
}

type AdminTab = 'Status' | 'Submissions' | 'Design' | 'Fields' | 'Colleges' | 'Settings';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    colleges, themeConfig, formFields, submissions, 
    onSave, onClearSubmissions, setAdminPassword
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('Status');
  
  // Local state for editing to enable explicit saving
  const [localThemeConfig, setLocalThemeConfig] = useState<ThemeConfig>(themeConfig);
  const [localColleges, setLocalColleges] = useState<College[]>(colleges);
  const [localFormFields, setLocalFormFields] = useState<FormField[]>(formFields);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // States for password change form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Reset local state if the parent props change (e.g., after saving or discarding)
  useEffect(() => {
    setLocalThemeConfig(themeConfig);
    setLocalColleges(colleges);
    setLocalFormFields(formFields);
  }, [themeConfig, colleges, formFields]);

  // Check for any unsaved changes by comparing local state to original props
  const hasUnsavedChanges = JSON.stringify({ themeConfig: localThemeConfig, colleges: localColleges, formFields: localFormFields }) !==
                            JSON.stringify({ themeConfig, colleges, formFields });

  const handleSaveChanges = async () => {
    setSaveStatus('saving');
    try {
        await onSave({
            themeConfig: localThemeConfig,
            colleges: localColleges,
            formFields: localFormFields
        });
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (error) {
        setSaveStatus('error');
        alert(`Failed to save changes: ${error.message}`);
    }
  };

  const handleDiscardChanges = () => {
    setLocalThemeConfig(themeConfig);
    setLocalColleges(colleges);
    setLocalFormFields(formFields);
  };

  const handlePasswordUpdate = () => {
    setPasswordMessage(null);
    if (!newPassword || !confirmPassword) {
      setPasswordMessage({ text: "Please fill in all password fields.", type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "New passwords do not match.", type: 'error' });
      return;
    }
    // This function now just shows an alert, as passwords must be changed in Vercel settings.
    setAdminPassword(newPassword);
  };

  // State for Colleges tab
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeLink, setNewCollegeLink] = useState('');
  const [collegeError, setCollegeError] = useState('');
  const [editCollegeId, setEditCollegeId] = useState<string | null>(null);

  // State for Form Fields tab
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);

  const handleThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalThemeConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_SIZE_KB = 500;
      const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;
      if (file.size > MAX_SIZE_BYTES) {
        alert(`File is too large. Please upload a logo smaller than ${MAX_SIZE_KB} KB to avoid save errors.`);
        e.target.value = ''; // Clear the file input
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalThemeConfig(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleAddCollege = () => {
    if (!newCollegeName || !newCollegeLink) {
      setCollegeError('Both name and link are required.');
      return;
    }
    setCollegeError('');
    
    if (editCollegeId) {
       setLocalColleges(localColleges.map(c => c.id === editCollegeId ? { ...c, name: newCollegeName, groupLink: newCollegeLink } : c));
       setEditCollegeId(null);
    } else {
        const newCollege: College = {
          id: new Date().toISOString(),
          name: newCollegeName,
          groupLink: newCollegeLink,
        };
        setLocalColleges([...localColleges, newCollege]);
    }

    setNewCollegeName('');
    setNewCollegeLink('');
  };
  
  const handleEditCollege = (college: College) => {
    setEditCollegeId(college.id);
    setNewCollegeName(college.name);
    setNewCollegeLink(college.groupLink);
  }

  const handleDeleteCollege = (id: string) => {
    setLocalColleges(localColleges.filter(college => college.id !== id));
  };

  const cancelEditCollege = () => {
    setEditCollegeId(null);
    setNewCollegeName('');
    setNewCollegeLink('');
    setCollegeError('');
  }

  const handleSaveField = (field: FormField) => {
    if (editingField) {
      setLocalFormFields(localFormFields.map(f => f.id === field.id ? field : f));
    } else {
      setLocalFormFields([...localFormFields, { ...field, id: new Date().toISOString() }]);
    }
    setIsFieldEditorOpen(false);
    setEditingField(null);
  };
  
  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setIsFieldEditorOpen(true);
  };
  
  const handleDeleteField = (id: string) => {
    if (confirm('Are you sure you want to delete this field?')) {
        setLocalFormFields(localFormFields.filter(f => f.id !== id));
    }
  };

  const renderTabContent = () => {
    switch(activeTab) {
        case 'Status':
            return <ServerStatus />;
        case 'Submissions':
            return <SubmissionHistory submissions={submissions} onClearSubmissions={onClearSubmissions} />;
        case 'Design':
            return (
                <div className="space-y-6">
                    <div>
                        <label htmlFor="headerText" className="block text-sm font-medium text-slate-700">Header Title</label>
                        <input type="text" name="headerText" id="headerText" value={localThemeConfig.headerText} onChange={handleThemeChange} className="mt-1 input-field"/>
                    </div>
                    <div>
                        <label htmlFor="subHeaderText" className="block text-sm font-medium text-slate-700">Header Subtitle</label>
                        <input type="text" name="subHeaderText" id="subHeaderText" value={localThemeConfig.subHeaderText} onChange={handleThemeChange} className="mt-1 input-field"/>
                    </div>
                    <div>
                        <label htmlFor="primaryColor" className="block text-sm font-medium text-slate-700">Primary Color</label>
                        <input type="color" name="primaryColor" id="primaryColor" value={localThemeConfig.primaryColor} onChange={handleThemeChange} className="mt-1 h-10 w-full rounded-md border border-slate-300"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Logo</label>
                        <input type="file" onChange={handleLogoUpload} accept="image/*" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"/>
                        <p className="text-xs text-slate-500 mt-1">Recommended: PNG or SVG under 500KB.</p>
                        {localThemeConfig.logo && <img src={localThemeConfig.logo} alt="logo preview" className="mt-4 h-16 w-auto border p-1 rounded-md"/>}
                    </div>
                </div>
            )
        case 'Fields':
            return (
                <div>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => { setEditingField(null); setIsFieldEditorOpen(true); }} className="btn-primary">Add New Field</button>
                    </div>
                    <ul className="space-y-3">
                        {localFormFields.map(field => (
                            <li key={field.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                                <div>
                                    <p className="font-semibold text-slate-800">{field.label} {field.required && <span className="text-red-500">*</span>}</p>
                                    <p className="text-sm text-slate-500 capitalize">Type: {field.type}</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 ml-4">
                                    <button onClick={() => handleEditField(field)} className="p-2 text-slate-500 hover:text-indigo-600 transition-colors">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                    </button>
                                    <button onClick={() => handleDeleteField(field.id)} className="p-2 text-slate-500 hover:text-red-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )
        case 'Colleges':
             return (
                <div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                        <h3 className="text-lg font-semibold text-slate-700">{editCollegeId ? 'Edit College' : 'Add New College'}</h3>
                        <input type="text" value={newCollegeName} onChange={(e) => setNewCollegeName(e.target.value)} placeholder="College Name" className="input-field"/>
                        <input type="text" value={newCollegeLink} onChange={(e) => setNewCollegeLink(e.target.value)} placeholder="Group Link" className="input-field"/>
                        {collegeError && <p className="text-sm text-red-600">{collegeError}</p>}
                        <div className="flex gap-2">
                            <button onClick={handleAddCollege} className="flex-1 btn-primary">{editCollegeId ? 'Update College' : 'Add College'}</button>
                            {editCollegeId && (<button onClick={cancelEditCollege} className="btn-secondary">Cancel</button>)}
                        </div>
                    </div>
                    <div className="mt-8">
                        <h3 className="text-lg font-semibold text-slate-700 mb-4">Existing Colleges</h3>
                        <ul className="space-y-3">
                        {localColleges.map(college => (
                            <li key={college.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                                <div>
                                    <p className="font-semibold text-slate-800">{college.name}</p>
                                    <a href={college.groupLink} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline break-all">{college.groupLink}</a>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 ml-4">
                                    <button onClick={() => handleEditCollege(college)} className="p-2 text-slate-500 hover:text-indigo-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                    </button>
                                    <button onClick={() => handleDeleteCollege(college.id)} className="p-2 text-slate-500 hover:text-red-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </li>
                        ))}
                        </ul>
                    </div>
                </div>
            )
        case 'Settings':
            return (
                <div className="space-y-6 max-w-md mx-auto">
                    <h3 className="text-xl font-bold text-slate-800 text-center">Security Settings</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                        <h4 className="text-lg font-semibold text-slate-700">Change Admin Password</h4>
                         <div className="text-sm p-4 bg-blue-50 text-blue-800 border border-blue-200 rounded-md">
                            To change the admin password, please update the <code>ADMIN_PASSWORD</code> environment variable in your Vercel project settings.
                        </div>
                    </div>
                </div>
            )
    }
  }

  const TabButton: React.FC<{tabName: AdminTab}> = ({ tabName }) => (
    <button onClick={() => setActiveTab(tabName)} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tabName ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
        {tabName}
    </button>
  );

  const SaveBar = () => {
    if (saveStatus === 'success') {
        return (
            <div className="sticky top-4 bg-green-500 text-white p-3 rounded-lg shadow-lg z-10 text-center mb-4 transition-all duration-300 ease-in-out">
                Changes saved successfully!
            </div>
        )
    }
    if (hasUnsavedChanges) {
        return (
             <div className="sticky top-4 bg-indigo-600 text-white p-3 rounded-lg shadow-lg z-10 flex justify-between items-center mb-4 transition-all duration-300 ease-in-out">
                <span className="font-medium">You have unsaved changes.</span>
                <div className="flex gap-3">
                    <button onClick={handleDiscardChanges} className="py-1 px-3 rounded-md text-sm font-medium bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors">
                    Discard
                    </button>
                    <button onClick={handleSaveChanges} disabled={saveStatus === 'saving'} className="py-1 px-3 rounded-md text-sm font-medium bg-white text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50">
                    {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        )
    }
    return null;
  }

  return (
    <div className="space-y-8 relative">
       <SaveBar />
      <h2 className="text-2xl font-bold text-slate-800 text-center">Admin Dashboard</h2>
      
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex flex-wrap justify-center gap-2 sm:gap-4" aria-label="Tabs">
            <TabButton tabName="Status" />
            <TabButton tabName="Submissions" />
            <TabButton tabName="Design" />
            <TabButton tabName="Fields" />
            <TabButton tabName="Colleges" />
            <TabButton tabName="Settings" />
        </nav>
      </div>

      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
        {renderTabContent()}
      </div>

      {isFieldEditorOpen && (
        <FormFieldEditor
            field={editingField}
            onSave={handleSaveField}
            onCancel={() => { setIsFieldEditorOpen(false); setEditingField(null); }}
        />
      )}
       <style>{`
            .input-field {
                display: block;
                width: 100%;
                padding: 0.5rem 0.75rem;
                background-color: white;
                border: 1px solid #cbd5e1;
                border-radius: 0.375rem;
                box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            }
            .input-field:focus {
                outline: none;
                --tw-ring-color: var(--primary-color);
                border-color: var(--primary-color);
                box-shadow: 0 0 0 1px var(--primary-color);
            }
            .btn-primary {
                padding: 0.5rem 1rem;
                border: 1px solid transparent;
                border-radius: 0.375rem;
                font-size: 0.875rem;
                font-weight: 500;
                color: white;
                background-color: var(--primary-color);
            }
            .btn-primary:hover {
                opacity: 0.9;
            }
            .btn-secondary {
                padding: 0.5rem 1rem;
                border: 1px solid #cbd5e1;
                border-radius: 0.375rem;
                font-size: 0.875rem;
                font-weight: 500;
                color: #334155;
                background-color: white;
            }
            .btn-secondary:hover {
                background-color: #f8fafc;
            }
       `}</style>
    </div>
  );
};

export default AdminDashboard;
