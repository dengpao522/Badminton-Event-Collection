/**
 * 登录会话工具（服务端专用）：
 * cookie 存随机 token → Session 表查用户，30 天有效期，滑动不续期（MVP 简化）。
 */
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { prisma } from './prisma';

export const SESSION_COOKIE = 'quanyu_session';
const SESSION_DAYS = 30;

/** 当前登录用户（未登录/会话过期返回 null） */
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { venueProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

/** 创建会话并写入 cookie（注册/登录成功后调用） */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/** 销毁当前会话（退出登录） */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  store.delete(SESSION_COOKIE);
}

/** 需要登录的 server action 守卫：未登录抛错（页面侧用 redirect 到 /login） */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

/** 当前用户是否为已认证球馆 */
export function isApprovedVenue(user: Awaited<ReturnType<typeof getCurrentUser>>): boolean {
  return user?.venueProfile?.status === 'APPROVED';
}
