'use server';

/**
 * 用户认证 Server Actions：注册 / 登录 / 退出
 * 错误处理沿用 admin 模式：redirect 回表单页并带 ?error= 中文提示
 */
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession, destroySession } from '@/lib/session';

/** 注册：邮箱+昵称+密码（密码 ≥ 8 位），成功后自动登录回首页 */
export async function registerAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  // 基础校验（服务端兜底，前端亦有 maxlength/pattern）
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`/register?error=${encodeURIComponent('邮箱格式不正确')}`);
  }
  if (name.length < 2 || name.length > 20) {
    redirect(`/register?error=${encodeURIComponent('昵称需为 2-20 个字符')}`);
  }
  if (password.length < 8) {
    redirect(`/register?error=${encodeURIComponent('密码至少 8 位')}`);
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    redirect(`/register?error=${encodeURIComponent('该邮箱已注册，请直接登录')}`);
  }

  const user = await prisma.user.create({
    data: { email, name, passwordHash: hashPassword(password) },
  });
  await createSession(user.id);
  redirect('/');
}

/** 登录：邮箱+密码 */
export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect(`/login?error=${encodeURIComponent('邮箱或密码不正确')}`);
  }

  await createSession(user.id);
  redirect('/');
}

/** 退出登录 */
export async function logoutAction() {
  await destroySession();
  redirect('/');
}
