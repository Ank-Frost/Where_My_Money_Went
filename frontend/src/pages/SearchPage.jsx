import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { transactionAPI, tagAPI } from '../services/api';
import { CATEGORIES, ACCOUNT_MODES, fmtCurrency } from '../utils/helpers';
import TransactionCard from '../components/Transactions/TransactionCard';
import TransactionForm from '../components/Transactions/TransactionForm';
import ConfirmModal from '../components/common/ConfirmModal';
import { useDebounce } from '../utils/useDebounce';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [accountMode, setAccountMode] = useState('');
  const [tag, setTag] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [deleteTx, setDeleteTx] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedQ = useDebounce(q, 350);

  useEffect(() => {
    tagAPI.getAll().then(r => setAllTags(r.data)).catch(() => {});
  }, []);

  const doSearch = useCallback(async () => {
    const params = {};
    if (debouncedQ.trim()) params.q = debouncedQ.trim();
    if (category) params.category = category;
    if (accountMode) params.account_mode = accountMode;
    if (tag) params.tag = tag;
    if (type) params.type = type;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    if (!Object.keys(params).length) { setResults([]); setSearched(false); return; }

    setLoading(true); setSearched(true);
    try {
      const res = await transactionAPI.search(params);
      setResults(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [debouncedQ, category, accountMode, tag, type, startDate, endDate]);

  useEffect(() => { doSearch(); }, [doSearch]);

  const clearAll = () => {
    setQ(''); setCategory(''); setAccountMode(''); setTag('');
    setType(''); setStartDate(''); setEndDate('');
    setResults([]); setSearched(false);
  };

  const income = results.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
  const expense = results.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);

  const handleDelete = async () => {
    setDeleting(true);
    try { await transactionAPI.delete(deleteTx.id); setDeleteTx(null); doSearch(); }
    finally { setDeleting(false); }
  };

  const hasFilters = category || accountMode || tag || type || startDate || endDate;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h1 className="text-xl font-bold">Search</h1>

      {/* Search bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input className="input pl-10 pr-10" placeholder="Search by description..."
          value={q} onChange={e => setQ(e.target.value)} />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowFilters(p => !p)}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all
            ${hasFilters ? 'border-brand-blue text-brand-blue bg-brand-blue/10' : 'border-dark-400 text-gray-400 hover:text-white hover:border-dark-300'}`}>
          <Filter size={14} />
          Filters {hasFilters && `(active)`}
        </button>
        {(hasFilters || q) && (
          <button onClick={clearAll} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1">
            <X size={14} /> Clear all
          </button>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card space-y-4 animate-slide-in">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="select" value={type} onChange={e => setType(e.target.value)}>
                <option value="">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select className="select" value={accountMode} onChange={e => setAccountMode(e.target.value)}>
                <option value="">All modes</option>
                {ACCOUNT_MODES.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tag</label>
              <select className="select" value={tag} onChange={e => setTag(e.target.value)}>
                <option value="">All tags</option>
                {allTags.map(t => <option key={t.id} value={t.name}>#{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">From Date</label>
              <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">To Date</label>
              <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-dark-700 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!loading && searched && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''}</span>
            <div className="flex gap-4">
              {income > 0 && <span className="income-text">+{fmtCurrency(income)}</span>}
              {expense > 0 && <span className="expense-text">-{fmtCurrency(expense)}</span>}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-gray-400 text-sm">No transactions found</p>
              <p className="text-gray-600 text-xs mt-1">Try different search terms or filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map(tx => (
                <TransactionCard key={tx.id} tx={tx}
                  onEdit={t => setEditTx(t)}
                  onDelete={t => setDeleteTx(t)} />
              ))}
            </div>
          )}
        </>
      )}

      {!searched && !loading && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-400 text-sm">Search your transactions</p>
          <p className="text-gray-600 text-xs mt-1">By description, tag, category, mode, or date range</p>
        </div>
      )}

      {editTx && (
        <TransactionForm initial={editTx} onClose={() => setEditTx(null)} onSuccess={doSearch} />
      )}
      {deleteTx && (
        <ConfirmModal title="Delete Transaction" message={`Delete "${deleteTx.description}"?`}
          onConfirm={handleDelete} onClose={() => setDeleteTx(null)} loading={deleting} />
      )}
    </div>
  );
}
