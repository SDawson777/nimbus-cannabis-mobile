import { useMutation } from '@tanstack/react-query';

// Types matching backend interfaces
export interface RecommendProductsRequest {
  desiredEffects: string[];
  experienceLevel: 'new' | 'regular' | 'heavy';
  budgetLevel: 'low' | 'medium' | 'high';
  preferredCategories?: string[];
}

export interface ProductRecommendation {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  thcPercent?: number;
  cbdPercent?: number;
  score: number;
  reasoning: string;
}

export interface RecommendationsResponse {
  recommendations: ProductRecommendation[];
  totalFound: number;
  preferences: RecommendProductsRequest;
}

export interface BudtenderRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface BudtenderResponse {
  response: string;
  timestamp: string;
  context: {
    userMessage: string;
    suggestedProducts: string[];
  };
  conversationLength: number;
}

/**
 * Hook for getting AI product recommendations
 */
export function useAiRecommendations() {
  return useMutation<RecommendationsResponse, Error, RecommendProductsRequest>({
    mutationFn: async (request: RecommendProductsRequest) => {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/ai/recommend-products`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || 'Failed to get recommendations');
      }

      return response.json();
    },
    onError: (error: Error) => {
      console.warn('AI recommendations error:', error.message);
    },
  });
}

/**
 * Hook for AI budtender chat
 */
export function useAiBudtender() {
  return useMutation<BudtenderResponse, Error, BudtenderRequest>({
    mutationFn: async (request: BudtenderRequest) => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/ai/budtender`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || 'Failed to get budtender response');
      }

      return response.json();
    },
    onError: (error: Error) => {
      console.warn('AI budtender error:', error.message);
    },
  });
}
