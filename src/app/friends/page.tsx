
"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@/lib/types";
import { useUser } from "@/context/user-context";
import { getFriends, getFriendRequests, acceptFriendRequest, declineFriendRequest, removeFriend } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, Twitter, Instagram, Linkedin, Facebook, MessageSquare, Check, X, Loader2, MoreVertical, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function FriendsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export default function FriendsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<User | null>(null);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/");
    }
  }, [user, isUserLoading, router]);

  const fetchFriends = useCallback(async () => {
    if (user?.id) {
      setIsLoadingFriends(true);
      try {
        const friendsData = await getFriends(user.id);
        setFriends(friendsData);
      } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch friends." });
      } finally {
        setIsLoadingFriends(false);
      }
    }
  }, [user?.id, toast]);

  const fetchRequests = useCallback(async () => {
    if (user?.id) {
      setIsLoadingRequests(true);
      try {
        const requestsData = await getFriendRequests(user.id);
        setRequests(requestsData);
      } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch friend requests." });
      } finally {
        setIsLoadingRequests(false);
      }
    }
  }, [user?.id, toast]);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [fetchFriends, fetchRequests]);

  const handleAccept = async (requesterId: string) => {
    if (!user?.id) return;
    setProcessingRequestId(requesterId);
    try {
      await acceptFriendRequest({ userId: user.id, requesterId });
      toast({ title: "Friend Added!", description: "You are now friends." });
      // Refresh both lists
      fetchFriends();
      fetchRequests();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: (error as Error).message });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDecline = async (requesterId: string) => {
    if (!user?.id) return;
    setProcessingRequestId(requesterId);
    try {
      await declineFriendRequest({ userId: user.id, requesterId });
      toast({ title: "Request Declined" });
      fetchRequests(); // Only need to refresh requests
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: (error as Error).message });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRemoveFriend = async () => {
    if (!user?.id || !friendToRemove) return;
    setIsRemovingFriend(true);
    try {
      await removeFriend({ userId: user.id, friendId: friendToRemove.id });
      toast({ title: "Friend Removed", description: `You are no longer friends with ${friendToRemove.name}.` });
      setFriends(prev => prev.filter(f => f.id !== friendToRemove.id));
      setFriendToRemove(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: (error as Error).message });
    } finally {
      setIsRemovingFriend(false);
    }
  };

  return (
    <>
      <div className="animate-in fade-in-50">
        <h2 className="text-3xl font-headline font-bold mb-6">Social</h2>
        <Tabs defaultValue="friends">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">My Friends</TabsTrigger>
            <TabsTrigger value="requests">
              Friend Requests
              {requests.length > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {requests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4">
            {isUserLoading || isLoadingFriends ? (
              <FriendsSkeleton />
            ) : friends.length > 0 ? (
              <div className="space-y-4">
                {friends.map((friend) => (
                  <Card key={friend.id}>
                    <CardHeader className="flex flex-row items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-primary text-3xl flex items-center justify-center">
                        <AvatarFallback className="bg-transparent">{friend.profileEmoji ?? friend.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="font-headline">{friend.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{friend.bio}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => router.push(`/chat/${friend.id}`)}>
                          <MessageSquare className="mr-2 h-4 w-4" /> Message
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFriendToRemove(friend)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                    <UserX className="mr-2 h-4 w-4" />
                                    <span>Remove Friend</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 pt-2">
                        {friend.socials?.twitter && <Twitter className="h-5 w-5 text-sky-500" />}
                        {friend.socials?.instagram && <Instagram className="h-5 w-5 text-rose-500" />}
                        {friend.socials?.linkedin && <Linkedin className="h-5 w-5 text-blue-600" />}
                        {friend.socials?.facebook && <Facebook className="h-5 w-5 text-blue-800" />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-96">
                <Alert className="max-w-md text-center">
                  <Users className="h-5 w-5 mx-auto mb-2" />
                  <AlertTitle>No Friends Yet</AlertTitle>
                  <AlertDescription>
                    When you add friends, they will appear here. Go to Discover to find people!
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4">
            {isUserLoading || isLoadingRequests ? (
              <FriendsSkeleton />
            ) : requests.length > 0 ? (
              <div className="space-y-4">
                {requests.map((requester) => (
                  <Card key={requester.id}>
                    <CardHeader className="flex flex-row items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-primary text-3xl flex items-center justify-center">
                        <AvatarFallback className="bg-transparent">{requester.profileEmoji ?? requester.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="font-headline">{requester.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{requester.bio}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleDecline(requester.id)}
                          disabled={processingRequestId === requester.id}
                        >
                          {processingRequestId === requester.id ? <Loader2 className="animate-spin" /> : <X className="h-4 w-4" />}
                        </Button>
                        <Button 
                          size="icon"
                          onClick={() => handleAccept(requester.id)}
                          disabled={processingRequestId === requester.id}
                        >
                          {processingRequestId === requester.id ? <Loader2 className="animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-96">
                <Alert className="max-w-md text-center">
                  <Users className="h-5 w-5 mx-auto mb-2" />
                  <AlertTitle>No New Requests</AlertTitle>
                  <AlertDescription>You have no pending friend requests.</AlertDescription>
                </Alert>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <AlertDialog open={!!friendToRemove} onOpenChange={(open) => !open && setFriendToRemove(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Remove {friendToRemove?.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. You will have to send a new friend request to connect again.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                      onClick={handleRemoveFriend}
                      disabled={isRemovingFriend}
                      className={buttonVariants({ variant: "destructive" })}
                  >
                      {isRemovingFriend ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Remove
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
