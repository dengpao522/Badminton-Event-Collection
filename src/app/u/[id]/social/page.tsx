import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { toggleFollowAction } from '../actions';
import { Avatar } from '@/components/Avatar';

export const metadata: Metadata = { title: '关注与粉丝' };
export const dynamic = 'force-dynamic';

/**
 * 社交列表页：某用户的 关注 / 粉丝 / 好友（互相关注）三个 tab。
 * 列表公开可浏览（同抖音/小红书）；每项带快捷关注按钮（需登录）。
 */
export default async function SocialListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const me = await getCurrentUser();
  const activeTab = tab === 'followers' || tab === 'friends' ? tab : 'follows';

  const owner = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!owner) notFound();

  // 关注/粉丝按 tab 独立查询（分开查让 TS 正确收窄 include 关联，避免联合类型访问报错）
  const users =
    activeTab === 'followers'
      ? (
          await prisma.follow.findMany({
            where: { followingId: id },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { follower: { select: { id: true, name: true, avatar: true, bio: true } } },
          })
        ).map((r) => r.follower)
      : (
          await prisma.follow.findMany({
            where: { followerId: id },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { following: { select: { id: true, name: true, avatar: true, bio: true } } },
          })
        ).map((r) => r.following);

  // 好友 tab：在关注列表中过滤出「对方也关注 owner」的
  if (activeTab === 'friends') {
    const followerIdSet = new Set(
      (
        await prisma.follow.findMany({
          where: { followingId: id },
          select: { followerId: true },
        })
      ).map((r) => r.followerId),
    );
    for (let i = users.length - 1; i >= 0; i--) {
      if (!followerIdSet.has(users[i].id)) users.splice(i, 1);
    }
  }

  // 我对各列表用户的关注态（登录时批量查一次）
  const myFollowingIds = me
    ? new Set(
        (
          await prisma.follow.findMany({
            where: { followerId: me.id, followingId: { in: users.map((u) => u.id) } },
            select: { followingId: true },
          })
        ).map((r) => r.followingId),
      )
    : new Set<string>();

  /** tab 链接保持路由；激活 tab 带数量，非激活只显示标签名 */
  const tabHref = (t: string) => `/u/${id}/social?tab=${t}`;
  const labels: Record<string, string> = { follows: '关注', followers: '粉丝', friends: '好友' };
  const tabLabel = (t: string) => (t === activeTab ? `${labels[t]} ${users.length}` : labels[t]);

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link href={`/u/${id}`} className="text-sm text-gray-500 hover:text-brand-600">
        ← {owner.name} 的主页
      </Link>

      {/* tab：关注 / 粉丝 / 好友 */}
      <div className="mt-4 flex gap-2">
        {(['follows', 'followers', 'friends'] as const).map((t) => (
          <Link
            key={t}
            href={tabHref(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              activeTab === t ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tabLabel(t)}
          </Link>
        ))}
      </div>

      {/* 用户列表：头像 + 昵称 + 简介 + 快捷关注 */}
      <div className="mt-5 space-y-2">
        {users.map((u) => {
          const isSelf = me?.id === u.id;
          const iFollow = myFollowingIds.has(u.id);
          const back = tabHref(activeTab);
          return (
            <div key={u.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5">
              <Link href={`/u/${u.id}`} className="shrink-0">
                <Avatar name={u.name} avatar={u.avatar} size={44} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/u/${u.id}`} className="text-sm font-bold text-gray-900 hover:text-brand-600">
                  {u.name}
                </Link>
                {u.bio && <p className="mt-0.5 truncate text-xs text-gray-400">{u.bio}</p>}
              </div>
              {!isSelf && me && (
                <form action={toggleFollowAction} className="shrink-0">
                  <input type="hidden" name="targetId" value={u.id} />
                  <input type="hidden" name="back" value={back} />
                  <button
                    type="submit"
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold ${
                      iFollow ? 'border border-gray-300 text-gray-500 hover:bg-gray-50' : 'bg-brand-500 text-white hover:bg-brand-600'
                    }`}
                  >
                    {iFollow ? '已关注' : '+ 关注'}
                  </button>
                </form>
              )}
              {!me && !isSelf && (
                <Link
                  href={`/login?error=${encodeURIComponent('关注球友需要先登录')}`}
                  className="shrink-0 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  + 关注
                </Link>
              )}
            </div>
          );
        })}
        {users.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-xs text-gray-400">
            {activeTab === 'friends'
              ? '还没有好友：互相关注的球友会出现在这里'
              : activeTab === 'follows'
                ? '还没有关注任何球友'
                : '还没有粉丝'}
          </div>
        )}
      </div>
    </div>
  );
}
