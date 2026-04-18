import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, getISOWeek } from 'date-fns';
import { transactionAPI } from '../services/api';
import { fmtCurrency, fmtDate, MONTH_NAMES } from '../utils/helpers';
import TransactionCard from '../components/Transactions/TransactionCard';
import TransactionForm from '../components/Transactions/TransactionForm';
import ConfirmModal from '../components/common/ConfirmModal';

const VIEWS = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

function groupByDate(transactions) {
  const groups = {};
  for (const tx of transactions) {
    const d = tx.transaction_date?.slice(0, 10);
    if (!groups[d]) groups[d] = [];
    groups[d].push(tx);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function TransactionsPage() {
  const now = new Date();
  const [view, setView] = useState('Monthly');
  const [cursor, setCursor] = useState(now);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [deleteTx, setDeleteTx] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const getParams = useCallback(() => {
    const v = view.toLowerCase();
    if (v === 'daily') return { view: 'daily', date: format(cursor, 'yyyy-MM-dd') };
    if (v === 'weekly') return { view: 'weekly', week: getISOWeek(cursor), year: cursor.getFullYear() };
    if (v === 'monthly') return { view: 'monthly', month: cursor.getMonth() + 1, year: cursor.getFullYear() };
    return { view: 'yearly', year: cursor.getFullYear() };
  }, [view, cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transactionAPI.getAll(getParams());
      setTransactions(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [getParams]);

  useEffect(() => { load(); }, [load]);

  const navigate = (dir) => {
    const d = dir === 1 ? 1 : -1;
    if (view === 'Daily') setCursor(p => addDays(p, d));
    else if (view === 'Weekly') setCursor(p => addWeeks(p, d));
    else if (view === 'Monthly') setCursor(p => addMonths(p, d));
    else setCursor(p => addYears(p, d));
  };

  const getPeriodLabel = () => {
    if (view === 'Daily') return format(cursor, 'EEE, dd MMM yyyy');
    if (view === 'Weekly') {
      const start = format(cursor, 'dd MMM');
      return `Week ${getISOWeek(cursor)}, ${cursor.getFullYear()}`;
    }
    if (view === 'Monthly') return `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
    return String(cursor.getFullYear());
  };

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
  const groups = groupByDate(transactions);

  const handleDelete = async () => {
    setDeleting(true);
    try { await transactionAPI.delete(deleteTx.id); setDeleteTx(null); load(); }
    finally { setDeleting(false); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Transactions</h1>
        <button onClick={() => { setEditTx(null); setShowForm(true); }}
          className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add
        </button>
      </div>

      {/* View tabs */}
      <div className="flex bg-dark-700 rounded-xl p-1 gap-1">
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
              ${view === v ? 'bg-dark-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
            {v}
          </button>
        ))}
      </div>

      {/* Period navigator */}
      <div className="flex items-center justify-between bg-dark-700 rounded-xl px-4 py-3 border border-dark-500">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors p-1">
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold text-sm">{getPeriodLabel()}</span>
        <button onClick={() => navigate(1)} className="text-gray-400 hover:text-white transition-colors p-1">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Income</p>
          <p className="font-bold income-text">{fmtCurrency(income)}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Expense</p>
          <p className="font-bold expense-text">{fmtCurrency(expense)}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Total</p>
          <p className={`font-bold ${income - expense >= 0 ? 'income-text' : 'expense-text'}`}>
            {fmtCurrency(Math.abs(income - expense))}
          </p>
        </div>
      </div>

      {/* Transaction list grouped by date */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-dark-700 rounded-xl animate-pulse" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-400 text-sm">No transactions for this period</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">
            Add Transaction
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([date, txs]) => {
            const dayInc = txs.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
            const dayExp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-300">{fmtDate(date)}</span>
                    <span className="text-xs text-gray-500">({txs.length})</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    {dayInc > 0 && <span className="income-text">+{fmtCurrency(dayInc)}</span>}
                    {dayExp > 0 && <span className="expense-text">-{fmtCurrency(dayExp)}</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  {txs.map(tx => (
                    <TransactionCard key={tx.id} tx={tx}
                      onEdit={t => { setEditTx(t); setShowForm(true); }}
                      onDelete={t => setDeleteTx(t)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TransactionForm
          initial={editTx}
          onClose={() => { setShowForm(false); setEditTx(null); }}
          onSuccess={load}
        />
      )}
      {deleteTx && (
        <ConfirmModal
          title="Delete Transaction"
          message={`Delete "${deleteTx.description}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTx(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
