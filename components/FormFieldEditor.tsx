import React, { useState, useEffect } from 'react';
import { FormField, FormFieldType } from '../types';

interface FormFieldEditorProps {
    field: FormField | null;
    onSave: (field: FormField) => void;
    onCancel: () => void;
}

const FormFieldEditor: React.FC<FormFieldEditorProps> = ({ field, onSave, onCancel }) => {
    const [editedField, setEditedField] = useState<Partial<FormField>>({});

    useEffect(() => {
        setEditedField(field ? { ...field } : { id: '', type: 'text', label: '', name: '', required: false, placeholder: '' });
    }, [field]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            setEditedField(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            let newName = editedField.name;
            // Auto-generate name from label, in camelCase
            if (name === 'label' && !field) { // Only auto-generate name for new fields
                newName = value.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
                    index === 0 ? word.toLowerCase() : word.toUpperCase()
                ).replace(/\s+/g, '');
            }
            setEditedField(prev => ({ ...prev, [name]: value, name: newName }));
        }
    };

    const handleSave = () => {
        if (!editedField.label) {
            alert('Label is required.');
            return;
        }
        onSave(editedField as FormField);
    };

    const fieldTypes: FormFieldType[] = ['text', 'email', 'tel', 'year', 'select', 'file'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
                <h2 className="text-xl font-bold text-slate-800">{field ? 'Edit Field' : 'Add New Field'}</h2>
                
                <div>
                    <label htmlFor="label" className="block text-sm font-medium text-slate-700">Label</label>
                    <input type="text" name="label" id="label" value={editedField.label || ''} onChange={handleChange} className="mt-1 input-field" />
                </div>

                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-slate-700">Field Type</label>
                    <select name="type" id="type" value={editedField.type || 'text'} onChange={handleChange} className="mt-1 input-field">
                        {fieldTypes.map(type => <option key={type} value={type} className="capitalize">{type}</option>)}
                    </select>
                </div>

                {editedField.type === 'select' && !field?.optionsSource && (
                    <div>
                        <label htmlFor="options" className="block text-sm font-medium text-slate-700">Options (comma-separated)</label>
                        <input 
                            type="text" 
                            name="options" 
                            id="options" 
                            value={(editedField.options || []).join(', ')} 
                            onChange={e => setEditedField(prev => ({...prev, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)}))} 
                            className="mt-1 input-field"
                            placeholder="Option 1, Option 2, Option 3"
                        />
                        <p className="mt-1 text-xs text-slate-500">This will not apply to the main College selector.</p>
                    </div>
                )}
                
                {editedField.type && ['text', 'email', 'tel'].includes(editedField.type) && (
                    <div>
                        <label htmlFor="placeholder" className="block text-sm font-medium text-slate-700">Placeholder Text</label>
                        <input type="text" name="placeholder" id="placeholder" value={editedField.placeholder || ''} onChange={handleChange} className="mt-1 input-field" />
                    </div>
                )}
                
                <div className="flex items-center">
                    <input type="checkbox" name="required" id="required" checked={editedField.required || false} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                    <label htmlFor="required" className="ml-2 block text-sm text-slate-900">Required Field</label>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button type="button" onClick={handleSave} className="btn-primary">Save Field</button>
                </div>
            </div>
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
       `}</style>
        </div>
    );
};

export default FormFieldEditor;