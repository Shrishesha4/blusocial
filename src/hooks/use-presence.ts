// src/hooks/use-presence.ts
'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/context/user-context';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function usePresence() {
  const { firebaseUser } = useUser();
  const isUnloading = useRef(false);

  useEffect(() => {
    if (!firebaseUser) return;

    const userStatusRef = doc(db, 'users', firebaseUser.uid);

    const goOnline = () => {
        if (isUnloading.current) return;
        updateDoc(userStatusRef, {
            status: 'online',
            lastSeen: serverTimestamp() 
        });
    };

    const goOffline = () => {
        updateDoc(userStatusRef, {
            status: 'offline',
            lastSeen: serverTimestamp()
        });
    };
    
    goOnline();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        goOffline();
      } else {
        goOnline();
      }
    };

    const handleBeforeUnload = () => {
        isUnloading.current = true;
        // This is a synchronous operation, but it's not guaranteed to complete.
        // The visibilitychange event is more reliable for most cases.
        goOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // When the component unmounts (e.g., user signs out), go offline.
      goOffline();
    };
  }, [firebaseUser]);
}
