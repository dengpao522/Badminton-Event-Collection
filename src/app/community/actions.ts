'use server';

/**
 * 社区 Server Actions：发帖（含图片上传）/ 点赞 / 评论
 * 登录守卫：未登录 redirect 到 /login
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

/** 允许的图片类型与大小上限（5MB） */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 4;

/** 保存上传图片到 public/uploads，返回相对路径数组（如 /uploads/xxx.jpg） */
async function saveImages(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const dir = join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  const paths: string[] = [];
  for (const file of files.slice(0, MAX_IMAGES)) {
    if (!file || file.size === 0) continue;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      redirect(`/community/new?error=${encodeURIComponent('仅支持 JPG/PNG/WebP 图片')}`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      redirect(`/community/new?error=${encodeURIComponent('单张图片不能超过 5MB')}`);
    }
    // 扩展名从 MIME 映射（不用原始文件名，防路径注入）
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));
    paths.push(`/uploads/${filename}`);
  }
  return paths;
}

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
  const images = await saveImages(files);

  await prisma.post.create({
    data: { userId: user.id, title, content, images: JSON.stringify(images) },
  });

  revalidatePath('/community');
  redirect('/community');
}

/** 点赞 / 取消点赞（幂等切换） */
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
  }
  revalidatePath(back);
  redirect(back);
}

/** 发表评论 */
export async function createCommentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('评论需要先登录')}`);
  const postId = String(formData.get('postId') ?? '');
  const content = String(formData.get('content') ?? '').trim().slice(0, 500);
  if (!postId || !content) redirect('/community');

  await prisma.comment.create({ data: { postId, userId: user.id, content } });
  await prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

  revalidatePath('/community');
  redirect('/community');
}
