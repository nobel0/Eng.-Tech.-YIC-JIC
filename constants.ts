import { College, ThemeConfig, FormField } from './types';

export const INITIAL_COLLEGES: College[] = [
  {
    id: 'yic',
    name: 'Yanbu Industrial College',
    groupLink: 'https://t.me/yic_alumni_group',
  },
  {
    id: 'kfupm',
    name: 'King Fahd University of Petroleum and Minerals',
    groupLink: 'https://chat.whatsapp.com/kfupm_alumni',
  },
  {
    id: 'kau',
    name: 'King Abdulaziz University',
    groupLink: 'https://t.me/kau_alumni_official',
  },
];

export const INITIAL_THEME_CONFIG: ThemeConfig = {
    headerText: 'College Alumni Gateway',
    subHeaderText: 'Join your alumni community by verifying your graduation certificate.',
    primaryColor: '#4f46e5', // Indigo-600
    logo: '',
    successTitle: 'Verification Successful!',
    successMessage: "Welcome! We've confirmed you are a graduate of {collegeName}.",
    successIconColor: '#16a34a', // green-600
    successIconBackgroundColor: '#dcfce7', // green-100
    errorTitle: 'An Error Occurred',
    errorIconColor: '#dc2626', // red-600
    errorIconBackgroundColor: '#fee2e2', // red-100
};

export const INITIAL_FORM_FIELDS: FormField[] = [
    { id: '1', type: 'text', name: 'name', label: 'Full Name', required: true, placeholder: 'John Doe' },
    { id: '2', type: 'email', name: 'email', label: 'Email Address', required: true, placeholder: 'john.doe@example.com' },
    { id: '3', type: 'tel', name: 'phone', label: 'Phone Number', required: true, placeholder: '555-123-4567' },
    { id: '4', type: 'year', name: 'graduationYear', label: 'Graduation Year', required: true },
    { id: '5', type: 'select', name: 'collegeId', label: 'College Name', required: true, optionsSource: 'colleges' },
    { id: '6', type: 'file', name: 'certificate', label: 'Graduation Certificate', required: true },
];