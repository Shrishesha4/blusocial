"use server";

import { profileAdvisor } from "@/ai/flows/profile-advisor";
import type { ProfileAdvisorInput, ProfileAdvisorOutput } from "@/ai/flows/profile-advisor";
import { db } from "@/lib/firebase";
import { collection, doc, serverTimestamp, setDoc, getDocs, query, where, getDoc, updateDoc, arrayUnion, arrayRemove, writeBatch, runTransaction, addDoc, limit } from "firebase/firestore";
import type { User } from "@/lib/types";
import { adminMessaging } from "@/lib/firebase-admin";
import { getDistance } from "@/lib/location";

export async function getAIProfileAdvice(
  data: ProfileAdvisorInput
): Promise<ProfileAdvisorOutput> {
  if (!process.env.GOOGLE_API_KEY) {
    console.error("GOOGLE_API_KEY is not set in the environment.");
    throw new Error("The AI Advisor is currently unavailable. Please try again later.");
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    const result = await profileAdvisor(data);
    return result;
  } catch (error) {
    console.error("Error getting AI profile advice:", error);
    throw new Error("Failed to get advice from AI. Please try again later.");
  }
}

async function sendPushNotification({
  recipient,
  title,
  body,
  url,
}: {
  recipient: User;
  title: string;
  body: string;
  url: string;
}) {
  if (!adminMessaging) {
    console.warn("Firebase Admin SDK or Messaging service not initialized. Skipping push notification. Is GOOGLE_SERVICE_ACCOUNT_JSON configured?");
    return;
  }
  
  if (!recipient.fcmTokens || recipient.fcmTokens.length === 0) {
    console.log(`User ${recipient.name} has no FCM tokens, skipping notification.`);
    return;
  }

  const message = {
    notification: {
      title,
      body,
    },
    webpush: {
      fcm_options: {
        link: url,
      },
      notification: {
        icon: "https://raw.githubusercontent.com/Shrishesha4/blusocial/refs/heads/main/src/app/logo192.png",
      }
    },
    tokens: recipient.fcmTokens,
  };

  try {
    const response = await adminMessaging.sendEachForMulticast(message);
    console.log('Successfully sent notification:', response);
    if (response.failureCount > 0) {
      console.log('Failed notifications:', response.responses);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

export async function pingUser({ pingerId, pingedId }: { pingerId: string, pingedId: string }) {
  if (!pingerId) {
    throw new Error("You must be logged in to ping someone.");
  }

  if (pingerId === pingedId) {
    throw new Error("You cannot ping yourself.");
  }

  try {
    const pingRef = doc(collection(db, "pings"));
    await setDoc(pingRef, {
      pingerId,
      pingedId,
      timestamp: serverTimestamp(),
    });

    const pingerDoc = await getDoc(doc(db, "users", pingerId));
    const pingedDoc = await getDoc(doc(db, "users", pingedId));

    if (pingerDoc.exists() && pingedDoc.exists()) {
        const pinger = { id: pingerDoc.id, ...pingerDoc.data() } as User;
        const pinged = { id: pingedDoc.id, ...pingedDoc.data() } as User;
        await sendPushNotification({
          recipient: pinged,
          title: 'You received a new ping! 👋',
          body: `${pinger.name} just pinged you.`,
          url: `/discover`,
        });
    }

    return { success: true, message: "Ping sent!" };
  } catch (error) {
    console.error("Error sending ping:", error);
    throw new Error("Failed to send ping. Please try again.");
  }
}

export async function sendFriendRequest({ senderId, receiverId }: { senderId: string, receiverId: string }) {
  if (!senderId || !receiverId) {
    throw new Error("Invalid user IDs provided.");
  }
  if (senderId === receiverId) {
    throw new Error("You cannot send a friend request to yourself.");
  }
  
  try {
    const senderRef = doc(db, "users", senderId);
    const receiverRef = doc(db, "users", receiverId);

    const batch = writeBatch(db);
    batch.update(senderRef, { friendRequestsSent: arrayUnion(receiverId) });
    batch.update(receiverRef, { friendRequestsReceived: arrayUnion(senderId) });
    await batch.commit();

    const senderDoc = await getDoc(senderRef);
    const receiverDoc = await getDoc(receiverRef);

    if (senderDoc.exists() && receiverDoc.exists()) {
      const sender = senderDoc.data() as User;
      const receiver = receiverDoc.data() as User;
      await sendPushNotification({
        recipient: receiver,
        title: 'New Friend Request! 🤝',
        body: `${sender.name} wants to be your friend.`,
        url: '/friends',
      });
    }

    return { success: true, message: "Friend request sent!" };
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw new Error("Failed to send friend request.");
  }
}

export async function acceptFriendRequest({ userId, requesterId }: { userId: string, requesterId: string }) {
    if (!userId || !requesterId) throw new Error("Invalid user IDs.");

    try {
        const userRef = doc(db, "users", userId);
        const requesterRef = doc(db, "users", requesterId);

        await runTransaction(db, async (transaction) => {
            transaction.update(userRef, {
                friends: arrayUnion(requesterId),
                friendRequestsReceived: arrayRemove(requesterId)
            });
            transaction.update(requesterRef, {
                friends: arrayUnion(userId),
                friendRequestsSent: arrayRemove(userId)
            });
        });

        const userDoc = await getDoc(userRef);
        const requesterDoc = await getDoc(requesterRef);

        if (userDoc.exists() && requesterDoc.exists()) {
          const user = userDoc.data() as User;
          const requester = requesterDoc.data() as User;
          await sendPushNotification({
            recipient: requester,
            title: 'Friend Request Accepted! 🎉',
            body: `${user.name} accepted your friend request. You are now friends.`,
            url: `/chat/${userId}`,
          });
        }

        return { success: true, message: "Friend request accepted!" };
    } catch (error) {
        console.error("Error accepting friend request:", error);
        throw new Error("Failed to accept friend request.");
    }
}


export async function declineFriendRequest({ userId, requesterId }: { userId: string, requesterId: string }) {
    if (!userId || !requesterId) throw new Error("Invalid user IDs.");
    
    try {
        const batch = writeBatch(db);
        const userRef = doc(db, "users", userId);
        const requesterRef = doc(db, "users", requesterId);

        batch.update(userRef, { friendRequestsReceived: arrayRemove(requesterId) });
        batch.update(requesterRef, { friendRequestsSent: arrayRemove(userId) });
        await batch.commit();
        
        return { success: true, message: "Friend request declined." };
    } catch (error) {
        console.error("Error declining friend request:", error);
        throw new Error("Failed to decline friend request.");
    }
}


export async function getFriends(userId: string): Promise<User[]> {
  if (!userId) return [];

  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) return [];

  const userData = userDoc.data();
  if (!userData.friends || userData.friends.length === 0) return [];
  
  const friendIds = userData.friends as string[];
  if (friendIds.length === 0) return [];

  const friendChunks: string[][] = [];
  for (let i = 0; i < friendIds.length; i += 30) {
    friendChunks.push(friendIds.slice(i, i + 30));
  }

  const friendPromises = friendChunks.map(chunk => 
    getDocs(query(collection(db, "users"), where("__name__", "in", chunk)))
  );

  const friendSnapshots = await Promise.all(friendPromises);
  
  const friends: User[] = [];
  friendSnapshots.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      friends.push({ id: doc.id, ...doc.data() } as User);
    });
  });

  return friends;
}

