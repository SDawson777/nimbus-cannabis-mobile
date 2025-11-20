import { Router } from 'express';
import { prisma } from '../prismaClient';
import { sendPushNotification } from '../services/pushService';

export const webhookRouter = Router();

webhookRouter.post('/stripe', async (req, res) => {
  const event = req.body;
  try {
    const orderId = event?.data?.object?.metadata?.orderId;
    if (orderId) {
      const order = await (prisma as any).order?.findUnique({
        where: { id: orderId },
        include: { user: true },
      });
      if (order?.user?.id) {
        await sendPushNotification({
          userId: order.user.id,
          token: order.user.fcmToken,
          notification: {
            title: 'Order Update',
            body: `Your order ${order.id} is now ${order.status}.`,
          },
          data: {
            orderId: order.id,
            status: String(order.status),
          },
        });
      }
    }
  } catch {
    // swallow
  }
  res.json({ received: true });
});
