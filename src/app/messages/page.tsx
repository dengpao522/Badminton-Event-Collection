import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { Avatar } from '@/components/Avatar';

export const metadata: Metadata = { title: '我的私信' };
export const dynamic = 'force-dynamic';

/** 时间的人话展示（与社区页同口径） */
function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return date.toLocaleDateString('zh-CN');
}

/**
 * 私信会话列表：与我相关的全部消息按对方用户分组，取每组最新一条。
 * MVP 数据量小（千条内）一次全查 + JS 聚合；量大后可改 SQL 分组/独立会话表。
 */
export default async function MessagesPage() {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?error=${encodeURIComponent('查看私信需要先登录')}`);

  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: me.id }, { receiverId: me.id }] },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      receiver: { select: { id: true, name: true, avatar: true } },
    },
  });

  // 按对方 ID 聚合会话（消息已按时间倒序，每组第一条即最新一条）
  const sessions = new Map<
    string,
    {
      peer: { id: string; name: string; avatar: string };
      lastContent: string;
      lastAt: Date;
      fromMe: boolean;
      unread: number;
    }
  >();
  for (const m of messages) {
    const peer = m.senderId === me.id ? m.receiver : m.sender;
    if (!sessions.has(peer.id)) {
      sessions.set(peer.id, {
        peer,
        lastContent: m.content,
        lastAt: m.createdAt,
        fromMe: m.senderId === me.id,
        unread: 0,
      });
    }
    // 未读数：对方发给我且未读的消息
    if (m.receiverId === me.id && !m.read) {
      sessions.get(peer.id)!.unread++;
    }
  }
  const list = [...sessions.values()];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-extrabold text-gray-900">我的私信</h1>

      <div className="mt-5 space-y-3">
        {list.map((s) => (
          <Link
            key={s.peer.id}
            href={`/messages/${s.peer.id}`}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 hover:border-brand-200 hover:bg-brand-50/40"
          >
            <Avatar name={s.peer.name} avatar={s.peer.avatar} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-gray-900">{s.peer.name}</span>
                {s.unread > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {s.unread}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-400">
                {s.fromMe ? '我：' : ''}
                {s.lastContent}
              </p>
            </div>
            <span className="shrink-0 text-xs text-gray-300">{timeAgo(s.lastAt)}</span>
          </Link>
        ))}
        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="text-4xl">💬</div>
            <p className="mt-3 text-sm font-bold text-gray-700">还没有私信</p>
            <p className="mt-1 text-xs text-gray-400">
              去球友主页点「私信」，约球、交流装备都可以私下聊
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
