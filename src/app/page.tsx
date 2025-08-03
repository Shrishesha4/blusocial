

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, SquareSquare } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, type User as FirebaseAuthUser } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import type { User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// SVG for Google Icon
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.356-11.303-8H24v-8H4.286c-0.297,1.869-0.5,3.816-0.5,5.895C3.786,35.988,12.955,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.954,34.205,44,29.561,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);

// Sign In Schema
const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
type SignInValues = z.infer<typeof signInSchema>;

// Sign Up Schema
const signUpSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});
type SignUpValues = z.infer<typeof signUpSchema>;

function AuthSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex items-center gap-2 justify-center mb-2">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-8 w-8 fill-primary"
                aria-hidden="true"
            >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <h1 className="text-2xl font-headline font-semibold text-primary">BluSocial</h1>
        </div>
        <CardDescription>Sign in to find your matches or create an account.</CardDescription>
      </CardHeader>
      <CardContent>
          <div className="grid w-full grid-cols-2 gap-1.5 h-10 bg-muted rounded-md p-1">
              <Skeleton className="h-full w-full rounded-sm" />
              <Skeleton className="h-full w-full rounded-sm" />
          </div>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
            </div>
             <Skeleton className="h-10 w-full" />
          </div>
      </CardContent>
    </Card>
  )
}


export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSignInPending, setIsSignInPending] = useState(false);
  const [isSignUpPending, setIsSignUpPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [detectedOS, setDetectedOS] = useState<'android' | 'ios' | 'other'>('other');

  useEffect(() => {
    setIsClient(true);
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(userAgent)) {
      setDetectedOS("android");
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setDetectedOS("ios");
    }
  }, []);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Function to create user doc if not exists
  const createUserDocument = async (firebaseUser: FirebaseAuthUser) => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      // User is new, create a document
      const newUser: Omit<User, 'id'> = {
        name: firebaseUser.displayName || 'New User',
        email: firebaseUser.email!,
        bio: "",
        interests: [],
        friends: [],
        friendRequestsSent: [],
        friendRequestsReceived: [],
        socials: { twitter: "", instagram: "", linkedin: "", facebook: "" },
        profileEmoji: "👋",
        location: { lat: 34.0522, lng: -118.2437 }, // Default location
        discoveryRadius: 0.5, // Default radius in KM
        lookingFor: [],
        pronouns: "",
      };
      await setDoc(userRef, newUser);
      return true; // Indicates a new user was created
    }
    return false; // Indicates user already existed
  };
  
  async function onSignInSubmit(data: SignInValues) {
    setIsSignInPending(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: "Welcome Back!",
        description: "You have successfully signed in.",
      });
      router.push('/discover');
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: "Invalid email or password. Please try again.",
      });
    } finally {
      setIsSignInPending(false);
    }
  }

  async function onSignUpSubmit(data: SignUpValues) {
    setIsSignUpPending(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const { user: firebaseUser } = userCredential;
      await createUserDocument(firebaseUser);

      toast({
        title: "Account Created!",
        description: "Welcome to BluSocial! Let's set up your profile.",
      });
      router.push('/profile'); // Go to profile page first after signup
    } catch (error: any) {
      console.error("Sign up error:", error);
       toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.code === 'auth/email-already-in-use' ? 'This email is already registered.' : 'An unknown error occurred.',
      });
    } finally {
      setIsSignUpPending(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGooglePending(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isNewUser = await createUserDocument(result.user);

      if (isNewUser) {
        toast({
          title: "Welcome to BluSocial!",
          description: "Let's set up your profile to get started.",
        });
        router.push('/profile');
      } else {
        toast({
          title: "Welcome Back!",
          description: "You've successfully signed in.",
        });
        router.push('/discover');
      }
    } catch (error: any) {
      console.error("Google sign in error:", error);
      toast({
        variant: "destructive",
        title: "Google Sign-In Failed",
        description: "Could not sign in with Google. Please try again.",
      });
    } finally {
      setIsGooglePending(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] gap-6">
      { !isClient ? <AuthSkeleton /> : (
        <>
          <Tabs defaultValue="signin" className="w-full max-w-md">
            <Card>
                <CardHeader className="text-center">
                    <div className="flex items-center gap-2 justify-center mb-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-8 w-8 fill-primary"
                            aria-hidden="true"
                        >
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <h1 className="text-2xl font-headline font-semibold text-primary">BluSocial</h1>
                    </div>
                    <CardDescription>Sign in to find your matches or create an account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGooglePending}>
                        {isGooglePending ? <Loader2 className="mr-2 animate-spin" /> : <GoogleIcon />}
                        Sign in with Google
                    </Button>
                    <div className="my-4 flex items-center">
                      <Separator className="flex-1" />
                      <span className="mx-4 text-xs text-muted-foreground">OR CONTINUE WITH</span>
                      <Separator className="flex-1" />
                    </div>

                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="signin">Sign In</TabsTrigger>
                      <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="signin">
                        <Form {...signInForm}>
                            <form onSubmit={signInForm.handleSubmit(onSignInSubmit)} className="space-y-4 pt-4">
                            <FormField
                                control={signInForm.control}
                                name="email"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                    <Input placeholder="you@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={signInForm.control}
                                name="password"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isSignInPending}>
                                {isSignInPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In
                            </Button>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="signup">
                        <Form {...signUpForm}>
                            <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4 pt-4">
                                <FormField
                                control={signUpForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Your Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <FormField
                                control={signUpForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="you@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <FormField
                                control={signUpForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <FormField
                                control={signUpForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <Button type="submit" className="w-full" disabled={isSignUpPending}>
                                {isSignUpPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Account
                            </Button>
                            </form>
                        </Form>
                    </TabsContent>
                </CardContent>
            </Card>
          </Tabs>
          
          {detectedOS === 'android' && (
              <Alert className="w-full max-w-md">
                  <Download className="h-4 w-4" />
                  <AlertTitle>Get the Android App</AlertTitle>
                  <AlertDescription className="flex justify-between items-center">
                      For the best experience, download the native Android app.
                      <Button size="sm" asChild>
                          <a href="/blusocial.apk" download>Download APK</a>
                      </Button>
                  </AlertDescription>
              </Alert>
          )}

          {detectedOS === 'ios' && (
              <Alert className="w-full max-w-md">
                  <SquareSquare className="h-4 w-4" />
                  <AlertTitle>Install on your iPhone</AlertTitle>
                  <AlertDescription>
                      For a native app experience, tap the Share icon in Safari and select &quot;Add to Home Screen&quot;.
                  </AlertDescription>
              </Alert>
          )}

        </>
      )}
    </div>
  );
}
