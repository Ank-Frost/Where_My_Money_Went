import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { transactionAPI, tagAPI } from '../../services/api';
import { CATEGORIES, ACCOUNT_MODES } from '../../utils/helpers';
import { format } from 'date-fns';

const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  description: '',
  category: 'food',
  account_mode: 'upi',
  transaction_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  tags: []
};

export default function TransactionForm({ onClose, onSuccess, initial = null }) {
  const [form, setForm] = useState(initial ? {
    ...initial,
    transaction_date: format(new Date(initial.transaction_date), "yyyy-MM-dd'T'HH:mm"),
    tags: initial.tags || []
  } : EMPTY_FORM);
  const [tagInput, setTagInput] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tagRef = useRef(null);

  useEffect(() => {
    tagAPI.getAll().then(r => setAllTags(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tagInput.trim().length > 0) {
      const q = tagInput.toLowerCase();
      setTagSuggestions(
        allTags.filter(t => t.name.toLowerCase().includes(q) && !form.tags.includes(t.name)).slice(0, 6)
      );
    } else {
      setTagSuggestions([]);
    }
  }, [tagInput, allTags, form.tags]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addTag = (name) => {
    const trimmed = name.trim();
    if (!trimmed || form.tags.includes(trimmed)) return;
    set('tags', [...form.tags, trimmed]);
    setTagInput('');
    setTagSuggestions([]);
  };

  const removeTag = (t) => set('tags', form.tags.filter(x => x !== t));

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      return setError('Enter a valid amount');
    }
    if (!form.description.trim()) return setError('Description is required');
    setLoading(true); setError('');
    try {
      if (initial) {
        await transactionAPI.update(initial.id, form);
      } else {
        await transactionAPI.create(form);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
      <div className="bg-dark-700 rounded-2xl border border-dark-500 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-500">
          <h2 className="text-lg font-semibold">{initial ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg bg-dark-600 p-1 gap-1">
            {['income', 'expense'].map(t => (
              <button key={t} type="button"
                onClick={() => set('type', t)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all capitalize
                  ${form.type === t
                    ? t === 'income'
                      ? 'bg-brand-blue text-white shadow'
                      : 'bg-brand-red text-white shadow'
                    : 'text-gray-400 hover:text-white'}`}>
                {t === 'income' ? '+ Income' : '- Expense'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="label">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input className="input pl-7 text-lg font-semibold" type="number" step="0.01" min="0.01"
                placeholder="0.00" value={form.amount}
                onChange={e => set('amount', e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <input className="input" placeholder="What was this for?" value={form.description}
              onChange={e => set('description', e.target.value)} />
          </div>

          {/* Date & Time */}
          <div>
            <label className="label">Date & Time</label>
            <input className="input" type="datetime-local" value={form.transaction_date}
              onChange={e => set('transaction_date', e.target.value)} />
          </div>

          {/* Category */}
          <div>
            <label className="label">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button"
                  onClick={() => set('category', cat.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all
                    ${form.category === cat.value
                      ? 'border-brand-blue bg-brand-blue/15 text-brand-blue'
                      : 'border-dark-400 bg-dark-600 text-gray-400 hover:border-dark-300 hover:text-white'}`}>
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-center leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Account Mode */}
          <div>
            <label className="label">Payment Mode</label>
            <div className="flex gap-2">
              {ACCOUNT_MODES.map(m => (
                <button key={m.value} type="button"
                  onClick={() => set('account_mode', m.value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all
                    ${form.account_mode === m.value
                      ? 'border-brand-blue bg-brand-blue/15 text-brand-blue'
                      : 'border-dark-400 bg-dark-600 text-gray-400 hover:border-dark-300 hover:text-white'}`}>
                  <span>{m.emoji}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags (optional)</label>
            <div className="relative">
              <div className="input flex flex-wrap gap-1.5 min-h-[42px] cursor-text"
                onClick={() => tagRef.current?.focus()}>
                {form.tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-purple/20 border border-brand-purple/40 rounded-full text-xs text-brand-purple">
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-white ml-0.5">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input ref={tagRef}
                  className="bg-transparent outline-none text-sm flex-1 min-w-[100px] placeholder-gray-500"
                  placeholder={form.tags.length ? '' : 'Type and press Enter...'}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown} />
              </div>

              {/* Tag suggestions */}
              {tagSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-dark-600 border border-dark-400 rounded-lg z-10 overflow-hidden shadow-xl">
                  <p className="text-xs text-gray-500 px-3 py-1.5 border-b border-dark-500">Previously used tags</p>
                  {tagSuggestions.map(t => (
                    <button key={t.id} type="button"
                      onClick={() => addTag(t.name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-dark-500 flex items-center gap-2">
                      <Tag size={12} className="text-brand-purple" />
                      <span>#{t.name}</span>
                      <span className="ml-auto text-xs text-gray-500">used {t.use_count}×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recent tags quick-add */}
            {allTags.length > 0 && form.tags.length === 0 && tagInput === '' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {allTags.slice(0, 8).map(t => (
                  <button key={t.id} type="button" onClick={() => addTag(t.name)}
                    className="text-xs px-2 py-1 bg-dark-600 border border-dark-400 rounded-full text-gray-400 hover:text-brand-purple hover:border-brand-purple/40 transition-colors">
                    + #{t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading}
              className={`flex-1 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50
                ${form.type === 'income' ? 'bg-brand-blue hover:bg-blue-500 text-white' : 'bg-brand-red hover:bg-red-500 text-white'}`}>
              {loading ? 'Saving...' : initial ? 'Update' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
