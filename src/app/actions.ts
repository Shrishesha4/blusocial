"use server";

import { profileAdvisor } from "@/ai/flows/profile-advisor";
import type { ProfileAdvisorInput, ProfileAdvisorOutput } from "@/ai/flows/profile-advisor";
import { db } from "@/lib/firebase";
import { collection, doc, serverTimestamp, setDoc, getDocs, query, where, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import type { User } from "@/lib/types";
import { adminDb, adminMessaging } from "@/lib/firebase-admin";

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

async function sendPingNotification(pinger: User, pinged: User) {
  if (!pinged.fcmTokens || pinged.fcmTokens.length === 0) {
    console.log(`User ${pinged.name} has no FCM tokens, skipping notification.`);
    return;
  }

  const message = {
    notification: {
      title: 'You received a new ping!',
      body: `${pinger.name} just pinged you.`,
    },
    tokens: pinged.fcmTokens,
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
        await sendPingNotification(pinger, pinged);
    }

    return { success: true, message: "Ping sent!" };
  } catch (error) {
    console.error("Error sending ping:", error);
    throw new Error("Failed to send ping. Please try again.");
  }
}

export async function addFriend({ userId, friendId }: { userId: string, friendId: string }) {
  if (!userId) {
    throw new Error("You must be logged in to add a friend.");
  }
  if (userId === friendId) {
    throw new Error("You cannot add yourself as a friend.");
  }

  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      friends: arrayUnion(friendId)
    });
    return { success: true, message: "Friend added!" };
  } catch (error) {
    console.error("Error adding friend:", error);
    throw new Error("Failed to add friend. Please try again.");
  }
}

export async function getFriends(userId: string): Promise<User[]> {
  if (!userId) {
    return [];
  }

  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists() || !userDoc.data().friends || userDoc.data().friends.length === 0) {
    return [];
  }
  
  let friendIds = userDoc.data().friends as string[];

  if (friendIds.length === 0) {
    return [];
  }

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
