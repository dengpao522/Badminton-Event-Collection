'use server';

/** 私信 Server Actions：发送点对点消息（500 字内），发给自己被拦截 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function sendMessageAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?error=${encodeURIComponent('发私信需要先登录')}`);

  const receiverId = String(formData.get('receiverId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim().slice(0, 500);
  if (!receiverId || !content) redirect('/messages');

  // 对方需真实存在；不能给自己发私信（有事发帖/评论公开交流）
  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
  if (!receiver || receiverId === me.id) redirect('/messages');

  await prisma.message.create({
    data: { senderId: me.id, receiverId, content },
  });

  revalidatePath('/messages');
  revalidatePath(`/messages/${receiverId}`);
  redirect(`/messages/${receiverId}`);
}
