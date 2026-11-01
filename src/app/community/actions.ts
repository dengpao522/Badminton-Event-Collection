'use server';

/**
 * 社区 Server Actions：发帖（含图片上传）/ 点赞 / 评论
 * 登录守卫：未登录 redirect 到 /login
 * 站内通知：评论/点赞时给帖主发通知（自己操作自己帖子不通知）
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { saveImages } from '@/lib/upload';

/** 发帖：标题可选，正文必填（5000 字内），图片 ≤4 张 */
export async function createPostAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('发帖需要先登录')}`);

  const title = String(formData.get('title') ?? '').trim().slice(0, 60);
  const content = String(formData.get('content') ?? '').trim().slice(0, 5000);
  if (!content) {
    redirect(`/community/new?error=${encodeURIComponent('正文不能为空')}`);
  }

  const files = formData.getAll('images').filter((f): f is File => f instanceof File);
  const images = await saveImages(files, '/community/new');

  await prisma.post.create({
    data: { userId: user.id, title, content, images: JSON.stringify(images) },
  });

  revalidatePath('/community');
  redirect('/community');
}

/** 点赞 / 取消点赞（幂等切换）；点赞时给帖主发通知 */
export async function toggleLikeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('点赞需要先登录')}`);
  const postId = String(formData.get('postId') ?? '');
  const back = String(formData.get('back') ?? '/community');

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId: user.id } },
  });
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    await prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
  } else {
    await prisma.like.create({ data: { postId, userId: user.id } });
    await prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
    // 通知帖主（自己的赞不通知）
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
    if (post && post.userId !== user.id) {
      await prisma.notification.create({
        data: { userId: post.userId, actorId: user.id, type: 'LIKE', postId },
      });
    }
  }
  revalidatePath(back);
  redirect(back);
}

/** 发表评论；评论时给帖主发通知 */
export async function createCommentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('评论需要先登录')}`);
  const postId = String(formData.get('postId') ?? '');
  const content = String(formData.get('content') ?? '').trim().slice(0, 500);
  if (!postId || !content) redirect('/community');

  await prisma.comment.create({ data: { postId, userId: user.id, content } });
  await prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

  // 通知帖主（自己的评论不通知）
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
  if (post && post.userId !== user.id) {
    await prisma.notification.create({
      data: { userId: post.userId, actorId: user.id, type: 'COMMENT', postId },
    });
  }

  revalidatePath('/community');
  redirect('/community');
}
