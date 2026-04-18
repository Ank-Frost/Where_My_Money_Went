import React, { useState, useEffect } from 'react';
import { Plus, Users, UserPlus, Layers, X } from 'lucide-react';
import { splitGroupAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { fmtCurrency } from '../utils/helpers';

export default function SplitPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('shared');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Form states
  const [groupForm, setGroupForm] = useState({ name: '', description: '', members: [] });
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'food',
    whoPaid: '',
    splits: []
  });
  const [memberForm, setMemberForm] = useState({ userId: '' });
  const [formError, setFormError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchGroups();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (userSearch.trim()) {
      userAPI.search(userSearch.trim()).then(res => setSearchResults(res.data)).catch(console.error);
    } else {
      setSearchResults([]);
    }
  }, [userSearch]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await splitGroupAPI.getAll();
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await userAPI.getAll();
      setAllUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchGroupDetails = async (groupId) => {
    try {
      const [expensesRes, balancesRes] = await Promise.all([
        splitGroupAPI.getExpenses(groupId),
        splitGroupAPI.getBalance(groupId)
      ]);
      setExpenses(expensesRes.data);
      setBalances(balancesRes.data);
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) {
      setFormError('Group name is required');
      return;
    }
    try {
      await splitGroupAPI.create({
        name: groupForm.name,
        description: groupForm.description,
        memberIds: groupForm.members
      });
      setGroupForm({ name: '', description: '', members: [] });
      setShowCreateGroup(false);
      setFormError('');
      fetchGroups();
    } catch (error) {
      setFormError(error.response?.data?.error || 'Failed to create group');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.description.trim() || !expenseForm.amount || expenseForm.splits.length === 0) {
      setFormError('Fill description, amount, and select 2+ members for splits');
      return;
    }
    try {
      const splitsData = expenseForm.splits.map(split => ({
        userId: split.userId,
        amount: parseFloat(split.amount) || 0
      })).filter(s => s.amount > 0);

      if (splitsData.length === 0) {
        setFormError('Add at least one member with an amount');
        return;
      }
      
      await splitGroupAPI.addExpense(selectedGroup.id, {
        groupId: selectedGroup.id,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        splits: splitsData
      });
      setExpenseForm({ description: '', amount: '', category: 'food', whoPaid: '', splits: [] });
      setShowAddExpense(false);
      setFormError('');
      fetchGroupDetails(selectedGroup.id);
    } catch (error) {
      setFormError(error.response?.data?.error || 'Failed to add expense');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberForm.userId) {
      setFormError('Select a member');
      return;
    }
    try {
      await splitGroupAPI.addMember(selectedGroup.id, memberForm.userId);
      setMemberForm({ userId: '' });
      setShowAddMember(false);
      setFormError('');
      fetchGroupDetails(selectedGroup.id);
      fetchGroups();
    } catch (error) {
      setFormError(error.response?.data?.error || 'Failed to add member');
    }
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    fetchGroupDetails(group.id);
  };

  const toggleMember = (userId) => {
    setGroupForm(prev => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter(id => id !== userId)
        : [...prev.members, userId]
    }));
  };

  const toggleExpenseSplit = (userId) => {
    setExpenseForm(prev => {
      const existing = prev.splits.find(s => s.userId === userId);
      if (existing) {
        return {
          ...prev,
          splits: prev.splits.filter(s => s.userId !== userId)
        };
      }
      return {
        ...prev,
        splits: [...prev.splits, { userId, amount: '' }]
      };
    });
  };

  const updateExpenseSplit = (userId, amount) => {
    setExpenseForm(prev => ({
      ...prev,
      splits: prev.splits.map(s =>
        s.userId === userId ? { ...s, amount: parseFloat(amount) || '' } : s
      )
    }));
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={28} /> Split Expenses
        </h1>
        <button
          onClick={() => setShowCreateGroup(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> New Group
        </button>
      </div>

      <div className="flex gap-2 bg-dark-700 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('shared')}
          className={`px-4 py-2 rounded font-medium transition-all ${
            tab === 'shared'
              ? 'bg-dark-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Shared Groups
        </button>
      </div>

      {tab === 'shared' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-bold mb-4">Your Groups</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-dark-600 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="card text-center py-8 text-gray-400">
                <Layers size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No groups yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectGroup(group)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedGroup?.id === group.id
                        ? 'bg-brand-blue/15 border-brand-blue text-white'
                        : 'bg-dark-600 border-dark-500 hover:bg-dark-500'
                    }`}
                  >
                    <div className="font-semibold text-sm">{group.name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {group.member_count} members
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedGroup && (
            <div className="lg:col-span-3 space-y-4">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{selectedGroup.name}</h3>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="text-sm btn-secondary flex items-center gap-1"
                  >
                    <UserPlus size={14} /> Add Member
                  </button>
                </div>
                {selectedGroup.description && (
                  <p className="text-sm text-gray-400 mb-4">{selectedGroup.description}</p>
                )}
              </div>

              {balances.length > 0 && (
                <div className="card">
                  <h3 className="font-bold mb-4">Settlement Status</h3>
                  <div className="space-y-3">
                    {balances.map(balance => {
                      const isPositive = balance.balance > 0;
                      return (
                        <div key={balance.userId} className="flex items-center justify-between p-3 bg-dark-600 rounded-lg">
                          <div>
                            <p className="font-semibold text-sm">{balance.username}</p>
                            <p className="text-xs text-gray-400">
                              Paid: {fmtCurrency(balance.paid)} | Owes: {fmtCurrency(balance.owes)}
                            </p>
                          </div>
                          <p className={`font-bold text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{fmtCurrency(balance.balance)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowAddExpense(true)}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Add Expense
              </button>

              {expenses.length > 0 && (
                <div className="card">
                  <h3 className="font-bold mb-4">Recent Expenses</h3>
                  <div className="space-y-3">
                    {expenses.map(expense => (
                      <div key={expense.id} className="border border-dark-500 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-sm">{expense.description}</p>
                            <p className="text-xs text-gray-400">
                              Paid by {expense.paid_by_name}
                            </p>
                          </div>
                          <p className="font-bold text-green-400">{fmtCurrency(expense.amount)}</p>
                        </div>
                        {expense.splits && (
                          <div className="text-xs text-gray-400 space-y-1 mt-2">
                            {expense.splits.map(split => (
                              <div key={split.id} className="flex justify-between">
                                <span>{split.username}</span>
                                <span>{fmtCurrency(split.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-dark-700 rounded-xl border border-dark-500 w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-dark-500">
              <h2 className="text-lg font-bold">Create Split Group</h2>
              <button onClick={() => setShowCreateGroup(false)}>
                <X size={20} className="text-gray-400 hover:text-white" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
              {formError && <p className="text-sm text-red-400">{formError}</p>}
              <div>
                <label className="label">Group Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Trip to Goa"
                  value={groupForm.name}
                  onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  placeholder="Optional description"
                  value={groupForm.description}
                  onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div>
                <label className="label">Search & Add Members</label>
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="input mb-2"
                />
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(userSearch.trim() ? searchResults : []).map(u => (
                    <label key={u.id} className="flex items-center p-2 hover:bg-dark-600 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupForm.members.includes(u.id)}
                        onChange={() => toggleMember(u.id)}
                        className="mr-3"
                      />
                      <span className="text-sm">{u.username}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 btn-primary">Create Group</button>
                <button type="button" onClick={() => setShowCreateGroup(false)} className="flex-1 btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExpense && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-dark-700 rounded-xl border border-dark-500 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-dark-500">
              <h2 className="text-lg font-bold">Add Expense</h2>
              <button onClick={() => setShowAddExpense(false)}>
                <X size={20} className="text-gray-400 hover:text-white" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-5 space-y-4">
              {formError && <p className="text-sm text-red-400">{formError}</p>}
              <div>
                <label className="label">Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Hotel booking"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="select"
                  >
                    <option value="food">Food</option>
                    <option value="transport">Transport</option>
                    <option value="accommodation">Accommodation</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="others">Others</option>
                  </select>
                </div>
              </div>
              <div className="text-xs text-gray-400 p-2 bg-dark-600 rounded">
                💡 You will be marked as the payer. Select members below to split the expense.
              </div>
              <div>
                <label className="label">Split between *</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {balances.map(member => (
                    <div key={member.userId} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={expenseForm.splits.some(s => s.userId === member.userId)}
                        onChange={() => toggleExpenseSplit(member.userId)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm flex-1">{member.username}</span>
                      {expenseForm.splits.some(s => s.userId === member.userId) && (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={
                            expenseForm.splits.find(s => s.userId === member.userId)?.amount || ''
                          }
                          onChange={e => updateExpenseSplit(member.userId, e.target.value)}
                          className="input w-24"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 btn-primary">Add Expense</button>
                <button type="button" onClick={() => setShowAddExpense(false)} className="flex-1 btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMember && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-dark-700 rounded-xl border border-dark-500 w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-dark-500">
              <h2 className="text-lg font-bold">Add Member</h2>
              <button onClick={() => setShowAddMember(false)}>
                <X size={20} className="text-gray-400 hover:text-white" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="p-5 space-y-4">
              {formError && <p className="text-sm text-red-400">{formError}</p>}
              <div>
                <label className="label">Select User *</label>
                <select
                  value={memberForm.userId}
                  onChange={e => setMemberForm({ userId: e.target.value })}
                  className="select"
                >
                  <option value="">Choose a user...</option>
                  {allUsers
                    .filter(u => !balances.some(b => b.userId === u.id))
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 btn-primary">Add Member</button>
                <button type="button" onClick={() => setShowAddMember(false)} className="flex-1 btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
