"use client";

import type { ReactNode } from "react";
import React, { useEffect } from 'react';
import { usePathname, useRouter } from "next/navigation";
import Link from 'next/link';
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Home, LogOut, UserCircle, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/user-context";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { collection, query, where, onSnapshot, Timestamp, getDoc, doc } from "firebase/firestore";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-8 w-8 fill-primary"
        aria-hidden="true"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5-2.5z" />
      </svg>
      <h1 className="text-xl font-headline font-semibold text-primary">BluSocial</h1>
    </div>
  );
}

function BottomNavBar({ pathname, onSignOut }: { pathname: string, onSignOut: () => void }) {
  const navItems = [
    { href: "/discover", label: "Discover", icon: Home },
    { href: "/friends", label: "Friends", icon: Users },
    { href: "/profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-10 md:hidden">
      <div className="flex justify-around h-16">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn(
            "flex flex-col items-center justify-center w-full gap-1 text-sm transition-colors",
            pathname === href ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}>
              <Icon className="h-5 w-5" />
              <span>{label}</span>
          </Link>
        ))}
         <button onClick={onSignOut} className="flex flex-col items-center justify-center w-full gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user, isLoading } = useUser();
  
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/');
    } catch (error) {
      toast({ variant: "destructive", title: "Sign Out Error", description: "Could not sign you out. Please try again." });
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Use a timestamp from when the component mounts to avoid showing old pings
    const listenTimestamp = Timestamp.now();

    const q = query(
        collection(db, "pings"),
        where("pingedId", "==", user.id),
        where("timestamp", ">", listenTimestamp)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        for (const change of snapshot.docChanges()) {
            if (change.type === "added") {
                const pingData = change.doc.data();
                const pingerId = pingData.pingerId;
                
                if (pingerId === user.id) continue; // Don't notify for self-pings

                // Fetch pinger's profile to get their name
                const userDocRef = doc(db, "users", pingerId);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const pingerName = userDocSnap.data().name;
                    toast({
                        title: "New Ping!",
                        description: `${pingerName} pinged you.`,
                    });
                }
            }
        }
    });

    return () => unsubscribe();
  }, [user?.id, toast]);

  const isAuthPage = pathname === '/';

  if (isAuthPage) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
          <main>{children}</main>
        </div>
    )
  }
  
  // While loading, we can show a loader or nothing to prevent flicker
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
          <Logo />
      </div>
    )
  }

  return (
    <SidebarProvider>
      {isClient && !isMobile && (
        <Sidebar>
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  href="/discover"
                  asChild
                  isActive={pathname === "/discover"}
                  tooltip={{ children: "Discover", side: "right" }}
                >
                  <a href="/discover">
                    <Home />
                    <span>Discover</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  href="/friends"
                  asChild
                  isActive={pathname === "/friends"}
                  tooltip={{ children: "Friends", side: "right" }}
                >
                  <a href="/friends">
                    <Users />
                    <span>Friends</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  href="/profile"
                  asChild
                  isActive={pathname === "/profile"}
                  tooltip={{ children: "Profile", side: "right" }}
                >
                  <a href="/profile">
                    <UserCircle />
                    <span>Profile</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            {user && (
              <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start gap-2">
                <LogOut />
                Sign Out
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>
      )}
      <SidebarInset>
        <div className={cn("p-4 sm:p-6 lg:p-8", isClient && isMobile && "pb-24")}>
          {isClient && isMobile && user && (
            <header className="mb-4">
              <Logo />
            </header>
          )}
          <main>{children}</main>
        </div>
        {isClient && isMobile && user && <BottomNavBar pathname={pathname} onSignOut={handleSignOut} />}
      </SidebarInset>
    </SidebarProvider>
  );
}
