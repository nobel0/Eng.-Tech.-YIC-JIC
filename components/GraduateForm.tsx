
import React, { useState, useEffect } from 'react';
import { College, FormData, FormField, ThemeConfig } from '../types';

interface GraduateFormProps {
  colleges: College[];
  onSubmit: (formData: FormData, certificateBase64: string, mimeType: string) => void;
  formFields: FormField[];
  themeConfig: ThemeConfig;
}

const SAVED_FORM_DATA_KEY = 'alumni_saved_form_data';

const GraduateForm: React.FC<GraduateFormProps> = ({ colleges, onSubmit, formFields, themeConfig }) => {
  const [formData, setFormData] = useState<FormData>({});
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const getInitialData = () => {
    const initialData: FormData = {};
    formFields.forEach(field => {
        if (field.name === 'collegeId' && colleges.length > 0) {
            initialData[field.name] = colleges[0].id;
        } else {
            initialData[field.name] = '';
        }
    });
    return initialData;
  }

  useEffect(() => {
    // Initialize with default structure
    const initialData = getInitialData();
    // Check for saved data in localStorage and merge it
    try {
        const savedDataString = localStorage.getItem(SAVED_FORM_DATA_KEY);
        if (savedDataString) {
            const savedData = JSON.parse(savedDataString);
            setFormData({ ...initialData, ...savedData });
        } else {
            setFormData(initialData);
        }
    } catch (error) {
        console.error("Failed to load saved form data", error);
        setFormData(initialData);
    }
  }, [formFields, colleges]);

  // Auto-save form data
  useEffect(() => {
      const hasData = Object.values(formData).some(val => val);
      if (!hasData || Object.keys(formData).length === 0) {
          return;
      }

      setSaveStatus('saving');
      const timer = setTimeout(() => {
          try {
              localStorage.setItem(SAVED_FORM_DATA_KEY, JSON.stringify(formData));
              setSaveStatus('saved');
          } catch (error) {
              console.error("Failed to auto-save form data", error);
              // Optionally set an error status
          }
      }, 1500); // Debounce time

      return () => clearTimeout(timer);
  }, [formData]);

  // Effect to make the "saved" message temporary
  useEffect(() => {
    if (saveStatus === 'saved') {
        const timer = setTimeout(() => setSaveStatus('idle'), 2000);
        return () => clearTimeout(timer);
    }
  }, [saveStatus]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const fieldName = e.target.name;
    
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setErrors(prev => ({...prev, [fieldName]: 'Please upload a valid image or PDF file.'}));
        if (fieldName === 'certificate') setCertificateFile(null);
        return;
      }
      if (fieldName === 'certificate') setCertificateFile(file);
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    formFields.forEach(field => {
        if (field.required) {
            if (field.type === 'file') {
                if (field.name === 'certificate' && !certificateFile) {
                    newErrors[field.name] = `${field.label} is required.`;
                }
            } else if (!formData[field.name]) {
                newErrors[field.name] = `${field.label} is required.`;
            }
        }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
        return;
    }
    
    if (certificateFile) {
        const reader = new FileReader();
        reader.readAsDataURL(certificateFile);
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          onSubmit(formData, base64String, certificateFile.type);
        };
        reader.onerror = (error) => {
          console.error("Error reading file:", error);
          setErrors({ form: "There was an error processing your file. Please try again." });
        }
    }
  };

  const handleReset = () => {
    setFormData(getInitialData());
    setCertificateFile(null);
    setErrors({});
    const fileInput = document.getElementById('6') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    try {
        localStorage.removeItem(SAVED_FORM_DATA_KEY);
    } catch (error) {
        console.error("Failed to clear saved form data", error);
    }
  };

  const renderField = (field: FormField) => {
    const commonProps = {
        name: field.name,
        id: field.id,
        required: field.required,
        className: "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 sm:text-sm",
        style: { borderColor: errors[field.name] ? 'red' : undefined, '--focus-ring-color': themeConfig.primaryColor } as React.CSSProperties,
    };
    
    switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
            return <input type={field.type} {...commonProps} value={formData[field.name] || ''} onChange={handleInputChange} placeholder={field.placeholder}/>;
        
        case 'year':
            const currentYear = new Date().getFullYear();
            const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);
            return (
                <select {...commonProps} value={formData[field.name] || ''} onChange={handleInputChange}>
                    <option value="">Select Year</option>
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
            );

        case 'select':
            if (field.optionsSource === 'colleges') {
                return (
                    <select {...commonProps} value={formData[field.name] || ''} onChange={handleInputChange}>
                        {colleges.map(college => (<option key={college.id} value={college.id}>{college.name}</option>))}
                    </select>
                );
            } else if (field.options && field.options.length > 0) {
                 return (
                    <select {...commonProps} value={formData[field.name] || ''} onChange={handleInputChange}>
                      <option value="">{field.placeholder || 'Select an option'}</option>
                      {field.options.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                );
            }
            return null; // Don't render select if no options are available

        case 'file':
            return (
                <div className="mt-1">
                    <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                            <div className="flex text-sm text-slate-600">
                                <label htmlFor={field.id} className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500" style={{'--tw-ring-color': themeConfig.primaryColor} as React.CSSProperties}>
                                    <span>Upload a file</span>
                                    <input id={field.id} name={field.name} type="file" className="sr-only" onChange={handleFileChange} accept="image/*,application/pdf" />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-slate-500">PDF, PNG, JPG up to 10MB. Please upload a high-resolution file in the correct orientation.</p>
                        </div>
                    </div>
                    {certificateFile && field.name === 'certificate' && <p className="mt-2 text-sm text-slate-500">File selected: {certificateFile.name}</p>}
                </div>
            )
        default:
            return null;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {formFields.map(field => field.type !== 'file' ? (
                <div key={field.id} className={ (field.name === 'collegeId' || field.type === 'select') ? 'md:col-span-2' : '' }>
                    <label htmlFor={field.id} className="block text-sm font-medium text-slate-700">{field.label}</label>
                    {renderField(field)}
                    {errors[field.name] && <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>}
                </div>
            ) : null)}
        </div>

        {formFields.map(field => field.type === 'file' ? (
            <div key={field.id}>
                <label className="block text-sm font-medium text-slate-700">{field.label}</label>
                {renderField(field)}
                {errors[field.name] && <p className="mt-2 text-sm text-red-600">{errors[field.name]}</p>}
            </div>
        ) : null)}

      {errors.form && <p className="text-sm text-red-600 text-center">{errors.form}</p>}
      
      <div className="pt-4 space-y-3">
        <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200"
        style={{backgroundColor: themeConfig.primaryColor, '--focus-ring-color': themeConfig.primaryColor} as React.CSSProperties} >
          Verify & Join
        </button>
        <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-slate-500 h-5">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Progress automatically saved.'}
            </div>
            <button type="button" onClick={handleReset} className="py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200" style={{'--focus-ring-color': themeConfig.primaryColor} as React.CSSProperties}>
                Reset Form
            </button>
        </div>
      </div>
      <style>{`
        input:focus, select:focus {
            border-color: var(--focus-ring-color);
            box-shadow: 0 0 0 1px var(--focus-ring-color);
        }
      `}</style>
    </form>
  );
};

export default GraduateForm;