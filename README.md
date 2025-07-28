# BluSocial: A Social Discovery PWA

BluSocial is a modern, location-aware Progressive Web App (PWA) designed to help users discover and connect with like-minded individuals in their vicinity. Built with a powerful stack including Next.js, Firebase, and Genkit, it provides a seamless and engaging social experience.

The core of BluSocial is its **advanced matching algorithm**, which goes beyond simple location to connect users based on shared interests, goals (like friendship or networking), and profile similarities. This ensures that users find relevant and meaningful connections.

## Key Features

- **User Authentication:** Secure sign-up and sign-in functionality using Firebase Authentication.
- **Detailed User Profiles:** Users can create rich profiles with a bio, interests, custom emoji, social media links, age, and pronouns.
- **Intelligent Discovery:** The "Discover" page uses a scoring algorithm to suggest the most relevant nearby users based on shared interests and other profile data.
- **Real-time Chat:** Once users become friends, they can engage in one-on-one real-time conversations.
- **Friend Management:** A complete friend request system (send, accept, decline) and the ability to remove friends.
- **Push Notifications:** The app uses Firebase Cloud Messaging to send real-time notifications for new messages, friend requests, and pings, keeping users engaged.
- **AI-Powered Profile Advisor:** Leverages Genkit to provide users with AI-driven suggestions to improve their bio and interests, helping them attract better matches.
- **Account Management:** Users have full control over their data, including the ability to permanently delete their account.

## Technology Stack

- **Framework:** Next.js with the App Router
- **Language:** TypeScript
- **Backend & Database:** Firebase (Firestore, Authentication, Cloud Messaging)
- **Generative AI:** Google's Genkit for AI-powered features.
- **UI:** Tailwind CSS with ShadCN UI components for a modern and responsive design.
- **Platform:** Deployed as a Progressive Web App (PWA) for a native-like experience on any device.
