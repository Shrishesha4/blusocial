
"use client";

import { useState, useEffect } from "react";
import type { User } from "@/lib/types";
import { useUser } from "@/context/user-context";
import { getReceivedPings } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

function PingsSkeleton() {
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

export default function PingsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const [pings, setPings] = useState<User[]>([]);
  const [isLoadingPings, setIsLoadingPings] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user?.id) {
      setIsLoadingPings(true);
      getReceivedPings(user.id)
        .then(setPings)
        .catch(console.error)
        .finally(() => setIsLoadingPings(false));
    }
  }, [user?.id]);

  if (isUserLoading || isLoadingPings) {
    return (
      <div>
        <h2 className="text-3xl font-headline font-bold mb-6">Who Pinged You</h2>
        <PingsSkeleton />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in-50">
      <h2 className="text-3xl font-headline font-bold mb-6">Who Pinged You</h2>
      {pings.length > 0 ? (
        <div className="space-y-4">
          {pings.map((pinger) => (
            <Card key={pinger.id}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary text-3xl flex items-center justify-center">
                  <AvatarFallback className="bg-transparent">{pinger.profileEmoji ?? pinger.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="font-headline">{pinger.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{pinger.bio}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex justify-center items-center h-96">
            <Alert className="max-w-md text-center">
                <Bell className="h-5 w-5 mx-auto mb-2" />
                <AlertTitle>No Pings Yet</AlertTitle>
                <AlertDescription>
                When someone pings you, they will appear here. Check back later!
                </AlertDescription>
            </Alert>
        </div>
      )}
    </div>
  );
}
