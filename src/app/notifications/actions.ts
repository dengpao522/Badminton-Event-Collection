'use server';

/** 把当前用户全部通知标记为已读 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function markAllReadAction() {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  await prisma.notification.updateMany({
    where: { userId: me.id, read: false },
    data: { read: true },
  });
  revalidatePath('/notifications');
}
