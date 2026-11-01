import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { markAllReadAction } from './actions';
import { Avatar } from '@/components/Avatar';

export const metadata: Metadata = { title: '通知' };
export const dynamic = 'force-dynamic';

/** 通知文案：类型 → 人话 + 链接锚点 */
function notifyText(type: string): { text: string; href: string } {
  switch (type) {
    case 'FOLLOW':
      return { text: '关注了你', href: '' };
    case 'COMMENT':
      return { text: '评论了你的作品', href: '/community' };
    case 'LIKE':
      return { text: '赞了你的作品', href: '/community' };
    default:
      return { text: '与你互动', href: '/community' };
  }
}

/** 通知中心：被关注/被评论/被点赞的站内提醒，最新在前 */
export default async function NotificationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?error=${encodeURIComponent('请先登录')}`);

  const notifications = await prisma.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { actor: { select: { id: true, name: true, avatar: true } } },
  });
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">
          通知{unread > 0 && <span className="ml-2 text-sm font-semibold text-brand-600">{unread} 条未读</span>}
        </h1>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              全部标为已读
            </button>
          </form>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {notifications.map((n) => {
          const { text, href } = notifyText(n.type);
          const inner = (
            <div
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-sm ${
                n.read ? 'border-gray-200 bg-white' : 'border-brand-200 bg-brand-50/60'
              }`}
            >
              <Avatar name={n.actor.name} avatar={n.actor.avatar} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-gray-700">
                  <b className="text-gray-900">{n.actor.name}</b> {text}
                  {!n.read && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-brand-500 align-middle" />}
                </p>
                <p className="text-xs text-gray-400">{n.createdAt.toLocaleString('zh-CN')}</p>
              </div>
            </div>
          );
          // 关注类点进对方主页；评论/赞类点进社区流
          return (
            <Link key={n.id} href={href ? href : `/u/${n.actor.id}`}>
              {inner}
            </Link>
          );
        })}
        {notifications.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="text-4xl">🔔</div>
            <p className="mt-3 text-sm text-gray-500">还没有通知。发作品、关注球友，互动会出现在这里</p>
          </div>
        )}
      </div>
    </div>
  );
}
