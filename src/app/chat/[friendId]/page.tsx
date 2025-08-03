// src/app/chat/[friendId]/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/user-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, type Timestamp } from 'firebase/firestore';
import type { User, Message } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { sendMessage } from '@/app/actions';

function getChatId(userId1: string, userId2: string) {
    return [userId1, userId2].sort().join('_');
}

function ChatSkeleton() {
    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <header className="flex items-center gap-4 p-4 border-b">
                <Skeleton className="h-6 w-6" />
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                        <Skeleton className="h-5 w-32" />
                    </div>
                </div>
            </header>
            <div className="flex-1 p-4 space-y-4">
                <div className="flex justify-start"><Skeleton className="h-10 w-48 rounded-lg" /></div>
                <div className="flex justify-end"><Skeleton className="h-10 w-32 rounded-lg" /></div>
                <div className="flex justify-start"><Skeleton className="h-16 w-64 rounded-lg" /></div>
                <div className="flex justify-end"><Skeleton className="h-10 w-40 rounded-lg" /></div>
            </div>
            <footer className="p-4 border-t">
                <Skeleton className="h-10 w-full" />
            </footer>
        </div>
    );
}

export default function ChatPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();

    const [friend, setFriend] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const friendId = params.friendId as string;

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/');
        }
    }, [isUserLoading, user, router]);

    useEffect(() => {
        const fetchFriendData = async () => {
            if (!friendId) return;
            setIsLoading(true);
            try {
                const friendDoc = await getDoc(doc(db, 'users', friendId));
                if (friendDoc.exists()) {
                    setFriend({ id: friendDoc.id, ...friendDoc.data() } as User);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'User not found.' });
                    router.push('/friends');
                }
            } catch (error) {
                console.error("Error fetching friend data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load user data.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchFriendData();
    }, [friendId, router, toast]);

    useEffect(() => {
        if (user && friend) {
            if (!user.friends?.includes(friend.id)) {
                 toast({ variant: 'destructive', title: 'Not Friends', description: 'You can only chat with friends.' });
                 router.push('/friends');
                 return;
            }

            const chatId = getChatId(user.id, friend.id);
            const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));

            const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                const messagesData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const timestamp = data.timestamp as Timestamp;
                    return {
                        id: doc.id,
                        senderId: data.senderId,
                        text: data.text,
                        timestamp: timestamp?.toDate ? timestamp.toDate().toISOString() : new Date().toISOString()
                    } as Message;
                });
                setMessages(messagesData);
            }, (error) => {
                console.error("Error fetching messages:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load messages.' });
            });

            return () => unsubscribe();
        }
    }, [user, friend, router, toast]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !friend) return;

        setIsSending(true);
        const chatId = getChatId(user.id, friend.id);
        
        try {
            await sendMessage({ chatId, senderId: user.id, text: newMessage });
            setNewMessage('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsSending(false);
        }
    };

    if (isUserLoading || isLoading) {
        return <ChatSkeleton />;
    }

    if (!user || !friend) {
        return <ChatSkeleton />;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-card border rounded-lg">
            <header className="flex items-center gap-4 p-4 border-b">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-primary text-2xl flex items-center justify-center">
                        <AvatarFallback className="bg-transparent">{friend.profileEmoji ?? friend.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-bold font-headline">{friend.name}</h3>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            'flex items-end gap-2',
                            message.senderId === user.id ? 'justify-end' : 'justify-start'
                        )}
                    >
                        {message.senderId !== user.id && (
                             <Avatar className="h-8 w-8 border-2 border-primary text-xl flex items-center justify-center">
                                <AvatarFallback className="bg-transparent">{friend.profileEmoji ?? friend.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        )}
                        <div
                            className={cn(
                                'max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl',
                                message.senderId === user.id
                                    ? 'bg-primary text-primary-foreground rounded-br-none'
                                    : 'bg-muted rounded-bl-none'
                            )}
                        >
                            <p className="text-sm">{message.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </main>
            <footer className="p-4 border-t bg-background rounded-b-lg">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        autoComplete="off"
                        disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </form>
            </footer>
        </div>
    );
}
