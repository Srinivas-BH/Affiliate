import { useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function HeartbeatTracker() {
  const { isLoggedIn, token } = useAuth();

  useEffect(() => {
    if (!isLoggedIn || !token) return;

    // Immediate ping on load so they show up instantly
    api.post('/auth/heartbeat').catch(() => {});

    // Ping every 30 seconds for better real-time accuracy
    const interval = setInterval(() => {
      api.post('/auth/heartbeat').catch(() => {});
    }, 30 * 1000); 

    return () => clearInterval(interval);
  }, [isLoggedIn, token]);

  return null;
}