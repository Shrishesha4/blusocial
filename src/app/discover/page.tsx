"use client";

import { useState, useEffect, useMemo } from "react";
import type { User } from "@/lib/types";
import { useLocation } from "@/hooks/use-location";
import { getDistance } from "@/lib/location";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Frown, Heart, Instagram, MapPin, Twitter } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SEARCH_RADIUS_KM = 30;

export default function DiscoverPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  const { location, loading: locationLoading, error: locationError } = useLocation();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/");
    }
  }, [user, isUserLoading, router]);
  
  useEffect(() => {
    if (!user) return; // Don't fetch if there's no logged in user

    const fetchUsers = async () => {
      setIsFetchingUsers(true);
      try {
        const usersCol = collection(db, "users");
        const userSnapshot = await getDocs(usersCol);
        const usersList = userSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as User))
            .filter(u => u.id !== user.id); // Filter out the current user
        setAllUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsFetchingUsers(false);
      }
    };

    fetchUsers();
  }, [user]);

  const currentUserInterests = useMemo(() => user?.interests ?? [], [user]);

  const matchedUsers = useMemo(() => {
    if (!location || !user || !allUsers.length) return [];

    return allUsers
      .filter(otherUser => otherUser.location) // Ensure other user has location data
      .map(otherUser => ({
        ...otherUser,
        distance: getDistance(location.latitude, location.longitude, otherUser.location!.lat, otherUser.location!.lng),
      }))
      .filter(otherUser => otherUser.distance! <= SEARCH_RADIUS_KM)
      .filter(otherUser => otherUser.interests?.some(interest => currentUserInterests.includes(interest)))
      .sort((a, b) => a.distance! - b.distance!);
  }, [location, user, currentUserInterests, allUsers]);

  if (isUserLoading || locationLoading || isFetchingUsers) {
    return (
      <div>
        <h2 className="text-3xl font-headline font-bold mb-6">Discover Nearby</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 mt-2" />
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (locationError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Location Error</AlertTitle>
        <AlertDescription>
          Could not get your location. Please enable location services in your browser and refresh the page.
          <p className="font-mono text-xs mt-2">{locationError}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="animate-in fade-in-50">
      <h2 className="text-3xl font-headline font-bold mb-6">Discover Nearby</h2>
      {matchedUsers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {matchedUsers.map(match => (
            <Card key={match.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:border-accent">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage src={match.profileImageUrl} alt={match.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{match.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="font-headline">{match.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3" /> {match.distance?.toFixed(1)} km away
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-2">{match.bio}</p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  {match.interests
                    ?.filter(interest => currentUserInterests.includes(interest))
                    .map(interest => (
                      <Badge key={interest} variant="secondary" className="gap-1.5 items-center">
                        <Heart className="h-3 w-3 text-primary" />
                        {interest}
                      </Badge>
                    ))}
                </div>
                <div className="flex gap-3 text-muted-foreground">
                  {match.socials?.twitter && (
                    <Link href={`https://twitter.com/${match.socials.twitter}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                      <Twitter className="h-4 w-4" />
                    </Link>
                  )}
                  {match.socials?.instagram && (
                    <Link href={`https://instagram.com/${match.socials.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                      <Instagram className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex justify-center items-center h-96">
            <Alert className="max-w-md text-center">
                <Frown className="h-5 w-5 mx-auto mb-2" />
                <AlertTitle>No Matches Found</AlertTitle>
                <AlertDescription>
                We couldn&apos;t find anyone nearby who shares your interests. Try broadening your interests or checking back later!
                </AlertDescription>
            </Alert>
        </div>
      )}
    </div>
  );
}
