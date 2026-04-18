import React, { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { transactionAPI } from '../services/api';
import { fmtCurrency, CATEGORIES, MONTH_NAMES } from '../utils/helpers';
import TransactionForm from '../components/Transactions/TransactionForm';
import TransactionCard from '../components/Transactions/TransactionCard';
import ConfirmModal from '../components/common/ConfirmModal';

const RADIAN = Math.PI / 180;

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="card flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-xl font-bold mt-0.5" style={{ color }}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-600 border border-dark-400 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-300 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmtCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [stats, setStats] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [deleteTx, setDeleteTx] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, txRes] = await Promise.all([
        transactionAPI.getStats({ month, year }),
        transactionAPI.getAll({ view: 'monthly', month, year })
      ]);
      setStats(statsRes.data);
      setRecentTx(txRes.data.slice(0, 8));
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await transactionAPI.delete(deleteTx.id);
      setDeleteTx(null);
      load();
    } finally { setDeleting(false); }
  };

  const summary = stats?.summary || {};
  const income = parseFloat(summary.total_income || 0);
  const expense = parseFloat(summary.total_expense || 0);
  const balance = income - expense;

  const pieData = (stats?.byCategory || []).map(c => {
    const info = CATEGORIES.find(x => x.value === c.category) || {};
    return { name: info.label || c.category, value: parseFloat(c.total), color: info.color || '#6c757d' };
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="bg-dark-600 border border-dark-400 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-blue">
              {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <span className="text-gray-500 text-sm">{year}</span>
          </div>
        </div>
        <button onClick={() => { setEditTx(null); setShowForm(true); }}
          className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Income" value={fmtCurrency(income)} icon={TrendingUp} color="#4a9eff"
          sub={`${summary.total_transactions || 0} transactions`} />
        <StatCard label="Expenses" value={fmtCurrency(expense)} icon={TrendingDown} color="#e05c5c" />
        <StatCard label="Balance" value={fmtCurrency(Math.abs(balance))} icon={Wallet}
          color={balance >= 0 ? '#4caf82' : '#e05c5c'}
          sub={balance >= 0 ? 'You saved this month 🎉' : 'Overspent this month'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily trend */}
        <div className="card">
          <h3 className="font-semibold mb-4">Daily Flow</h3>
          {stats?.byDay?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.byDay}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4a9eff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4a9eff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e05c5c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e05c5c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickFormatter={d => d?.slice(8)} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" stroke="#4a9eff" fill="url(#incGrad)" name="Income" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" stroke="#e05c5c" fill="url(#expGrad)" name="Expense" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">No data this month</div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="card">
          <h3 className="font-semibold mb-4">Spending by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="40%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" paddingAngle={3}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtCurrency(v)} />
                <Legend layout="vertical" align="right" verticalAlign="middle"
                  formatter={(v) => <span style={{ fontSize: 11, color: '#9ca3af' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">No expenses this month</div>
          )}
        </div>
      </div>

      {/* Monthly trend */}
      {stats?.monthlyTrend?.length > 1 && (
        <div className="card">
          <h3 className="font-semibold mb-4">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.monthlyTrend.map(m => ({
              ...m, label: `${MONTH_NAMES[m.month - 1]?.slice(0, 3)} ${String(m.year).slice(2)}`
            }))}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }}
                tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" fill="#4a9eff" name="Income" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="#e05c5c" name="Expense" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Transactions</h3>
          <button onClick={() => navigate('/transactions')}
            className="text-sm text-brand-blue hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </button>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-dark-600 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentTx.length > 0 ? (
          <div className="space-y-2">
            {recentTx.map(tx => (
              <TransactionCard key={tx.id} tx={tx}
                onEdit={t => { setEditTx(t); setShowForm(true); }}
                onDelete={t => setDeleteTx(t)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p className="text-3xl mb-2">💸</p>
            <p className="text-sm">No transactions this month</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">
              Add your first transaction
            </button>
          </div>
        )}
      </div>

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
          message={`Delete "${deleteTx.description}" for ${fmtCurrency(deleteTx.amount)}? This cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTx(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
