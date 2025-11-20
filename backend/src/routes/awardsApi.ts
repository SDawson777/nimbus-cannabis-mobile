import { Router } from 'express';
import { redeemAward, getAwardById } from '../controllers/awardsController';
import { prisma } from '../prismaClient';
import { requireAuth } from '../middleware/auth';
import { rewardsCatalog } from '../rewards/catalog';
import { rateLimit } from '../middleware/rateLimit';

export const awardsApiRouter = Router();

// GET /awards (authenticated) -> { user, awards }
awardsApiRouter.get('/awards', requireAuth, async (req, res) => {
  try {
    const authUser = (req as any).user as { userId: string };
    const userId = authUser.userId;
    const [awards, loyalty] = await Promise.all([
      prisma.award.findMany({ where: { userId } }),
      prisma.loyaltyStatus.upsert({
        where: { userId },
        update: {},
        create: { userId, points: 0, tier: 'Bronze' },
      }),
    ]);

    // Determine progress toward next tier based on static thresholds
    const thresholds = [
      { tier: 'Bronze', min: 0, next: 250 },
      { tier: 'Silver', min: 250, next: 500 },
      { tier: 'Gold', min: 500, next: 1000 },
      { tier: 'Platinum', min: 1000, next: null },
    ];
    const current = thresholds.find(t => t.tier === loyalty.tier) || thresholds[0];
    let progress = 1;
    if (current.next) {
      const span = current.next - current.min;
      progress = Math.min(1, (loyalty.points - current.min) / span);
    }

    return res.json({
      user: {
        id: userId,
        points: loyalty.points,
        tier: loyalty.tier,
        progress,
      },
      awards,
      rewards: rewardsCatalog.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        iconUrl: r.iconUrl,
        cost: r.cost,
      })),
    });
  } catch (err) {
    console.error('Error in awards route:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
});

// POST /awards/:id/redeem -> { success, award }
// Redemption is susceptible to abuse; apply tight rate limit
awardsApiRouter.post(
  '/awards/:id/redeem',
  requireAuth,
  rateLimit('awards:redeem', { max: 5, windowMs: 60_000 }),
  async (req, res) => {
    req.body = { awardId: req.params.id } as any;
    return redeemAward(req as any, res as any);
  }
);

// GET single award
awardsApiRouter.get('/awards/:id', requireAuth, async (req, res) =>
  getAwardById(req as any, res as any)
);

export default awardsApiRouter;
