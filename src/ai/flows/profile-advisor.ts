// profile-advisor.ts
'use server';
/**
 * @fileOverview AI-powered profile advisor to suggest improvements to user's bio and interests.
 *
 * - profileAdvisor - A function that suggests improvements to the user profile.
 * - ProfileAdvisorInput - The input type for the profileAdvisor function.
 * - ProfileAdvisorOutput - The return type for the profileAdvisor function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProfileAdvisorInputSchema = z.object({
  bio: z.string().describe('The user bio.'),
  interests: z.array(z.string()).describe('The list of user interests.'),
});
export type ProfileAdvisorInput = z.infer<typeof ProfileAdvisorInputSchema>;

const ProfileAdvisorOutputSchema = z.object({
  suggestedBio: z.string().describe('The suggested improved user bio.'),
  suggestedInterests: z.array(z.string()).describe('The suggested improved list of user interests.'),
});
export type ProfileAdvisorOutput = z.infer<typeof ProfileAdvisorOutputSchema>;

export async function profileAdvisor(input: ProfileAdvisorInput): Promise<ProfileAdvisorOutput> {
  return profileAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'profileAdvisorPrompt',
  input: {schema: ProfileAdvisorInputSchema},
  output: {schema: ProfileAdvisorOutputSchema},
  prompt: `You are an AI-powered profile advisor, your role is to analyze a user's profile information and provide suggestions to improve their profile bio and list of interests, aiming to maximize their visibility and attract more relevant matches.

  Current Bio: {{{bio}}}
  Current Interests: {{#each interests}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Based on the current bio and interests, suggest a better bio and refined set of interests.
`,
});

const profileAdvisorFlow = ai.defineFlow(
  {
    name: 'profileAdvisorFlow',
    inputSchema: ProfileAdvisorInputSchema,
    outputSchema: ProfileAdvisorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
