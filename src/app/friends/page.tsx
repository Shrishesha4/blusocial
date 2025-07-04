
"use client";

import { useState, useEffect } from "react";
import type { User } from "@/lib/types";
import { useUser } from "@/context/user-context";
import { getFriends } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, Twitter, Instagram, Linkedin, Facebook } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const [friends, setFriends] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user?.id) {
      setIsLoadingFriends(true);
      getFriends(user.id)
        .then(setFriends)
        .catch(console.error)
        .finally(() => setIsLoadingFriends(false));
    }
  }, [user?.id, user?.friends]); // Rerun when friends array changes

  if (isUserLoading || isLoadingFriends) {
    return (
      <div>
        <h2 className="text-3xl font-headline font-bold mb-6">Your Friends</h2>
        <FriendsSkeleton />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in-50">
      <h2 className="text-3xl font-headline font-bold mb-6">Your Friends</h2>
      {friends.length > 0 ? (
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
    </div>
  );
}
