"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // User is signed in, see if we have their profile
        const userRef = doc(db, "users", fbUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setUser({ id: docSnap.id, ...docSnap.data() } as User);
        } else {
          // This case can happen if user is created but profile creation fails.
          // Or for brand new sign-ups before profile is created.
          setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const updateUser = async (data: Partial<Omit<User, 'id' | 'email'>>) => {
    if (!firebaseUser) return;
    
    const userRef = doc(db, "users", firebaseUser.uid);
    try {
      // Use setDoc with merge to create or update the document
      await setDoc(userRef, data, { merge: true });
      // Update local state after successful db write
      setUser(currentUser => {
        if (!currentUser) {
           // This can happen on first profile save after signup
           const userDoc = {
             id: firebaseUser.uid,
             email: firebaseUser.email!,
             ...data,
           } as User;
           return userDoc;
        }
        const updatedUser = { ...currentUser, ...data };
        return updatedUser;
      });
    } catch (error) {
      console.error("Error updating user document:", error);
      throw new Error("Failed to update profile.");
    }
  };

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
