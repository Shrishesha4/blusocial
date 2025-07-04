"use server";

import { profileAdvisor } from "@/ai/flows/profile-advisor";
import type { ProfileAdvisorInput, ProfileAdvisorOutput } from "@/ai/flows/profile-advisor";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { collection, doc, serverTimestamp, setDoc, getDocs, query, where } from "firebase/firestore";

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

export async function pingUser({ pingedId }: { pingedId: string }) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to ping someone.");
  }
  
  const pingerId = currentUser.uid;

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

export async function getSentPings() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return [];
  }
  const q = query(collection(db, "pings"), where("pingerId", "==", currentUser.uid));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data().pingedId);
}
