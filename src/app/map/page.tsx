// src/app/map/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { User } from '@/lib/types';
import { useUser } from '@/context/user-context';
import { useLocation } from '@/hooks/use-location';
import { getDistance } from '@/lib/location';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/map'), {
    ssr: false,
    loading: () => (
         <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Loading Map...</p>
        </div>
    ),
});

const MapPage = () => {
    const router = useRouter();
    const { user, isLoading: isUserLoading } = useUser();
    const { location, loading: locationLoading, error: locationError } = useLocation();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isFetchingUsers, setIsFetchingUsers] = useState(true);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/');
        }
    }, [isUserLoading, user, router]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!user) return;
            setIsFetchingUsers(true);
            try {
                const usersCol = collection(db, "users");
                const userSnapshot = await getDocs(usersCol);
                const usersList = userSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as User))
                    .filter(u => u.id !== user.id && u.location);
                setAllUsers(usersList);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setIsFetchingUsers(false);
            }
        };

        if (user) {
            fetchUsers();
        }
    }, [user]);

    const discoveredUsers = useMemo(() => {
        if (!location || !user || !allUsers.length) return [];
        const searchRadius = user.discoveryRadius ?? 0.5;
        return allUsers.filter(otherUser => {
            if (!otherUser.location) return false;
            const distance = getDistance(location.latitude, location.longitude, otherUser.location!.lat, otherUser.location!.lng);
            return distance <= searchRadius;
        });
    }, [location, user, allUsers]);

    if (isUserLoading || locationLoading || isFetchingUsers) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Loading Map Data...</p>
            </div>
        );
    }
    
    if (locationError) {
        return (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Location Error</AlertTitle>
                <AlertDescription>{locationError}</AlertDescription>
            </Alert>
        )
    }

    if (!location || !user) {
         return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                 <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Waiting for Location</AlertTitle>
                    <AlertDescription>Please allow location access to use the map.</AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="w-full h-[calc(100vh-10rem)] rounded-lg overflow-hidden border">
             <MapView 
                currentUser={user}
                discoveredUsers={discoveredUsers}
                center={[location.latitude, location.longitude]}
             />
        </div>
    )
}

export default MapPage;