export async function getFriendRequests(userId: string): Promise<User[]> {
    if (!userId) return [];

    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return [];

    const userData = userDoc.data();
    if (!userData.friendRequestsReceived || userData.friendRequestsReceived.length === 0) {
        return [];
    }
    
    const requestIds = userData.friendRequestsReceived as string[];
    if (requestIds.length === 0) return [];

    const requestChunks: string[][] = [];
    for (let i = 0; i < requestIds.length; i += 30) {
        requestChunks.push(requestIds.slice(i, i + 30));
    }

    const requestPromises = requestChunks.map(chunk => 
        getDocs(query(collection(db, "users"), where("__name__", "in", chunk)))
    );

    const requestSnapshots = await Promise.all(requestPromises);
    
    const requesters: User[] = [];
    requestSnapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
            requesters.push({ id: doc.id, ...doc.data() } as User);
        });
    });

    return requesters;
}

export async function sendMessage({ chatId, senderId, text }: { chatId: string, senderId: string, text: string }) {
  if (!chatId || !senderId || !text.trim()) {
    throw new Error("Invalid message data.");
  }
  try {
    const messagesCol = collection(db, "chats", chatId, "messages");
    await addDoc(messagesCol, {
      senderId,
      text,
      timestamp: serverTimestamp(),
    });

    // Send notification to the other user in the chat
    const userIds = chatId.split('_');
    const receiverId = userIds.find(id => id !== senderId);
    if (!receiverId) return { success: true };

    const senderDoc = await getDoc(doc(db, 'users', senderId));
    const receiverDoc = await getDoc(doc(db, 'users', receiverId));

    if (senderDoc.exists() && receiverDoc.exists()) {
      const sender = senderDoc.data() as User;
      const receiver = receiverDoc.data() as User;
      await sendPushNotification({
        recipient: receiver,
        title: `New message from ${sender.name}`,
        body: text,
        url: `/chat/${senderId}`,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending message:", error);
    throw new Error("Failed to send message.");
  }
}

// This is a new function that you can trigger (e.g., via a cron job) to suggest matches.
export async function findAndSuggestMatch(userId: string) {
  if (!adminMessaging) {
    console.warn("Notifications are disabled.");
    return;
  }

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const user = { id: userSnap.id, ...userSnap.data() } as User;
  if (!user.location || !user.interests || user.interests.length === 0) return;

  // Find users within discovery radius
  const allUsersSnap = await getDocs(collection(db, "users"));
  const nearbyUsers = allUsersSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as User))
    .filter(otherUser => {
      if (!otherUser.location || otherUser.id === user.id) return false;
      const distance = getDistance(user.location!.lat, user.location!.lng, otherUser.location.lat, otherUser.location.lng);
      return distance <= (user.discoveryRadius ?? 0.5);
    });

  const currentUserInterests = new Set(user.interests);
  
  // Find a potential match with shared interests who hasn't been suggested, isn't a friend, and hasn't sent a request.
  const potentialMatch = nearbyUsers.find(otherUser => {
    const hasSharedInterests = otherUser.interests?.some(interest => currentUserInterests.has(interest));
    if (!hasSharedInterests) return false;

    const alreadySuggested = user.suggestedMatches?.includes(otherUser.id);
    const alreadyFriends = user.friends?.includes(otherUser.id);
    const hasPendingRequest = user.friendRequestsReceived?.includes(otherUser.id) || user.friendRequestsSent?.includes(otherUser.id);

    return !alreadySuggested && !alreadyFriends && !hasPendingRequest;
  });
  
  if (potentialMatch) {
    await sendPushNotification({
      recipient: user,
      title: '✨ Someone new is nearby!',
      body: `You and ${potentialMatch.name} have similar interests. Check them out!`,
      url: '/discover',
    });
    // Mark as suggested to avoid re-notifying
    await updateDoc(userRef, {
      suggestedMatches: arrayUnion(potentialMatch.id),
    });
  }
}
