
"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import ReactDOMServer from 'react-dom/server';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

interface MapViewProps {
    currentUser: User;
    discoveredUsers: User[];
    center: [number, number];
}

const MapView = ({ currentUser, discoveredUsers, center }: MapViewProps) => {
    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {currentUser && (
                <Marker 
                    position={center} 
                    icon={createCustomIcon(currentUser, { isCurrentUser: true })}
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
    );
};

export default MapView;
