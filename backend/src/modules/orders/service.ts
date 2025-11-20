import { prisma } from '../../prismaClient';
import { sendPushNotification } from '../../services/pushService';

export async function updateOrderStatus(orderId: string, status: string) {
  const order = await (prisma as any).order?.update({
    where: { id: orderId },
    data: { status },
    include: { user: true },
  });

  if (order?.user?.id) {
    await sendPushNotification({
      userId: order.user.id,
      token: order.user.fcmToken,
      notification: {
        title: 'Order Update',
        body: `Your order ${order.id} is now ${status}.`,
      },
      data: {
        orderId: order.id,
        status,
      },
    });
  }

  return order;
}
