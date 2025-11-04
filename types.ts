
export interface College {
  id: string;
  name: string;
  groupLink: string;
}

export type FormFieldType = 'text' | 'email' | 'tel' | 'year' | 'select' | 'file';

export interface FormField {
    id: string;
    type: FormFieldType;
    label: string;
    name: string; // The key used in the form data object
    required: boolean;
    placeholder?: string;
    // 'options' is only used for 'select' type fields
    // For the college selector, these options are the colleges list.
    optionsSource?: 'colleges'; 
    options?: string[]; // For custom select options
}

export interface FormData {
  [key: string]: any; // Allows for dynamic fields
}

export enum AppStatus {
  FORM = 'FORM',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  ADMIN_PANEL = 'ADMIN_PANEL',
}

export interface ThemeConfig {
    headerText: string;
    subHeaderText: string;
    primaryColor: string;
    logo: string; // base64 encoded image string
}

export interface Submission {
  id: string;
  timestamp: string;
  formData: FormData;
  matchedCollegeName: string;
}