// src/app/map/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import ReactDOMServer from 'react-dom/server';
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
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

// Function to create custom DivIcon for markers
const createCustomIcon = (user: User, options: { isCurrentUser?: boolean } = {}) => {
    const { isCurrentUser } = options;
    const avatarComponent = (
        <Avatar className={cn(
            'border-2 text-2xl flex items-center justify-center',
            isCurrentUser 
                ? 'h-12 w-12 border-4 border-primary/80 text-3xl' 
                : 'h-10 w-10 border-accent'
        )}>
            <AvatarFallback className={cn(
                isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-background'
            )}>
                {user.profileEmoji ?? user.name.charAt(0)}
            </AvatarFallback>
        </Avatar>
    );

    return L.divIcon({
        html: ReactDOMServer.renderToString(avatarComponent),
        className: 'bg-transparent border-none', // Prevent Leaflet's default icon styles
        iconSize: isCurrentUser ? [48, 48] : [40, 40],
        iconAnchor: isCurrentUser ? [24, 48] : [20, 40], // Point of the icon which will correspond to marker's location
        popupAnchor: [0, -40] // Point from which the popup should open relative to the iconAnchor
    });
};

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
            const distance = getDistance(location.latitude, location.longitude, otherUser.location.lat, otherUser.location.lng);
            return distance <= searchRadius;
        });
    }, [location, user, allUsers]);

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

    if (!location) {
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
             <MapContainer
                center={[location.latitude, location.longitude]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Current User Marker */}
                {user && (
                    <Marker 
                        position={[location.latitude, location.longitude]} 
                        icon={createCustomIcon(user, { isCurrentUser: true })}
                        zIndexOffset={1000}
                    >
                        <Popup>
                           <Card className="border-none shadow-none">
                                <CardHeader className="p-2">
                                    <CardTitle className="text-base">You are here</CardTitle>
                                </CardHeader>
                           </Card>
                        </Popup>
                    </Marker>
                )}
                
                {/* Discovered Users Markers */}
                {discoveredUsers.map(discoveredUser => (
                    <Marker
                        key={discoveredUser.id}
                        position={[discoveredUser.location!.lat, discoveredUser.location!.lng]}
                        icon={createCustomIcon(discoveredUser)}
                    >
                        <Popup>
                             <Card className="border-none shadow-none">
                                <CardHeader className="p-2 flex flex-row items-center gap-3 space-y-0">
                                     <Avatar className="h-10 w-10 border text-xl flex items-center justify-center">
                                        <AvatarFallback>{discoveredUser.profileEmoji ?? discoveredUser.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-base">{discoveredUser.name}</CardTitle>
                                    </div>
                                </CardHeader>
                           </Card>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}

export default MapPage;
