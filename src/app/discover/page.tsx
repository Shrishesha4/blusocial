"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { User } from "@/lib/types";
import { useLocation } from "@/hooks/use-location";
import { getDistance } from "@/lib/location";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Frown, Heart, Instagram, MapPin, Twitter, Loader2, Send, Linkedin, Facebook } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getSentPings, pingUser } from "../actions";

const SEARCH_RADIUS_KM = 0.5;

export default function DiscoverPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isUserLoading, updateUser } = useUser();
  const { location, loading: locationLoading, error: locationError } = useLocation();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPinging, setIsPinging] = useState<string | null>(null);
  const [sentPings, setSentPings] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (location && user?.id) {
      updateUser({ location: { lat: location.latitude, lng: location.longitude } })
        .catch(err => {
            console.error("Failed to update user location in Firestore:", err);
        });
    }
  }, [location, user?.id, updateUser]);
  
  useEffect(() => {
    if (!user) return; 

    const fetchUsersAndPings = async () => {
      setIsFetchingUsers(true);
      try {
        const usersCol = collection(db, "users");
        const userSnapshot = await getDocs(usersCol);
        const usersList = userSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as User))
            .filter(u => u.id !== user.id); 
        setAllUsers(usersList);

        const pingedIds = await getSentPings(user.id);
        setSentPings(new Set(pingedIds));
      } catch (error) {
        console.error("Error fetching users or pings:", error);
      } finally {
        setIsFetchingUsers(false);
      }
    };

    fetchUsersAndPings();
  }, [user]);

  const currentUserInterests = useMemo(() => new Set(user?.interests ?? []), [user]);

  const matchedUsers = useMemo(() => {
    if (!location || !user || !allUsers.length) return [];

    const nearbyUsers = allUsers
      .filter(otherUser => otherUser.location)
      .map(otherUser => ({
        ...otherUser,
        distance: getDistance(location.latitude, location.longitude, otherUser.location!.lat, otherUser.location!.lng),
      }))
      .filter(otherUser => otherUser.distance! <= SEARCH_RADIUS_KM);

    const filteredUsers = currentUserInterests.size === 0
        ? nearbyUsers
        : nearbyUsers.filter(otherUser =>
            otherUser.interests?.some(interest => currentUserInterests.has(interest))
        );

    return filteredUsers.sort((a, b) => a.distance! - b.distance!);
  }, [location, user, currentUserInterests, allUsers]);
  
  const handlePing = useCallback(async (pingedId: string) => {
    if (!user?.id) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to ping someone." });
      return;
    }

    setIsPinging(pingedId);
    try {
        await pingUser({ pingerId: user.id, pingedId });
        setSentPings(prev => new Set(prev).add(pingedId));
        toast({
            title: "Ping Sent!",
            description: "They'll see your interest."
        })
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Ping Failed",
            description: (error as Error).message
        })
    } finally {
        setIsPinging(null);
    }
  }, [toast, user]);

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
    <>
      <div className="animate-in fade-in-50">
        <h2 className="text-3xl font-headline font-bold mb-6">Discover Nearby</h2>
        {matchedUsers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {matchedUsers.map(match => {
              const hasSocials = match.socials && Object.values(match.socials).some(link => !!link);
              return (
              <Card key={match.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:border-accent">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary text-2xl flex items-center justify-center">
                    <AvatarFallback className="bg-transparent">{match.profileEmoji ?? match.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="font-headline">{match.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3" /> 
                      {match.distance! < 1 
                        ? `${(match.distance! * 1000).toFixed(0)} m away`
                        : `${match.distance!.toFixed(1)} km away`
                      }
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-2">{match.bio}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {match.interests
                      ?.filter(interest => currentUserInterests.has(interest))
                      .map(interest => (
                        <Badge key={interest} variant="secondary" className="gap-1.5 items-center">
                          <Heart className="h-3 w-3 text-primary" />
                          {interest}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-between items-center">
                    {hasSocials ? (
                      <Button variant="outline" size="sm" onClick={() => setSelectedUser(match)}>
                          Connect
                      </Button>
                    ) : <div />}
                    <Button 
                        size="sm" 
                        onClick={() => handlePing(match.id)}
                        disabled={sentPings.has(match.id) || !!isPinging}
                    >
                        {isPinging === match.id ? <Loader2 className="animate-spin" /> : sentPings.has(match.id) ? 'Pinged' : <Send />}
                    </Button>
                </CardFooter>
              </Card>
            )})}
          </div>
        ) : (
          <div className="flex justify-center items-center h-96">
              <Alert className="max-w-md text-center">
                  <Frown className="h-5 w-5 mx-auto mb-2" />
                  <AlertTitle>No Matches Found</AlertTitle>
                  <AlertDescription>
                  We couldn&apos;t find anyone nearby. Try checking back later or add more interests to your profile!
                  </AlertDescription>
              </Alert>
          </div>
        )}
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(isOpen) => !isOpen && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
             <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary text-3xl flex items-center justify-center">
                    <AvatarFallback className="bg-transparent">{selectedUser?.profileEmoji ?? selectedUser?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <DialogTitle className="font-headline text-2xl">{selectedUser?.name}</DialogTitle>
                    <DialogDescription>Connect with {selectedUser?.name} on social media.</DialogDescription>
                </div>
            </div>
          </DialogHeader>
          <div className="py-4 space-y-3">
             {selectedUser?.socials?.twitter && (
                 <Link href={`https://twitter.com/${selectedUser.socials.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                     <Twitter className="h-5 w-5 text-sky-500" />
                     <span>@{selectedUser.socials.twitter}</span>
                 </Link>
             )}
              {selectedUser?.socials?.instagram && (
                 <Link href={`https://instagram.com/${selectedUser.socials.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                     <Instagram className="h-5 w-5 text-rose-500" />
                     <span>@{selectedUser.socials.instagram}</span>
                 </Link>
             )}
             {selectedUser?.socials?.linkedin && (
                 <Link href={`https://linkedin.com/in/${selectedUser.socials.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                     <Linkedin className="h-5 w-5 text-blue-600" />
                     <span>{selectedUser.socials.linkedin}</span>
                 </Link>
             )}
              {selectedUser?.socials?.facebook && (
                 <Link href={`https://facebook.com/${selectedUser.socials.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                     <Facebook className="h-5 w-5 text-blue-800" />
                     <span>{selectedUser.socials.facebook}</span>
                 </Link>
             )}
             {!selectedUser?.socials?.twitter && !selectedUser?.socials?.instagram && !selectedUser?.socials?.linkedin && !selectedUser?.socials?.facebook && (
                 <p className="text-sm text-muted-foreground text-center py-4">This user hasn't added any social links yet.</p>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
