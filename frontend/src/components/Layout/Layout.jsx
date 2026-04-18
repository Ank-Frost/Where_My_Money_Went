import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Search, PiggyBank,
  Users, CreditCard, Target, Bell, Settings, LogOut,
  Menu, X, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',     end: true },
  { to: '/transactions',  icon: ArrowLeftRight,  label: 'Transactions' },
  { to: '/search',        icon: Search,          label: 'Search' },
  { to: '/budget',        icon: PiggyBank,       label: 'Budget' },
  { to: '/split',         icon: Users,           label: 'Split' },
  { to: '/subscriptions', icon: CreditCard,      label: 'Subscriptions' },
  { to: '/goals',         icon: Target,          label: 'Goals' },
];

export default function Layout() {
  const { logout, user } = useAuth();
  const { unreadCount } = useNotifications() || {};
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavItem = ({ item }) => (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
        ${isActive
          ? 'bg-brand-blue/15 text-brand-blue border border-brand-blue/30'
          : 'text-gray-400 hover:bg-dark-600 hover:text-white'}`
      }
    >
      <item.icon size={18} />
      <span>{item.label}</span>
    </NavLink>
  );

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-dark-800 border-r border-dark-500">
      {/* Logo */}
      <div className="p-4 border-b border-dark-500">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-blue/20 rounded-lg flex items-center justify-center text-brand-blue font-bold text-lg">₹</div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">Where My</p>
            <p className="text-xs font-bold text-brand-blue leading-tight">Money Went</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => <NavItem key={item.to} item={item} />)}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-dark-500 space-y-1">
        <NavLink
          to="/notifications"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
            ${isActive ? 'bg-brand-blue/15 text-brand-blue border border-brand-blue/30' : 'text-gray-400 hover:bg-dark-600 hover:text-white'}`
          }
        >
          <div className="relative">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="ml-auto bg-brand-red text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </NavLink>

        <NavLink
          to="/settings"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
            ${isActive ? 'bg-brand-blue/15 text-brand-blue border border-brand-blue/30' : 'text-gray-400 hover:bg-dark-600 hover:text-white'}`
          }
        >
          <Settings size={18} /><span>Settings</span>
        </NavLink>

        <div className="px-3 py-2 flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-purple/20 rounded-full flex items-center justify-center text-brand-purple text-xs font-bold">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm text-gray-300 flex-1 truncate">{user?.username}</span>
          <button onClick={handleLogout} className="text-gray-500 hover:text-brand-red transition-colors" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="flex w-56 flex-shrink-0">
        <div className="w-full"><Sidebar /></div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 z-10">
            <Sidebar />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header - hidden since sidebar always shows */}
        <div className="hidden lg:flex items-center gap-3 px-4 py-3 bg-dark-800 border-b border-dark-500">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <Menu size={22} />
          </button>
          <span className="text-sm font-bold text-brand-blue">Where My Money Went</span>
          <div className="ml-auto flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={() => navigate('/notifications')} className="relative text-gray-400 hover:text-white">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
