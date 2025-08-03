'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useUser } from '@/context/user-context';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function usePresence() {
  const { firebaseUser } = useUser();
  const isUnloading = useRef(false);
  const statusUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateStatus = useCallback(async (status: 'online' | 'offline') => {
    if (!firebaseUser || isUnloading.current) return;

    try {
      const userStatusRef = doc(db, 'users', firebaseUser.uid);
      // Use updateDoc instead of setDoc to avoid overwriting other fields
      await updateDoc(userStatusRef, {
        status,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to update presence:', error);
      // Don't throw the error to prevent app crashes
    }
  }, [firebaseUser]);

  const debouncedUpdateStatus = useCallback((status: 'online' | 'offline') => {
    // Clear any pending status updates
    if (statusUpdateTimeoutRef.current) {
      clearTimeout(statusUpdateTimeoutRef.current);
    }

    // Debounce status updates to prevent rapid fire updates
    statusUpdateTimeoutRef.current = setTimeout(() => {
      updateStatus(status);
    }, 500);
  }, [updateStatus]);

  useEffect(() => {
    if (!firebaseUser) return;

    // Set initial online status
    updateStatus('online');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        debouncedUpdateStatus('offline');
      } else {
        debouncedUpdateStatus('online');
      }
    };

    const handleBeforeUnload = () => {
      isUnloading.current = true;
      // Try to update status synchronously (not guaranteed to complete)
      const userStatusRef = doc(db, 'users', firebaseUser.uid);
      updateDoc(userStatusRef, {
        status: 'offline',
        lastSeen: serverTimestamp()
      }).catch(() => {
        // Ignore errors during unload
      });
    };

    const handleFocus = () => {
      debouncedUpdateStatus('online');
    };

    const handleBlur = () => {
      debouncedUpdateStatus('offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      // Clear timeout on cleanup
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      // Set offline status when component unmounts
      if (!isUnloading.current) {
        updateStatus('offline');
      }
    };
  }, [firebaseUser, updateStatus, debouncedUpdateStatus]);
}
