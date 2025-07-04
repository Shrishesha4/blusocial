export interface User {
  id: string; // Firebase UID
  name: string;
  email: string;
  bio?: string;
  interests?: string[];
  friends?: string[];
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
}
