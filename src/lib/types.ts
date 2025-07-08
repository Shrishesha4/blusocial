export interface User {
  id: string; // Firebase UID
  name: string;
  email: string;
  bio?: string;
  interests?: string[];
  friends?: string[];
  friendRequestsSent?: string[];
  friendRequestsReceived?: string[];
  socials?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    facebook?: string;
  };
  profileEmoji?: string;
  location?: {
    lat: number;
    lng: number;
  };
  distance?: number;
  fcmTokens?: string[]; // For push notifications
  discoveryRadius?: number;
  suggestedMatches?: string[]; // To keep track of users already suggested
  age?: number;
  pronouns?: string;
  lookingFor?: string[];
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: string; // ISO 8601 date string
}
