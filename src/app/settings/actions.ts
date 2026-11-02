'use server';

/** 用户资料编辑：昵称 / 简介 / 头像 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { saveImages, deleteUploads } from '@/lib/upload';

export async function updateProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('请先登录')}`);

  const name = String(formData.get('name') ?? '').trim().slice(0, 20);
  const bio = String(formData.get('bio') ?? '').trim().slice(0, 100);
  if (name.length < 2) {
    redirect(`/settings?error=${encodeURIComponent('昵称至少 2 个字符')}`);
  }

  // 头像为可选上传：选了文件则替换（存 1 张），并清理旧头像文件防磁盘残留
  const files = formData.getAll('avatar').filter((f): f is File => f instanceof File);
  const [avatar] = await saveImages(files, '/settings', 1);
  if (avatar && user.avatar) {
    await deleteUploads([user.avatar]);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      bio,
      ...(avatar ? { avatar } : {}),
    },
  });

  revalidatePath('/settings');
  revalidatePath(`/u/${user.id}`);
  redirect(`/settings?saved=1`);
}
