"use client";

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/lib/types';

interface UserContextType {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  isLoading: boolean;
  updateUser: (data: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        // If user logs out, clear user data and stop loading
        setUser(null);
        setIsLoading(false);
      }
      // The listener for user data will be set up in the next useEffect
    });
    return () => authUnsubscribe();
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      setIsLoading(true);
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const docUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUser({ id: docSnap.id, ...docSnap.data() } as User);
        } else {
          // This case can happen if user is created but profile creation fails.
          setUser(null);
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching user data with onSnapshot:", error);
        setIsLoading(false);
      });
      return () => docUnsubscribe();
    }
  }, [firebaseUser]);

  const updateUser = useCallback(async (data: Partial<Omit<User, 'id' | 'email'>>) => {
    if (!firebaseUser) return;
    
    const userRef = doc(db, "users", firebaseUser.uid);
    try {
      // setDoc with merge will create or update. This is good.
      // With onSnapshot in place, we don't strictly need to update local state here,
      // but it provides a faster UI feedback before the listener fires.
      await setDoc(userRef, data, { merge: true });
      setUser(currentUser => {
        if (!currentUser) {
           const userDoc = {
             id: firebaseUser.uid,
             email: firebaseUser.email!,
             ...data,
           } as User;
           return userDoc;
        }
        return { ...currentUser, ...data };
      });
    } catch (error) {
      console.error("Error updating user document:", error);
      throw new Error("Failed to update profile.");
    }
  }, [firebaseUser]);

  return (
    <UserContext.Provider value={{ user, firebaseUser, isLoading, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
