
import React, { useState } from 'react';
import { ThemeConfig } from '../types';

interface AdminLoginProps {
  onLogin: (password: string) => void;
  onCancel: () => void;
  themeConfig: ThemeConfig;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onCancel, themeConfig }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-slate-800">Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 sm:text-sm"
            style={{'--focus-ring-color': themeConfig.primaryColor} as React.CSSProperties}
            autoFocus
          />
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{'--focus-ring-color': themeConfig.primaryColor} as React.CSSProperties}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{backgroundColor: themeConfig.primaryColor, '--focus-ring-color': themeConfig.primaryColor} as React.CSSProperties}
            >
              Login
            </button>
          </div>
        </form>
      </div>
       <style>{`
        input:focus {
            border-color: var(--focus-ring-color);
            box-shadow: 0 0 0 1px var(--focus-ring-color);
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;
