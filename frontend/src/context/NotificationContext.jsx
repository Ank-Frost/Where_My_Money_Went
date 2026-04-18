import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationAPI } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [swRegistration, setSwRegistration] = useState(null);
  const pollRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30000);
    return () => clearInterval(pollRef.current);
  }, [user, fetchNotifications]);

  // Register service worker and push subscription
  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function registerSW() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        setSwRegistration(reg);

        const { data } = await notificationAPI.getVapidKey();
        if (!data.publicKey) return;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.publicKey)
          });
        }

        await notificationAPI.subscribe({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
            auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))))
          }
        });
      } catch (err) {
        console.error('SW registration error:', err);
      }
    }

    registerSW();

    // Listen for service worker messages (snooze)
    const handler = async (event) => {
      if (event.data?.type === 'SNOOZE_NOTIFICATION') {
        // Snooze for 2 hours (default remind again)
        const notifId = event.data.data?.notificationId;
        if (notifId) {
          await notificationAPI.snooze(notifId, 120);
          fetchNotifications();
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [user, fetchNotifications]);

  const markRead = async (id) => {
    await notificationAPI.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await notificationAPI.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const snooze = async (id, minutes = 120) => {
    await notificationAPI.snooze(id, minutes);
    fetchNotifications();
  };

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, fetchNotifications,
      markRead, markAllRead, snooze
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
