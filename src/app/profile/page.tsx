"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Instagram, Loader2, Sparkles, Twitter, Linkedin, Facebook, LogOut } from "lucide-react";
import { getAIProfileAdvice } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { ProfileAdvisorOutput } from "@/ai/flows/profile-advisor";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/context/user-context";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Separator } from "@/components/ui/separator";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50),
  bio: z.string().max(160, { message: "Bio cannot exceed 160 characters." }).optional(),
  interests: z.string().refine(value => !value || value.split(',').every(item => item.trim().length > 0), {
    message: "Interests cannot be empty.",
  }).optional(),
  socials: z.object({
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
    facebook: z.string().optional(),
  }).optional(),
  profileEmoji: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const EMOJI_LIST = ['😀', '😎', '🚀', '🎉', '💡', '❤️', '🌍', '🐶', '🐱', '🍕', '⚽️', '🎨', '🎵', '💻', '✈️', '🤔', '😂', '🥳', '🤯', '👍'];

function ProfileSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="flex items-center gap-6">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <Skeleton className="h-10 w-36" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
            <Skeleton className="h-10 w-32" />
        </div>
    )
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, updateUser, isLoading: isUserLoading } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [isAdvicePending, startAdviceTransition] = useTransition();
  const [advice, setAdvice] = useState<ProfileAdvisorOutput | null>(null);
  const [isAdvisorOpen, setAdvisorOpen] = useState(false);
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
        name: "",
        bio: "",
        interests: "",
        socials: { twitter: "", instagram: "", linkedin: "", facebook: "" },
        profileEmoji: "👋",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/");
    }
    if (user) {
      form.reset({
        name: user.name,
        bio: user.bio ?? "",
        interests: user.interests?.join(", ") ?? "",
        socials: {
          twitter: user.socials?.twitter ?? "",
          instagram: user.socials?.instagram ?? "",
          linkedin: user.socials?.linkedin ?? "",
          facebook: user.socials?.facebook ?? "",
        },
        profileEmoji: user.profileEmoji ?? "👋",
      });
    }
  }, [user, isUserLoading, router, form]);

  const watchedInterests = form.watch("interests")?.split(',').map(i => i.trim()).filter(Boolean) ?? [];

  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true);
    const interestsArray = data.interests?.split(',').map(i => i.trim()).filter(Boolean) ?? [];
    try {
      await updateUser({ ...data, interests: interestsArray });
      toast({
        title: "Profile Updated!",
        description: "Your profile information has been saved.",
      });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message || "Could not save your profile."
        })
    } finally {
        setIsSaving(false);
    }
  }

  function handleGetAdvice() {
    startAdviceTransition(async () => {
      const currentData = form.getValues();
      if (!currentData.bio && !currentData.interests) {
        toast({
          variant: "destructive",
          title: "Cannot get advice",
          description: "Please fill in your bio or interests first.",
        });
        return;
      }

      try {
        const result = await getAIProfileAdvice({
          bio: currentData.bio || "",
          interests: currentData.interests?.split(',').map(i => i.trim()).filter(Boolean) || [],
        });
        setAdvice(result);
        setAdvisorOpen(true);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "AI Advisor Error",
          description: (error as Error).message,
        });
      }
    });
  }

  function applyAdvice() {
    if (!advice) return;
    form.setValue("bio", advice.suggestedBio, { shouldValidate: true });
    form.setValue("interests", advice.suggestedInterests.join(", "), { shouldValidate: true });
    setAdvisorOpen(false);
    toast({
      title: "Suggestions Applied",
      description: "The AI's suggestions have been applied to your profile.",
    });
  }
  
  function handleEmojiSelect(emoji: string) {
    form.setValue("profileEmoji", emoji, { shouldValidate: true });
    setEmojiPickerOpen(false);
    toast({
        title: "Emoji Selected!",
        description: "Your new emoji has been set. Don't forget to save changes!",
    });
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/');
    } catch (error) {
      toast({ variant: "destructive", title: "Sign Out Error", description: "Could not sign you out. Please try again." });
    }
  };

  if (isUserLoading) {
      return <ProfileSkeleton />;
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Your Profile</CardTitle>
              <CardDescription>This is how others will see you on BluSocial.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 border-4 border-primary/50 text-5xl flex items-center justify-center">
                  <AvatarFallback className="bg-transparent">{form.watch('profileEmoji')}</AvatarFallback>
                </Avatar>
                <Button type="button" variant="outline" onClick={() => setEmojiPickerOpen(true)}>
                  Choose Emoji
                </Button>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell us a little about yourself" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interests</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. hiking, sushi, live music" {...field} />
                    </FormControl>
                    <FormDescription>Separate your interests with a comma.</FormDescription>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {watchedInterests.map((interest) => (
                            <Badge key={interest} variant="secondary">{interest}</Badge>
                        ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="socials.twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="yourhandle" className="pl-8" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="socials.instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="yourhandle" className="pl-8" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="socials.linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="yourhandle" className="pl-8" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="socials.facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="yourhandle" className="pl-8" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex items-end gap-4">
                  <Button type="button" variant="outline" onClick={handleGetAdvice} disabled={isAdvicePending}>
                      {isAdvicePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />}
                      Get AI Advice
                  </Button>
              </div>
              
            </CardContent>
          </Card>

          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </Form>
      
      <Separator className="my-8" />

      <Button variant="outline" onClick={handleSignOut}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>

      <Dialog open={isAdvisorOpen} onOpenChange={setAdvisorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline">
              <Bot className="h-6 w-6 text-primary" /> AI Profile Advisor
            </DialogTitle>
            <DialogDescription>
              Here are some suggestions to improve your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">Suggested Bio:</h4>
              <p className="p-3 bg-muted rounded-md">{advice?.suggestedBio}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Suggested Interests:</h4>
              <div className="flex flex-wrap gap-2">
                {advice?.suggestedInterests.map(interest => (
                  <Badge key={interest} variant="default">{interest}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdvisorOpen(false)}>Cancel</Button>
            <Button onClick={applyAdvice}>Apply Suggestions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEmojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose your Emoji</DialogTitle>
            <DialogDescription>Select an emoji to represent you.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-4 py-4 justify-items-center">
            {EMOJI_LIST.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                className="text-4xl p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label={`Select emoji ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
