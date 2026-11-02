'use server';

/**
 * 社区 Server Actions：发帖（含图片上传/话题/关联赛事）/ 点赞 / 评论（含盖楼回复）
 * 登录守卫：未登录 redirect 到 /login
 * 站内通知：评论/点赞时给帖主发通知（自己操作自己帖子不通知）
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { saveImages } from '@/lib/upload';
import { TOPICS } from '@/lib/constants';

/** 发帖：标题可选，正文必填（5000 字内），图片 ≤4 张；话题单选 + 可关联赛事（赛事讨论区） */
export async function createPostAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('发帖需要先登录')}`);

  const title = String(formData.get('title') ?? '').trim().slice(0, 60);
  const content = String(formData.get('content') ?? '').trim().slice(0, 5000);
  if (!content) {
    redirect(`/community/new?error=${encodeURIComponent('正文不能为空')}`);
  }

  // 话题：白名单校验（防止伪造提交写入未知值导致筛选 chips 失效）
  const topicRaw = String(formData.get('topic') ?? '').trim();
  const topic = (TOPICS as readonly string[]).includes(topicRaw) ? topicRaw : '';

  // 关联赛事：需真实存在（赛事讨论区入口/下拉二选一来源），非法值降级为不关联
  const eventIdRaw = String(formData.get('eventId') ?? '').trim();
  let eventId: string | null = null;
  if (eventIdRaw) {
    const ev = await prisma.event.findUnique({ where: { id: eventIdRaw }, select: { id: true } });
    if (ev) eventId = ev.id;
  }

  const files = formData.getAll('images').filter((f): f is File => f instanceof File);
  const images = await saveImages(files, '/community/new');

  await prisma.post.create({
    data: { userId: user.id, title, content, images: JSON.stringify(images), topic, eventId },
  });

  revalidatePath('/community');
  revalidatePath(`/events/${eventId ?? ''}`);
  redirect(eventId ? `/events/${eventId}` : '/community');
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
    // 先确认帖子存在：直接构造请求伪造 postId 会触发外键约束异常（500），此处优雅回退
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
    if (!post) redirect(back);
    await prisma.like.create({ data: { postId, userId: user.id } });
    await prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
    // 通知帖主（自己的赞不通知）
    if (post.userId !== user.id) {
      await prisma.notification.create({
        data: { userId: post.userId, actorId: user.id, type: 'LIKE', postId },
      });
    }
  }
  revalidatePath(back);
  redirect(back);
}

/** 发表评论（可盖楼回复某条评论）；评论时给帖主/被回复人发通知 */
export async function createCommentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('评论需要先登录')}`);
  const postId = String(formData.get('postId') ?? '');
  const content = String(formData.get('content') ?? '').trim().slice(0, 500);
  if (!postId || !content) redirect('/community');

  // 先确认帖子存在：伪造 postId 会触发外键约束异常（500），此处优雅回退
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true, eventId: true } });
  if (!post) redirect('/community');

  // 盖楼：replyTo 为被回复评论的 id，取其作者作为回复目标（作者已注销则 SetNull，退化为普通评论）
  const replyToId = String(formData.get('replyTo') ?? '').trim();
  let replyToUserId: string | null = null;
  if (replyToId) {
    const target = await prisma.comment.findUnique({
      where: { id: replyToId },
      select: { userId: true },
    });
    replyToUserId = target?.userId ?? null;
  }

  await prisma.comment.create({ data: { postId, userId: user.id, content, replyToUserId } });
  await prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

  // 通知帖主（自己的评论不通知）；盖楼时同时通知被回复人（自己回复自己也不通知）
  if (post.userId !== user.id) {
    await prisma.notification.create({
      data: { userId: post.userId, actorId: user.id, type: 'COMMENT', postId },
    });
  }
  if (replyToUserId && replyToUserId !== post.userId && replyToUserId !== user.id) {
    await prisma.notification.create({
      data: { userId: replyToUserId, actorId: user.id, type: 'COMMENT', postId },
    });
  }

  revalidatePath('/community');
  if (post.eventId) revalidatePath(`/events/${post.eventId}`);
  redirect('/community');
}