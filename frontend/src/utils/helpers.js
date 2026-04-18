import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export const fmtCurrency = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (d) => {
  try { return format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy'); }
  catch { return d; }
};

export const fmtDateTime = (d) => {
  try { return format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy, hh:mm a'); }
  catch { return d; }
};

export const CATEGORIES = [
  { value: 'food',        label: 'Food',        emoji: '🍔', color: '#e05c5c' },
  { value: 'social_life', label: 'Social Life',  emoji: '🎉', color: '#9b6dff' },
  { value: 'transport',   label: 'Transport',    emoji: '🚗', color: '#4a9eff' },
  { value: 'education',   label: 'Education',    emoji: '📚', color: '#f0a500' },
  { value: 'clothing',    label: 'Clothing',     emoji: '👕', color: '#4caf82' },
  { value: 'health',      label: 'Health',       emoji: '❤️', color: '#ff6b9d' },
  { value: 'gifts',       label: 'Gifts',        emoji: '🎁', color: '#ff9f43' },
  { value: 'others',      label: 'Others',       emoji: '📦', color: '#6c757d' }
];

export const ACCOUNT_MODES = [
  { value: 'cash', label: 'Cash',  emoji: '💵' },
  { value: 'upi',  label: 'UPI',   emoji: '📱' },
  { value: 'card', label: 'Card',  emoji: '💳' }
];

export const getCategoryInfo = (value) =>
  CATEGORIES.find(c => c.value === value) || { label: value, emoji: '📦', color: '#6c757d' };

export const getModeInfo = (value) =>
  ACCOUNT_MODES.find(m => m.value === value) || { label: value, emoji: '💰' };

export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export const getWeekRange = (date) => ({
  start: startOfWeek(date, { weekStartsOn: 1 }),
  end: endOfWeek(date, { weekStartsOn: 1 })
});

export const getMonthRange = (date) => ({
  start: startOfMonth(date),
  end: endOfMonth(date)
});

export const GOAL_EMOJIS = ['🎯','💻','📺','🚗','✈️','🏠','💍','🎓','🏋️','📱','💰','🌴','🎸','📷'];
