// src/hooks/use-fcm.ts
'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useUser } from '@/context/user-context';
import { app } from '@/lib/firebase';
import { useToast } from './use-toast';
import { arrayUnion } from 'firebase/firestore';

export function useFcm() {
    const { user, firebaseUser, updateUser } = useUser();
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            console.log("FCM not supported in this environment.");
            return;
        }

        const initFcm = async () => {
            if (!firebaseUser || !app) return;

            try {
                const messaging = getMessaging(app);

                // Handle foreground messages
                onMessage(messaging, (payload) => {
                    console.log('Foreground message received. ', payload);
                    toast({
                        title: payload.notification?.title,
                        description: payload.notification?.body,
                    });
                });

                // Request permission and get token
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const currentToken = await getToken(messaging, {
                        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                    });

                    if (currentToken) {
                        // Check if token already exists for the user to avoid unnecessary writes
                        if (!user?.fcmTokens?.includes(currentToken)) {
                            console.log('Saving new FCM token to user profile.');
                            // The updateUser function from context handles the Firestore update
                            await updateUser({
                                fcmTokens: arrayUnion(currentToken) as any, // Cast to any to satisfy type weirdness
                            });
                        }
                    } else {
                        console.log('No registration token available. Request permission to generate one.');
                    }
                } else {
                    console.log('Unable to get permission to notify.');
                }
            } catch (err) {
                console.error('An error occurred while initializing FCM. ', err);
            }
        };
        
        initFcm();

    }, [firebaseUser, user, updateUser, toast]);
}
