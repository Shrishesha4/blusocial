"use client";

import { useEffect, useState, useTransition, useRef } from "react";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Instagram, Loader2, Sparkles, Twitter, Upload } from "lucide-react";
import { getAIProfileAdvice } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { ProfileAdvisorOutput } from "@/ai/flows/profile-advisor";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/context/user-context";
import { Skeleton } from "@/components/ui/skeleton";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50),
  bio: z.string().max(160, { message: "Bio cannot exceed 160 characters." }).optional(),
  interests: z.string().refine(value => !value || value.split(',').every(item => item.trim().length > 0), {
    message: "Interests cannot be empty.",
  }).optional(),
  socials: z.object({
    twitter: z.string().optional(),
    instagram: z.string().optional(),
  }).optional(),
  profileImageUrl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

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
  const [isUploading, setIsUploading] = useState(false);
  const [isAdvicePending, startAdviceTransition] = useTransition();
  const [advice, setAdvice] = useState<ProfileAdvisorOutput | null>(null);
  const [isAdvisorOpen, setAdvisorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
        name: "",
        bio: "",
        interests: "",
        socials: { twitter: "", instagram: "" },
        profileImageUrl: "",
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
        },
        profileImageUrl: user.profileImageUrl ?? "",
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
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please select an image file.",
        });
        return;
    }

    setIsUploading(true);
    try {
        const pictureRef = storageRef(storage, `profile-pictures/${user.id}/${file.name}`);
        const snapshot = await uploadBytes(pictureRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        await updateUser({ profileImageUrl: downloadURL });
        form.setValue("profileImageUrl", downloadURL);

        toast({
            title: "Success!",
            description: "Your profile picture has been updated.",
        });
    } catch (error) {
        console.error("Error uploading profile picture: ", error);
        toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "Could not upload your picture. Please try again.",
        });
    } finally {
        setIsUploading(false);
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
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                    disabled={isUploading}
                />
                <Avatar className="h-20 w-20 border-4 border-primary/50">
                  <AvatarImage src={form.watch('profileImageUrl')} data-ai-hint="person portrait" />
                  <AvatarFallback>{form.watch('name')?.charAt(0)?.toUpperCase() ?? 'U'}</AvatarFallback>
                </Avatar>
                <Button type="button" variant="outline" onClick={handleUploadClick} disabled={isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {isUploading ? "Uploading..." : "Upload Picture"}
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
    </>
  );
}
