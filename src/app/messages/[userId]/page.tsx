import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { sendMessageAction } from '../actions';
import { Avatar } from '@/components/Avatar';

export const dynamic = 'force-dynamic';

/** 时间人话展示：同天显示时分，跨天显示日期 */
function timeLabel(date: Date): string {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * 与某位球友的对话页：双向消息按时间正序，气泡区分收/发；
 * 进入即把对方发给我的未读消息标记已读。
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?error=${encodeURIComponent('查看私信需要先登录')}`);
  const { userId } = await params;
  if (userId === me.id) redirect('/messages');

  const peer = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, avatar: true },
  });
  if (!peer) notFound();

  // 双向消息（正序）+ 进入时标记已读（两条独立查询，互不依赖先并行取再写库）
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: me.id, receiverId: userId },
        { senderId: userId, receiverId: me.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  await prisma.message.updateMany({
    where: { senderId: userId, receiverId: me.id, read: false },
    data: { read: true },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-6" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      {/* 对话头部：对方信息 + 返回会话列表 */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
        <Link href="/messages" className="text-sm text-gray-400 hover:text-brand-600">
          ←
        </Link>
        <Avatar name={peer.name} avatar={peer.avatar} size={36} />
        <Link href={`/u/${peer.id}`} className="text-sm font-bold text-gray-900 hover:text-brand-600">
          {peer.name}
        </Link>
      </div>

      {/* 消息流：自己的靠右绿色，对方的靠左白色 */}
      <div className="mt-4 flex-1 space-y-2.5">
        {messages.map((m) => {
          const mine = m.senderId === me.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'}`}>
                <p
                  className={`rounded-2xl px-3.5 py-2 text-sm leading-6 ${
                    mine ? 'bg-brand-500 text-white' : 'border border-gray-200 bg-white text-gray-800'
                  } whitespace-pre-wrap break-words`}
                >
                  {m.content}
                </p>
                <p className={`mt-0.5 text-[10px] text-gray-300 ${mine ? 'text-right' : ''}`}>
                  {timeLabel(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">还没有消息，打个招呼吧 👋</p>
        )}
      </div>

      {/* 发送框 */}
      <form action={sendMessageAction} className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
        <input type="hidden" name="receiverId" value={peer.id} />
        <input
          name="content"
          required
          maxLength={500}
          autoComplete="off"
          placeholder="输入消息（500 字内）…"
          className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >
          发送
        </button>
      </form>
    </div>
  );
}
