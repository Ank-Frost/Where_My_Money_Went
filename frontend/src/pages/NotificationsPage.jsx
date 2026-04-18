import React from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { fmtDateTime } from '../utils/helpers';

const TYPE_ICONS = {
  budget: '💰', budget_category: '🏷️', budget_reminder: '📊',
  subscription: '📅', goal: '🎯', default: '🔔'
};

export default function NotificationsPage() {
  const { notifications, markRead, markAllRead, snooze, unreadCount } = useNotifications() || {};
  if (!notifications) return null;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-400">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary flex items-center gap-2 text-sm">
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center py-12">
          <Bell size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id}
              className={`card flex items-start gap-3 transition-all ${!n.is_read ? 'border-brand-blue/30 bg-brand-blue/5' : 'opacity-70'}`}>
              <div className="text-2xl flex-shrink-0 mt-0.5">
                {TYPE_ICONS[n.type] || TYPE_ICONS.default}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${!n.is_read ? 'text-white' : 'text-gray-300'}`}>{n.title}</p>
                <p className="text-sm text-gray-400 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-600 mt-1">{fmtDateTime(n.created_at)}</p>
                {/* Actions */}
                {!n.is_read && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => markRead(n.id)}
                      className="text-xs px-2 py-1 bg-dark-600 hover:bg-dark-500 rounded-lg text-gray-400 hover:text-white transition-colors">
                      Dismiss
                    </button>
                    <button onClick={() => snooze(n.id, 120)}
                      className="text-xs px-2 py-1 bg-dark-600 hover:bg-dark-500 rounded-lg text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                      <Clock size={11} /> Remind me again
                    </button>
                  </div>
                )}
              </div>
              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-brand-blue flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
