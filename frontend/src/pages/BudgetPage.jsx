import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, PiggyBank, AlertTriangle } from 'lucide-react';
import { budgetAPI } from '../services/api';
import { fmtCurrency, CATEGORIES, MONTH_NAMES } from '../utils/helpers';
import ConfirmModal from '../components/common/ConfirmModal';

function BudgetBar({ spent, total }) {
  const pct = Math.min((spent / total) * 100, 100);
  const color = pct >= 100 ? '#e05c5c' : pct >= 75 ? '#f0a500' : '#4caf82';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{fmtCurrency(spent)} spent</span>
        <span>{fmtCurrency(Math.max(0, total - spent))} left</span>
      </div>
      <div className="h-2 bg-dark-500 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs text-gray-500 mt-1">{pct.toFixed(0)}% used</p>
    </div>
  );
}

function AddBudgetForm({ onAdd, existing }) {
  const now = new Date();
  const [form, setForm] = useState({
    type: 'monthly', month: now.getMonth() + 1,
    year: now.getFullYear(), category: 'food', amount: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter valid amount');
    setLoading(true); setError('');
    try { await onAdd(form); set('amount', ''); }
    catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Set Budget</h3>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          {['monthly', 'category'].map(t => (
            <button key={t} type="button" onClick={() => set('type', t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all capitalize
                ${form.type === t ? 'border-brand-blue bg-brand-blue/15 text-brand-blue' : 'border-dark-400 bg-dark-600 text-gray-400 hover:text-white'}`}>
              {t === 'monthly' ? '📅 Monthly' : '🏷️ Category'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {form.type === 'monthly' ? (
            <>
              <div>
                <label className="label">Month</label>
                <select className="select" value={form.month} onChange={e => set('month', Number(e.target.value))}>
                  {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <input className="input" type="number" value={form.year}
                  onChange={e => set('year', Number(e.target.value))} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="label">Category</label>
                <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <input className="input" type="number" value={form.year}
                  onChange={e => set('year', Number(e.target.value))} />
              </div>
            </>
          )}
        </div>

        <div>
          <label className="label">Budget Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
            <input className="input pl-7" type="number" step="0.01" min="1"
              placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          <Plus size={16} /> {loading ? 'Saving...' : 'Set Budget'}
        </button>
      </form>
    </div>
  );
}

export default function BudgetPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await budgetAPI.getAll({ month, year });
      setBudgets(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (form) => {
    await budgetAPI.create(form);
    load();
  };

  const handleDelete = async () => {
    setDeleting(confirmDel.id);
    try { await budgetAPI.delete(confirmDel.id); setConfirmDel(null); load(); }
    finally { setDeleting(null); }
  };

  const monthlyBudgets = budgets.filter(b => b.type === 'monthly');
  const categoryBudgets = budgets.filter(b => b.type === 'category');

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Budget</h1>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="bg-dark-600 border border-dark-400 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-blue">
          {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>

      <AddBudgetForm onAdd={handleAdd} />

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-dark-700 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {monthlyBudgets.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <PiggyBank size={16} /> Monthly Budgets
              </h3>
              <div className="space-y-3">
                {monthlyBudgets.map(b => (
                  <div key={b.id} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{MONTH_NAMES[b.month - 1]} {b.year}</p>
                        <p className="text-sm text-gray-400">Budget: {fmtCurrency(b.amount)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {b.spent > b.amount && (
                          <AlertTriangle size={16} className="text-brand-red" />
                        )}
                        <button onClick={() => setConfirmDel(b)} className="text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <BudgetBar spent={b.spent} total={b.amount} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {categoryBudgets.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-300 mb-3">Category Budgets</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categoryBudgets.map(b => {
                  const cat = CATEGORIES.find(c => c.value === b.category) || {};
                  return (
                    <div key={b.id} className="card">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{cat.emoji}</span>
                          <div>
                            <p className="font-medium text-sm">{cat.label}</p>
                            <p className="text-xs text-gray-400">{fmtCurrency(b.amount)}/month</p>
                          </div>
                        </div>
                        <button onClick={() => setConfirmDel(b)} className="text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <BudgetBar spent={b.spent} total={b.amount} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {budgets.length === 0 && (
            <div className="card text-center py-12">
              <PiggyBank size={40} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">No budgets set yet</p>
              <p className="text-gray-600 text-xs mt-1">Set a monthly or category budget above to get started</p>
            </div>
          )}
        </>
      )}

      {confirmDel && (
        <ConfirmModal title="Delete Budget" message="Remove this budget? Your transactions won't be affected."
          onConfirm={handleDelete} onClose={() => setConfirmDel(null)} loading={!!deleting} />
      )}
    </div>
  );
}
