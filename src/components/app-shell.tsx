"use client";

import type { ReactNode } from "react";
import React from 'react';
import { usePathname } from "next/navigation";
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
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { Home, UserCircle, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/user-context";
import { useFcm } from "@/hooks/use-fcm";
import { usePresence } from "@/hooks/use-presence";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-8 w-8 fill-primary"
        aria-hidden="true"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
      <h1 className="text-xl font-headline font-semibold text-primary">BluSocial</h1>
    </div>
  );
}

function BottomNavBar({ pathname, requestCount }: { pathname: string, requestCount: number }) {
  const navItems = [
    { href: "/discover", label: "Discover", icon: Home, requests: 0 },
    { href: "/friends", label: "Friends", icon: Users, requests: requestCount },
    { href: "/profile", label: "Profile", icon: UserCircle, requests: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-10 md:hidden">
      <div className="flex justify-around h-16">
        {navItems.map(({ href, label, icon: Icon, requests }) => (
          <Link key={href} href={href} className={cn(
            "flex flex-col items-center justify-center w-full gap-1 text-sm transition-colors",
            pathname === href ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}>
              <div className="relative">
                <Icon className="h-5 w-5" />
                {requests > 0 && (
                    <span className="absolute top-[-2px] right-[-6px] flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {requests}
                    </span>
                )}
              </div>
              <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { user, isLoading } = useUser();
  
  useFcm();
  usePresence();

  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const isAuthPage = pathname === '/';

  if (isAuthPage) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
          <main>{children}</main>
        </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
          <Logo />
      </div>
    )
  }

  const friendRequestCount = user?.friendRequestsReceived?.length ?? 0;

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
                  isActive={pathname.startsWith("/friends") || pathname.startsWith("/chat")}
                  tooltip={{ children: "Friends", side: "right" }}
                >
                  <a href="/friends">
                    <Users />
                    <span>Friends</span>
                     {friendRequestCount > 0 && (
                        <SidebarMenuBadge>{friendRequestCount}</SidebarMenuBadge>
                     )}
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
        {isClient && isMobile && user && <BottomNavBar pathname={pathname} requestCount={friendRequestCount}/>}
      </SidebarInset>
    </SidebarProvider>
  );
}
