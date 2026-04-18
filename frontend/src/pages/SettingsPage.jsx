import React, { useState } from 'react';
import { Lock, LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const setPw = (k, v) => setPwForm(p => ({ ...p, [k]: v }));

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) return setPwError('All fields required');
    if (pwForm.newPassword.length < 6) return setPwError('New password must be at least 6 characters');
    if (pwForm.newPassword !== pwForm.confirm) return setPwError('Passwords do not match');
    setPwLoading(true); setPwError(''); setPwSuccess('');
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwSuccess('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    } finally { setPwLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-lg">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Profile */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-brand-purple/20 flex items-center justify-center text-brand-purple text-xl font-bold">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{user?.username}</p>
            <p className="text-sm text-gray-400">Single-user account</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Lock size={16} /> Change Password
        </h3>
        {pwError && <p className="text-sm text-red-400 mb-3">{pwError}</p>}
        {pwSuccess && <p className="text-sm text-brand-green mb-3">{pwSuccess}</p>}
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="label">Current Password</label>
            <input className="input" type="password" value={pwForm.currentPassword}
              onChange={e => setPw('currentPassword', e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label className="label">New Password</label>
            <input className="input" type="password" value={pwForm.newPassword}
              onChange={e => setPw('newPassword', e.target.value)} placeholder="Min. 6 characters" />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input className="input" type="password" value={pwForm.confirm}
              onChange={e => setPw('confirm', e.target.value)} placeholder="Repeat new password" />
          </div>
          <button type="submit" disabled={pwLoading} className="btn-primary w-full mt-2">
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* About */}
      <div className="card space-y-2">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Shield size={16} /> About</h3>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">App Name</span>
          <span>Where My Money Went</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Version</span>
          <span>1.0.0</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Currency</span>
          <span>INR (₹)</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Storage</span>
          <span>MySQL</span>
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}
