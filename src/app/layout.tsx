
"use client";

import type {Metadata} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import {AppShell} from '@/components/app-shell';
import { UserProvider } from '@/context/user-context';
import { useEffect, useState } from 'react';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <html lang="en" className="dark">
      <head>
        <title>BluSocial</title>
        <meta name="description" content="Find people with similar interests near you." />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BluSocial" />
        <meta name="application-name" content="BluSocial" />
        <meta name="theme-color" content="#212936" />
        <link rel="apple-touch-icon" href="https://raw.githubusercontent.com/Shrishesha4/blusocial/refs/heads/main/src/app/logo192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <UserProvider>
          {isClient ? <AppShell>{children}</AppShell> : null}
          <Toaster />
        </UserProvider>
      </body>
    </html>
  );
}
