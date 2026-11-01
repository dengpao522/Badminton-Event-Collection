'use server';

/** 单向关注 / 取关（微博式，无需对方同意） */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function toggleFollowAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?error=${encodeURIComponent('关注球友需要先登录')}`);
  const targetId = String(formData.get('targetId') ?? '');
  const back = String(formData.get('back') ?? '/community');
  // 不能关注自己；目标用户需存在
  if (!targetId || targetId === me.id) redirect(back);

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) redirect(back);

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
  });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({ data: { followerId: me.id, followingId: targetId } });
  }
  revalidatePath(back);
  revalidatePath(`/u/${targetId}`);
  redirect(back);
}
