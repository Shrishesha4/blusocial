export interface User {
  id: string; // Firebase UID
  name: string;
  email: string;
  bio?: string;
  interests?: string[];
  socials?: {
    twitter?: string;
    instagram?: string;
  };
  profileImageUrl?: string;
  location?: {
    lat: number;
    lng: number;
  };
  distance?: number;
}
