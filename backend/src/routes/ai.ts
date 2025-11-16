import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Types for AI requests and responses
interface RecommendProductsRequest {
  desiredEffects: string[];
  experienceLevel: 'new' | 'regular' | 'heavy';
  budgetLevel: 'low' | 'medium' | 'high';
  preferredCategories?: string[];
}

interface ProductRecommendation {
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

interface BudtenderRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * POST /ai/recommend-products
 * AI-powered product recommendations based on user preferences
 */
router.post('/recommend-products', async (req, res) => {
  try {
    const { desiredEffects, experienceLevel, budgetLevel, preferredCategories } =
      req.body as RecommendProductsRequest;

    // Input validation
    if (!desiredEffects || !Array.isArray(desiredEffects) || desiredEffects.length === 0) {
      return res
        .status(400)
        .json({ error: 'desiredEffects is required and must be a non-empty array' });
    }

    if (!['new', 'regular', 'heavy'].includes(experienceLevel)) {
      return res.status(400).json({ error: 'experienceLevel must be new, regular, or heavy' });
    }

    if (!['low', 'medium', 'high'].includes(budgetLevel)) {
      return res.status(400).json({ error: 'budgetLevel must be low, medium, or high' });
    }

    // Get products from database with store pricing
    const products = await prisma.product.findMany({
      include: {
        variants: {
          where: { active: true },
          select: { id: true, name: true, price: true, active: true },
        },
        stores: {
          where: {
            store: { isActive: true },
          },
          select: { price: true },
        },
      },
      take: 50, // Limit for performance
    });

    // Score products based on preferences
    const recommendations: ProductRecommendation[] = products
      .map(product => {
        let score = 0;
        let reasoning = [];

        // Category preference scoring
        if (preferredCategories?.includes(product.category)) {
          score += 20;
          reasoning.push(`Matches your preferred ${product.category} category`);
        }

        // Effect-based scoring (simplified - in production, use proper terpene/effect data)
        const effectsMatch = desiredEffects.some(
          effect =>
            product.name.toLowerCase().includes(effect.toLowerCase()) ||
            product.description?.toLowerCase().includes(effect.toLowerCase())
        );
        if (effectsMatch) {
          score += 30;
          reasoning.push('Matches your desired effects');
        }

        // Experience level scoring
        if (experienceLevel === 'new' && product.thcPercent && product.thcPercent < 15) {
          score += 25;
          reasoning.push('Beginner-friendly THC level');
        } else if (
          experienceLevel === 'regular' &&
          product.thcPercent &&
          product.thcPercent >= 15 &&
          product.thcPercent <= 25
        ) {
          score += 25;
          reasoning.push('Perfect for regular users');
        } else if (experienceLevel === 'heavy' && product.thcPercent && product.thcPercent > 25) {
          score += 25;
          reasoning.push('High potency for experienced users');
        }

        // Budget level scoring - use store pricing if available, otherwise variant pricing
        const storePrice = product.stores[0]?.price || product.defaultPrice || 0;
        const variantPrice = product.variants[0]?.price || 0;
        const avgPrice = storePrice || variantPrice;

        if (budgetLevel === 'low' && avgPrice < 25) {
          score += 15;
          reasoning.push('Budget-friendly option');
        } else if (budgetLevel === 'medium' && avgPrice >= 25 && avgPrice <= 50) {
          score += 15;
          reasoning.push('Good value for money');
        } else if (budgetLevel === 'high' && avgPrice > 50) {
          score += 15;
          reasoning.push('Premium quality');
        }

        // Strain type preferences for effects
        if (
          desiredEffects.some(effect =>
            ['energetic', 'focus', 'creative'].includes(effect.toLowerCase())
          ) &&
          product.strainType === 'Sativa'
        ) {
          score += 20;
          reasoning.push('Sativa strain for energizing effects');
        } else if (
          desiredEffects.some(effect =>
            ['relaxed', 'sleep', 'calm'].includes(effect.toLowerCase())
          ) &&
          product.strainType === 'Indica'
        ) {
          score += 20;
          reasoning.push('Indica strain for relaxing effects');
        } else if (product.strainType === 'Hybrid') {
          score += 10;
          reasoning.push('Balanced hybrid effects');
        }

        return {
          id: product.id,
          name: product.name,
          brand: product.brand || 'Unknown',
          category: product.category,
          price: avgPrice,
          thcPercent: product.thcPercent || undefined,
          cbdPercent: product.cbdPercent || undefined,
          score,
          reasoning: reasoning.join(', ') || 'General recommendation',
        };
      })
      .filter(rec => rec.score > 0) // Only return products with some score
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 10); // Return top 10 recommendations

    res.json({
      recommendations,
      totalFound: recommendations.length,
      preferences: {
        desiredEffects,
        experienceLevel,
        budgetLevel,
        preferredCategories,
      },
    });
  } catch (error) {
    console.error('Error in AI product recommendations:', error);
    res.status(500).json({
      error: 'Failed to generate product recommendations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /ai/budtender
 * AI budtender chat assistant
 */
router.post('/budtender', async (req, res) => {
  try {
    const { message, history = [] } = req.body as BudtenderRequest;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required and must be a string' });
    }

    // TODO: Replace this mock implementation with real LLM integration
    // Example: const response = await openai.chat.completions.create({...});

    // Mock AI response based on simple pattern matching
    const lowerMessage = message.toLowerCase();
    let response = '';
    let suggestedProducts: string[] = [];

    // Pattern-based responses (simplified AI simulation)
    if (lowerMessage.includes('sleep') || lowerMessage.includes('insomnia')) {
      response =
        "For sleep and relaxation, I'd recommend looking at Indica strains with higher CBD content. These tend to have sedating effects that can help with rest.";

      // Get some Indica products
      const sleepProducts = await prisma.product.findMany({
        where: {
          strainType: 'Indica',
          category: { in: ['Flower', 'Edibles'] },
        },
        take: 3,
        select: { id: true, name: true, brand: true },
      });
      suggestedProducts = sleepProducts.map(p => `${p.brand} ${p.name}`);
    } else if (
      lowerMessage.includes('energy') ||
      lowerMessage.includes('focus') ||
      lowerMessage.includes('creative')
    ) {
      response =
        'For energy and focus, Sativa strains are typically your best bet. They tend to provide uplifting, cerebral effects that can enhance creativity and productivity.';

      const energyProducts = await prisma.product.findMany({
        where: {
          strainType: 'Sativa',
          category: { in: ['Flower', 'Vape'] },
        },
        take: 3,
        select: { id: true, name: true, brand: true },
      });
      suggestedProducts = energyProducts.map(p => `${p.brand} ${p.name}`);
    } else if (
      lowerMessage.includes('new') ||
      lowerMessage.includes('beginner') ||
      lowerMessage.includes('first time')
    ) {
      response =
        'Welcome to cannabis! For beginners, I recommend starting with products that have lower THC content (under 15%) and higher CBD ratios. This helps you gauge your tolerance safely. Consider starting with a small dose and waiting to see how you feel before taking more.';

      const beginnerProducts = await prisma.product.findMany({
        where: {
          thcPercent: { lt: 15 },
          category: { in: ['Flower', 'Edibles'] },
        },
        take: 3,
        select: { id: true, name: true, brand: true, thcPercent: true },
      });
      suggestedProducts = beginnerProducts.map(p => `${p.brand} ${p.name} (${p.thcPercent}% THC)`);
    } else if (lowerMessage.includes('pain') || lowerMessage.includes('inflammation')) {
      response =
        "For pain relief, you'll want to look at strains with good CBD content, as CBD has anti-inflammatory properties. Both Indica and balanced Hybrid strains can be effective for pain management.";

      const painProducts = await prisma.product.findMany({
        where: {
          OR: [{ cbdPercent: { gt: 5 } }, { strainType: 'Indica' }],
          category: { in: ['Flower', 'Topical', 'Tincture'] },
        },
        take: 3,
        select: { id: true, name: true, brand: true },
      });
      suggestedProducts = painProducts.map(p => `${p.brand} ${p.name}`);
    } else if (lowerMessage.includes('anxiety') || lowerMessage.includes('stress')) {
      response =
        "For anxiety and stress relief, I'd suggest strains with balanced THC/CBD ratios or CBD-dominant products. High-THC Sativas might increase anxiety for some people, so Indicas or Hybrids are often better choices.";
    } else {
      // Generic helpful response
      response =
        "I'm here to help you find the right cannabis products for your needs! Feel free to ask about specific effects you're looking for, your experience level, or any particular concerns you might have. I can recommend products based on what you tell me about your preferences.";
    }

    // Add product suggestions to response if we found any
    if (suggestedProducts.length > 0) {
      response += `\n\nHere are some products you might want to check out: ${suggestedProducts.join(', ')}.`;
    }

    res.json({
      response,
      timestamp: new Date().toISOString(),
      context: {
        userMessage: message,
        suggestedProducts,
      },
      // Include conversation history for context
      conversationLength: history.length + 1,
    });
  } catch (error) {
    console.error('Error in AI budtender:', error);
    res.status(500).json({
      error: 'Failed to generate budtender response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
