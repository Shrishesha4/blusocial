

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
import { AlertTriangle, Frown, Heart, Instagram, MapPin, Twitter, Loader2, Send, Linkedin, Facebook, Users, UserPlus, Search, Circle } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { pingUser, sendFriendRequest } from "../actions";
import { cn } from "@/lib/utils";

type RequestStatus = 'add' | 'sent' | 'friends';

const calculateMatchScore = (currentUser: User, otherUser: User): number => {
  let score = 0;

  // 1. Shared Interests (+10 points each)
  if (currentUser.interests && otherUser.interests && currentUser.interests.length > 0) {
    const currentUserInterests = new Set(currentUser.interests);
    const sharedInterests = otherUser.interests.filter(interest => currentUserInterests.has(interest));
    score += sharedInterests.length * 10;
  }

  // 2. Shared "Looking For" (+5 points each)
  if (currentUser.lookingFor && otherUser.lookingFor && currentUser.lookingFor.length > 0) {
    const currentUserLookingFor = new Set(currentUser.lookingFor);
    const sharedLookingFor = otherUser.lookingFor.filter(item => currentUserLookingFor.has(item));
    score += sharedLookingFor.length * 5;
  }
  
  // 3. Distance penalty (-2 points per km)
  if (otherUser.distance) {
    score -= otherUser.distance * 2;
  }

  // 4. Age difference penalty (-1 point per year difference)
  if (currentUser.age && otherUser.age) {
    const ageDiff = Math.abs(currentUser.age - otherUser.age);
    score -= ageDiff;
  }
  
  // Add a small base score to prevent negative scores for very close users with no shared interests
  score += 1;

  return score;
};


export default function DiscoverPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isUserLoading, updateUser } = useUser();
  const { location, loading: locationLoading, error: locationError } = useLocation();
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPinging, setIsPinging] = useState<string | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('add');

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

    setIsFetchingUsers(true);
    const usersCol = collection(db, "users");
    // Query for online users who are not the current user and have a location
    const q = query(
      usersCol,
      where("status", "==", "online"),
      where("__name__", "!=", user.id),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(u => !!u.location); // Ensure location exists client-side
      
      setAllUsers(usersData);
      setIsFetchingUsers(false);
    }, (error) => {
      console.error("Error fetching users with snapshot:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch users." });
      setIsFetchingUsers(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const matchedUsers = useMemo(() => {
    if (!user || !location || allUsers.length === 0) return [];
    
    const searchRadius = user.discoveryRadius ?? 0.5;

    const nearbyUsers = allUsers
      .map(otherUser => ({
        ...otherUser,
        distance: getDistance(location.latitude, location.longitude, otherUser.location!.lat, otherUser.location!.lng),
      }))
      .filter(otherUser => otherUser.distance! <= searchRadius);
      
    const scoredUsers = nearbyUsers.map(otherUser => ({
        ...otherUser,
        score: calculateMatchScore(user, otherUser),
    }));

    return scoredUsers.filter(u => u.score > 0).sort((a, b) => b.score - a.score);
  }, [user, location, allUsers]);

  useEffect(() => {
    if (user && selectedUser) {
        if (user.friends?.includes(selectedUser.id)) {
            setRequestStatus('friends');
        } else if (user.friendRequestsSent?.includes(selectedUser.id)) {
            setRequestStatus('sent');
        } else {
            setRequestStatus('add');
        }
    }
  }, [user, selectedUser]);
  
  const handlePing = useCallback(async (pingedId: string) => {
    if (!user?.id) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to ping someone." });
      return;
    }

    setIsPinging(pingedId);
    try {
        await pingUser({ pingerId: user.id, pingedId });
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

  const handleSendFriendRequest = useCallback(async (receiverId: string) => {
    if (!user?.id) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
        return;
    }
    setIsSendingRequest(true);
    try {
        await sendFriendRequest({ senderId: user.id, receiverId });
        toast({ title: "Friend Request Sent!", description: "They will be notified." });
        setRequestStatus('sent');
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Failed to send request",
            description: (error as Error).message
        });
    } finally {
        setIsSendingRequest(false);
    }
  }, [user?.id, toast]);

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
              const sharedInterests = user?.interests?.filter(i => match.interests?.includes(i)) ?? [];
              const sharedLookingFor = user?.lookingFor?.filter(l => match.lookingFor?.includes(l)) ?? [];
              
              return (
              <Card key={match.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:border-accent">
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-primary text-3xl flex items-center justify-center">
                            <AvatarFallback className="bg-transparent">{match.profileEmoji ?? (match.name ? match.name.charAt(0) : '?')}</AvatarFallback>
                        </Avatar>
                        <Circle className="absolute bottom-0 right-0 h-3.5 w-3.5 fill-green-500 stroke-green-500" />
                    </div>
                  <div className="flex-1">
                    <CardTitle className="font-headline">{match.name}</CardTitle>
                    <CardDescription className="flex items-center gap-3 text-sm flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> 
                        {match.distance! < 1 
                          ? `${(match.distance! * 1000).toFixed(0)} m away`
                          : `${match.distance!.toFixed(1)} km away`
                        }
                      </span>
                      {match.age && <span className="text-xs font-semibold">{match.age} yrs</span>}
                      {match.pronouns && <span className="text-xs italic">({match.pronouns})</span>}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{match.bio}</p>
                  
                  {sharedInterests.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {sharedInterests.map(interest => (
                            <Badge key={interest} variant="secondary" className="gap-1.5 items-center">
                            <Heart className="h-3 w-3 text-primary" />
                            {interest}
                            </Badge>
                        ))}
                    </div>
                  )}

                  {sharedLookingFor.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {sharedLookingFor.map(item => (
                            <Badge key={item} variant="outline" className="gap-1.5 items-center text-accent-foreground border-accent">
                            <Search className="h-3 w-3 text-accent-foreground" />
                            {item}
                            </Badge>
                        ))}
                    </div>
                  )}

                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-between items-center">
                    <Button variant="outline" size="sm" onClick={() => setSelectedUser(match)}>
                        Connect
                    </Button>
                    <Button 
                        size="sm" 
                        onClick={() => handlePing(match.id)}
                        disabled={isPinging === match.id}
                    >
                        {isPinging === match.id ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </CardFooter>
              </Card>
            )})}
          </div>
        ) : (
          <div className="flex justify-center items-center h-96">
              <Alert className="max-w-md text-center">
                  <Frown className="h-5 w-5 mx-auto mb-2" />
                  <AlertTitle>No One's Around</AlertTitle>
                  <AlertDescription>
                  We couldn&apos;t find anyone online nearby. Check back later, or try expanding your discovery radius in your profile settings.
                  </AlertDescription>
              </Alert>
          </div>
        )}
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(isOpen) => !isOpen && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
             <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary text-4xl flex items-center justify-center">
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
          <DialogFooter>
            {requestStatus === 'add' && (
                <Button onClick={() => handleSendFriendRequest(selectedUser!.id)} disabled={isSendingRequest}>
                    {isSendingRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Send Friend Request
                </Button>
            )}
            {requestStatus === 'sent' && (
                <Button disabled variant="outline">Request Sent</Button>
            )}
            {requestStatus === 'friends' && (
                <Button disabled variant="outline">
                    <Users className="mr-2 h-4 w-4" /> Friends
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
