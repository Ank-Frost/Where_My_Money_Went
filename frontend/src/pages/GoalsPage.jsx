import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Target, Trash2, Pencil, X, ChevronDown } from 'lucide-react';
import { goalAPI } from '../services/api';
import { fmtCurrency, fmtDate, GOAL_EMOJIS } from '../utils/helpers';
import ConfirmModal from '../components/common/ConfirmModal';

function ProgressBar({ current, target }) {
  const pct = Math.min((current / target) * 100, 100);
  const color = pct >= 100 ? '#4caf82' : pct >= 75 ? '#4a9eff' : pct >= 50 ? '#9b6dff' : '#f0a500';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>{fmtCurrency(current)}</span>
        <span>{pct.toFixed(0)}%</span>
        <span>{fmtCurrency(target)}</span>
      </div>
      <div className="h-2.5 bg-dark-500 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function GoalForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', target_amount: '', deadline: '', emoji: '🎯' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.target_amount || Number(form.target_amount) <= 0) return setError('Name and valid target amount required');
    setLoading(true); setError('');
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
      <div className="bg-dark-700 rounded-2xl border border-dark-500 w-full max-w-md animate-slide-in">
        <div className="flex items-center justify-between p-5 border-b border-dark-500">
          <h2 className="text-lg font-semibold">{initial ? 'Edit Goal' : 'New Goal'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <label className="label">Icon</label>
            <div className="relative">
              <button type="button" onClick={() => setShowEmojis(p => !p)}
                className="w-14 h-14 text-3xl rounded-xl bg-dark-600 border border-dark-400 hover:border-dark-300 transition-colors flex items-center justify-center">
                {form.emoji}
              </button>
              {showEmojis && (
                <div className="absolute top-16 left-0 bg-dark-600 border border-dark-400 rounded-xl p-3 z-10 grid grid-cols-7 gap-1 shadow-xl">
                  {GOAL_EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => { set('emoji', e); setShowEmojis(false); }}
                      className="w-9 h-9 text-xl rounded-lg hover:bg-dark-500 flex items-center justify-center transition-colors">
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="label">Goal Name *</label>
            <input className="input" placeholder="e.g. New Laptop, Emergency Fund" value={form.name}
              onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Target Amount (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <input className="input pl-7" type="number" step="0.01" min="1"
                placeholder="0.00" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Target Date (optional)</label>
            <input className="input" type="date" value={form.deadline || ''}
              onChange={e => set('deadline', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : initial ? 'Update' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AllocateModal({ goals, onAllocate, onClose }) {
  const [totalAmount, setTotalAmount] = useState('');
  const [allocations, setAllocations] = useState(goals.filter(g => g.current_amount < g.target_amount).map(g => ({ goal_id: g.id, amount: '', note: '', goal: g })));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateAlloc = (i, k, v) => {
    setAllocations(p => { const a = [...p]; a[i] = { ...a[i], [k]: v }; return a; });
  };

  const totalAllocated = allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const remaining = (parseFloat(totalAmount) || 0) - totalAllocated;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = allocations.filter(a => a.amount && parseFloat(a.amount) > 0);
    if (!valid.length) return setError('Allocate to at least one goal');
    setLoading(true); setError('');
    try {
      await onAllocate({ allocations: valid.map(a => ({ goal_id: a.goal_id, amount: parseFloat(a.amount), note: a.note })) });
      onClose();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
      <div className="bg-dark-700 rounded-2xl border border-dark-500 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-in">
        <div className="flex items-center justify-between p-5 border-b border-dark-500">
          <h2 className="text-lg font-semibold">Allocate Savings to Goals</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <label className="label">Total Amount Available (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <input className="input pl-7 text-lg font-semibold" type="number" step="0.01" min="0.01"
                placeholder="0.00" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
            </div>
            {totalAmount && (
              <div className={`mt-1 text-xs ${remaining < 0 ? 'text-red-400' : remaining === 0 ? 'text-brand-green' : 'text-gray-400'}`}>
                {remaining < 0 ? `Over-allocated by ${fmtCurrency(Math.abs(remaining))}` :
                 remaining === 0 ? '✅ Fully allocated' :
                 `${fmtCurrency(remaining)} unallocated`}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {allocations.map((a, i) => {
              const pct = (a.goal.current_amount / a.goal.target_amount) * 100;
              const needed = a.goal.target_amount - a.goal.current_amount;
              return (
                <div key={a.goal_id} className="bg-dark-600 rounded-xl p-4 border border-dark-400">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{a.goal.emoji}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{a.goal.name}</p>
                      <p className="text-xs text-gray-500">{pct.toFixed(0)}% complete · needs {fmtCurrency(needed)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                      <input className="input pl-6 text-sm" type="number" step="0.01" min="0"
                        placeholder="0.00" value={a.amount}
                        onChange={e => updateAlloc(i, 'amount', e.target.value)} />
                    </div>
                    {totalAmount && (
                      <button type="button"
                        onClick={() => updateAlloc(i, 'amount', Math.min(needed, parseFloat(totalAmount) || 0).toFixed(2))}
                        className="text-xs text-brand-blue hover:underline px-2 flex-shrink-0">
                        Max
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || remaining < 0} className="btn-success flex-1">
              {loading ? 'Allocating...' : 'Allocate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [showAllocate, setShowAllocate] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await goalAPI.getAll(); setGoals(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (editGoal) await goalAPI.update(editGoal.id, form);
    else await goalAPI.create(form);
    setEditGoal(null); load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await goalAPI.delete(confirmDel.id); setConfirmDel(null); load(); }
    finally { setDeleting(false); }
  };

  const totalTarget = goals.reduce((s, g) => s + parseFloat(g.target_amount), 0);
  const totalSaved = goals.reduce((s, g) => s + parseFloat(g.current_amount), 0);
  const completed = goals.filter(g => parseFloat(g.current_amount) >= parseFloat(g.target_amount));
  const active = goals.filter(g => parseFloat(g.current_amount) < parseFloat(g.target_amount));

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Goals</h1>
        <div className="flex gap-2">
          {goals.length > 0 && (
            <button onClick={() => setShowAllocate(true)} className="btn-secondary flex items-center gap-2 text-sm">
              💰 Allocate
            </button>
          )}
          <button onClick={() => { setEditGoal(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Goal
          </button>
        </div>
      </div>

      {goals.length > 0 && (
        <div className="card bg-gradient-to-r from-brand-purple/10 to-brand-blue/10 border-brand-purple/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400">Total Saved</p>
              <p className="text-2xl font-bold text-white">{fmtCurrency(totalSaved)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Target</p>
              <p className="text-lg font-semibold text-gray-300">{fmtCurrency(totalTarget)}</p>
            </div>
          </div>
          <ProgressBar current={totalSaved} target={totalTarget || 1} />
          <p className="text-xs text-gray-500 mt-2">{completed.length}/{goals.length} goals completed</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-dark-700 rounded-xl animate-pulse" />)}</div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-12">
          <Target size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No goals yet</p>
          <p className="text-gray-600 text-xs mt-1">Set financial goals and track your progress</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">Create First Goal</button>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-300 mb-3">In Progress</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {active.map(goal => (
                  <div key={goal.id} className="card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{goal.emoji}</span>
                        <div>
                          <p className="font-medium text-sm">{goal.name}</p>
                          {goal.deadline && <p className="text-xs text-gray-500">By {fmtDate(goal.deadline)}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditGoal(goal); setShowForm(true); }}
                          className="p-1 text-gray-500 hover:text-brand-blue transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => setConfirmDel(goal)}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <ProgressBar current={parseFloat(goal.current_amount)} target={parseFloat(goal.target_amount)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h3 className="font-semibold text-brand-green mb-3 flex items-center gap-2">
                ✅ Completed ({completed.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {completed.map(goal => (
                  <div key={goal.id} className="card border-brand-green/30 opacity-80">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{goal.emoji}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{goal.name}</p>
                        <p className="text-xs text-brand-green">{fmtCurrency(goal.target_amount)} — completed! 🎉</p>
                      </div>
                      <button onClick={() => setConfirmDel(goal)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <GoalForm initial={editGoal} onSave={handleSave} onClose={() => { setShowForm(false); setEditGoal(null); }} />
      )}

      {showAllocate && (
        <AllocateModal goals={goals.filter(g => parseFloat(g.current_amount) < parseFloat(g.target_amount))}
          onAllocate={async (data) => { await goalAPI.allocate(data); load(); }}
          onClose={() => setShowAllocate(false)} />
      )}

      {confirmDel && (
        <ConfirmModal title="Delete Goal" message={`Delete "${confirmDel.name}"? All allocation history will be lost.`}
          onConfirm={handleDelete} onClose={() => setConfirmDel(null)} loading={deleting} />
      )}
    </div>
  );
}
