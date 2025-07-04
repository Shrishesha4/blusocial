"use server";

import { profileAdvisor } from "@/ai/flows/profile-advisor";
import type { ProfileAdvisorInput, ProfileAdvisorOutput } from "@/ai/flows/profile-advisor";
import { db } from "@/lib/firebase";
import { collection, doc, serverTimestamp, setDoc, getDocs, query, where, getDoc } from "firebase/firestore";
import type { User } from "@/lib/types";

export async function getAIProfileAdvice(
  data: ProfileAdvisorInput
): Promise<ProfileAdvisorOutput> {
  if (!process.env.GOOGLE_API_KEY) {
    console.error("GOOGLE_API_KEY is not set in the environment.");
    throw new Error("The AI Advisor is currently unavailable. Please try again later.");
  }
  
  // Add a small delay for demo purposes to show loading state
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    const result = await profileAdvisor(data);
    return result;
  } catch (error) {
    console.error("Error getting AI profile advice:", error);
    // In a real app, you'd want to log this error to a monitoring service
    throw new Error("Failed to get advice from AI. Please try again later.");
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
    return { success: true, message: "Ping sent!" };
  } catch (error) {
    console.error("Error sending ping:", error);
    throw new Error("Failed to send ping. Please try again.");
  }
}

export async function getSentPings(userId: string) {
  if (!userId) {
    return [];
  }
  const q = query(collection(db, "pings"), where("pingerId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data().pingedId as string);
}

export async function getReceivedPings(userId: string): Promise<User[]> {
  if (!userId) {
    return [];
  }

  const pingsQuery = query(collection(db, "pings"), where("pingedId", "==", userId));
  const pingsSnapshot = await getDocs(pingsQuery);

  if (pingsSnapshot.empty) {
    return [];
  }

  const pingerIds = pingsSnapshot.docs.map(doc => doc.data().pingerId as string);

  const pingerProfiles = await Promise.all(
    pingerIds.map(async (id) => {
      const userDoc = await getDoc(doc(db, "users", id));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
      return null;
    })
  );
  
  return pingerProfiles.filter(profile => profile !== null) as User[];
}
