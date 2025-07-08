// src/app/map/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { User } from '@/lib/types';
import { useUser } from '@/context/user-context';
import { useLocation } from '@/hooks/use-location';
import { getDistance } from '@/lib/location';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

const MapPage = () => {
    const router = useRouter();
    const { user, isLoading: isUserLoading } = useUser();
    const { location, loading: locationLoading, error: locationError } = useLocation();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isFetchingUsers, setIsFetchingUsers] = useState(true);

    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
            const distance = getDistance(location.latitude, location.longitude, otherUser.location.lat, otherUser.location.lng);
            return distance <= searchRadius;
        });
    }, [location, user, allUsers]);

    if (!API_KEY) {
        return (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>
                    Google Maps API Key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.
                </AlertDescription>
            </Alert>
        )
    }

    if (isUserLoading || locationLoading || isFetchingUsers) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Loading Map...</p>
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

    return (
        <div className="w-full h-[calc(100vh-10rem)] rounded-lg overflow-hidden border">
             <APIProvider apiKey={API_KEY}>
                <Map
                    defaultCenter={{ lat: location!.latitude, lng: location!.longitude }}
                    defaultZoom={13}
                    mapId="blusocial-map"
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                >
                    {/* Current User Marker */}
                    {location && user && (
                         <AdvancedMarker position={{ lat: location.latitude, lng: location.longitude }}>
                            <Avatar className="h-12 w-12 border-4 border-primary/80 text-3xl flex items-center justify-center">
                                <AvatarFallback className="bg-primary text-primary-foreground">{user.profileEmoji ?? user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                         </AdvancedMarker>
                    )}
                    
                    {/* Discovered Users Markers */}
                    {discoveredUsers.map(discoveredUser => (
                        <AdvancedMarker key={discoveredUser.id} position={{ lat: discoveredUser.location!.lat, lng: discoveredUser.location!.lng }}>
                            <Avatar className="h-10 w-10 border-2 border-accent text-2xl flex items-center justify-center">
                                <AvatarFallback className="bg-background">{discoveredUser.profileEmoji ?? discoveredUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </AdvancedMarker>
                    ))}
                </Map>
             </APIProvider>
        </div>
    )
}

export default MapPage;