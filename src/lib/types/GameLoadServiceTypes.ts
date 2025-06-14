// src/lib/types/GameLoadServiceTypes.ts
import { z } from 'zod';

// Main schema for the game load service form
export const gameLoadServiceSchema = z.object({
  consoleType: z.enum(['PS4', 'PS5'], {
    required_error: 'Please select a console type.',
  }),
  availableStorage: z.coerce
    .number({ invalid_type_error: 'Storage must be a number.' })
    .positive('Storage must be a positive number.')
    .min(1, 'Storage must be at least 1.')
    .max(16000, 'Storage seems too high. Please check the value.'), // 16TB
  storageUnit: z.enum(['GB', 'TB']),
  games: z.array(z.object({
    value: z.string()
      .min(2, 'Game title must be at least 2 characters long.')
      .max(150, 'Game title is too long.')
  }))
    .min(1, 'Please add at least one game.')
    .max(10, 'You can add a maximum of 10 games.'),
  // --- ADDED THIS FIELD TO THE SCHEMA ---
  addStorage: z.boolean(),
});

export type GameLoadServiceFormData = z.infer<typeof gameLoadServiceSchema>;

// Type for the AI estimation response (kept for potential future use or reference)
export interface GameSizeEstimation {
  gameTitle: string;
  estimatedSizeGB: number;
  found: boolean;
}

export interface AiStorageResponse {
  success: boolean;
  totalEstimatedGB: number;
  storageExceeded: boolean;
  recommendation: string;
  gamesBreakdown: GameSizeEstimation[];
}