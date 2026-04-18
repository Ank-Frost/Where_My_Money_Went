import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, CreditCard, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { subscriptionAPI } from '../services/api';
import { fmtCurrency, fmtDate } from '../utils/helpers';
import ConfirmModal from '../components/common/ConfirmModal';
import { differenceInDays, parseISO } from 'date-fns';

const SUB_ICONS = { Netflix: '🎬', Spotify: '🎵', YouTube: '▶️', Amazon: '📦', Disney: '🏰', Apple: '🍎' };

function daysUntil(dateStr) {
  return differenceInDays(parseISO(dateStr), new Date());
}

function urgencyColor(days) {
  if (days < 0) return '#e05c5c';
  if (days <= 1) return '#e05c5c';
  if (days <= 3) return '#f0a500';
  if (days <= 5) return '#9b6dff';
  return '#4caf82';
}

function SubForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', amount: '', billing_cycle: 'monthly',
    next_billing_date: '', category: 'entertainment', notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount || !form.next_billing_date) return setError('Fill all required fields');
    setLoading(true); setError('');
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
      <div className="bg-dark-700 rounded-2xl border border-dark-500 w-full max-w-md animate-slide-in">
        <div className="flex items-center justify-between p-5 border-b border-dark-500">
          <h2 className="text-lg font-semibold">{initial ? 'Edit Subscription' : 'Add Subscription'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <label className="label">Service Name *</label>
            <input className="input" placeholder="e.g. Netflix, Spotify" value={form.name}
              onChange={e => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input className="input pl-7" type="number" step="0.01" min="0.01"
                  placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Billing Cycle</label>
              <select className="select" value={form.billing_cycle} onChange={e => set('billing_cycle', e.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Next Billing Date *</label>
            <input className="input" type="date" value={form.next_billing_date}
              onChange={e => set('next_billing_date', e.target.value)} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" placeholder="Optional notes" value={form.notes}
              onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : initial ? 'Update' : 'Add Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSub, setEditSub] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await subscriptionAPI.getAll(); setSubs(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (editSub) await subscriptionAPI.update(editSub.id, form);
    else await subscriptionAPI.create(form);
    setEditSub(null); load();
  };

  const handleToggle = async (sub) => {
    await subscriptionAPI.update(sub.id, { ...sub, is_active: !sub.is_active });
    load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await subscriptionAPI.delete(confirmDel.id); setConfirmDel(null); load(); }
    finally { setDeleting(false); }
  };

  const active = subs.filter(s => s.is_active);
  const inactive = subs.filter(s => !s.is_active);
  const monthlyTotal = active.reduce((s, sub) => {
    const a = parseFloat(sub.amount);
    if (sub.billing_cycle === 'monthly') return s + a;
    if (sub.billing_cycle === 'yearly') return s + a / 12;
    if (sub.billing_cycle === 'weekly') return s + a * 4.33;
    return s;
  }, 0);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Subscriptions</h1>
        <button onClick={() => { setEditSub(null); setShowForm(true); }}
          className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add
        </button>
      </div>

      {active.length > 0 && (
        <div className="card bg-gradient-to-r from-brand-blue/10 to-brand-purple/10 border-brand-blue/30">
          <p className="text-xs text-gray-400 mb-1">Monthly spend</p>
          <p className="text-2xl font-bold text-white">{fmtCurrency(monthlyTotal)}</p>
          <p className="text-xs text-gray-500">{active.length} active subscription{active.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-dark-700 rounded-xl animate-pulse" />)}</div>
      ) : subs.length === 0 ? (
        <div className="card text-center py-12">
          <CreditCard size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No subscriptions yet</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">Add Subscription</button>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-300 mb-3">Active</h3>
              <div className="space-y-2">
                {active.map(sub => {
                  const days = daysUntil(sub.next_billing_date);
                  const color = urgencyColor(days);
                  const emoji = Object.entries(SUB_ICONS).find(([k]) => sub.name.includes(k))?.[1] || '📱';
                  return (
                    <div key={sub.id} className="card flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-dark-600 flex items-center justify-center text-xl flex-shrink-0">
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{sub.name}</p>
                          <span className="text-xs px-1.5 py-0.5 bg-dark-600 rounded-full text-gray-400 capitalize">{sub.billing_cycle}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color }}>
                          {days < 0 ? `Overdue by ${Math.abs(days)} days` : days === 0 ? 'Due TODAY' : `Due in ${days} day${days !== 1 ? 's' : ''}`}
                          {' · '}{fmtDate(sub.next_billing_date)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-sm">{fmtCurrency(sub.amount)}</p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <button onClick={() => { setEditSub(sub); setShowForm(true); }}
                            className="text-gray-500 hover:text-brand-blue p-1 transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => handleToggle(sub)}
                            className="text-gray-500 hover:text-brand-yellow p-1 transition-colors"><ToggleRight size={15} /></button>
                          <button onClick={() => setConfirmDel(sub)}
                            className="text-gray-500 hover:text-red-400 p-1 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-500 mb-3 text-sm">Paused</h3>
              <div className="space-y-2">
                {inactive.map(sub => (
                  <div key={sub.id} className="card opacity-50 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-dark-600 flex items-center justify-center text-xl">📱</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{sub.name}</p>
                      <p className="text-xs text-gray-500">{fmtCurrency(sub.amount)} / {sub.billing_cycle}</p>
                    </div>
                    <button onClick={() => handleToggle(sub)} className="text-gray-500 hover:text-brand-green transition-colors"><ToggleLeft size={18} /></button>
                    <button onClick={() => setConfirmDel(sub)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <SubForm initial={editSub} onSave={handleSave} onClose={() => { setShowForm(false); setEditSub(null); }} />
      )}
      {confirmDel && (
        <ConfirmModal title="Delete Subscription" message={`Delete "${confirmDel.name}" subscription?`}
          onConfirm={handleDelete} onClose={() => setConfirmDel(null)} loading={deleting} />
      )}
    </div>
  );
}
