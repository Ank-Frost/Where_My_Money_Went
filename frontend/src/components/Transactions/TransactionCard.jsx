import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { fmtCurrency, fmtDateTime, getCategoryInfo, getModeInfo } from '../../utils/helpers';

export default function TransactionCard({ tx, onEdit, onDelete }) {
  const cat = getCategoryInfo(tx.category);
  const mode = getModeInfo(tx.account_mode);

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-700 border border-dark-500 hover:border-dark-400 transition-colors group">
      {/* Category icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: cat.color + '22', border: `1px solid ${cat.color}44` }}>
        {cat.emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{tx.description}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{fmtDateTime(tx.transaction_date)}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-dark-600 text-gray-400">{mode.emoji} {mode.label}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cat.color + '22', color: cat.color }}>
            {cat.emoji} {cat.label}
          </span>
        </div>
        {tx.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tx.tags.map(t => (
              <span key={t} className="text-xs px-1.5 py-0.5 bg-brand-purple/15 border border-brand-purple/30 rounded-full text-brand-purple">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Amount + actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`text-base font-bold ${tx.type === 'income' ? 'income-text' : 'expense-text'}`}>
          {tx.type === 'income' ? '+' : '-'}{fmtCurrency(tx.amount)}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(tx)}
            className="p-1 text-gray-500 hover:text-brand-blue rounded transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(tx)}
            className="p-1 text-gray-500 hover:text-brand-red rounded transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
