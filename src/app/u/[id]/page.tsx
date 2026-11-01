import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { toggleFollowAction } from './actions';
import { Avatar } from '@/components/Avatar';

export const dynamic = 'force-dynamic';

/** 用户主页：资料卡（粉丝/关注/球馆认证）+ 关注按钮 + TA 的帖子与发布的赛事 */
export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentUser();

  const user = await prisma.user.findUnique({
    where: { id },
    include: { venueProfile: true },
  });
  if (!user) notFound();

  const [followerCount, followingCount, posts, publishedEvents, myFollow] = await Promise.all([
    prisma.follow.count({ where: { followingId: id } }),
    prisma.follow.count({ where: { followerId: id } }),
    prisma.post.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    // 该用户（球馆）提交且已上架的赛事
    prisma.event.findMany({
      where: { submittedByUserId: id, isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // 我是否已关注 TA
    me
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: me.id, followingId: id } },
        })
      : null,
  ]);

  const isMe = me?.id === id;
  const venue = user.venueProfile?.status === 'APPROVED' ? user.venueProfile : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* 资料卡 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <Avatar name={user.name} avatar={user.avatar} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold text-gray-900">{user.name}</h1>
              {venue && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  🏸 认证球馆 · {venue.venueName}
                </span>
              )}
            </div>
            {user.bio && <p className="mt-1 text-sm text-gray-600">{user.bio}</p>}
            <p className="mt-1.5 text-xs text-gray-400">
              <b className="text-gray-600">{followerCount}</b> 粉丝 ·{' '}
              <b className="text-gray-600">{followingCount}</b> 关注
            </p>
          </div>
          {/* 关注按钮：非本人且已登录时展示 */}
          {!isMe && me && (
            <form action={toggleFollowAction}>
              <input type="hidden" name="targetId" value={id} />
              <input type="hidden" name="back" value={`/u/${id}`} />
              <button
                type="submit"
                className={`rounded-lg px-4 py-1.5 text-xs font-bold ${
                  myFollow
                    ? 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    : 'bg-brand-500 text-white hover:bg-brand-600'
                }`}
              >
                {myFollow ? '已关注（点击取关）' : '+ 关注'}
              </button>
            </form>
          )}
          {!me && (
            <Link
              href={`/login?error=${encodeURIComponent('关注球友需要先登录')}`}
              className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-600"
            >
              + 关注
            </Link>
          )}
        </div>
        {venue && venue.intro && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">
            {venue.intro}
            {venue.address ? `（${venue.address}）` : ''}
          </p>
        )}
      </div>

      {/* TA 发布的赛事（认证球馆） */}
      {publishedEvents.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-bold text-gray-900">发布的赛事</h2>
          <div className="space-y-2">
            {publishedEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="block rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm hover:border-brand-300"
              >
                <span className="font-semibold text-gray-900">{ev.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {ev.city} · {ev.raceDateText}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* TA 的帖子 */}
      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold text-gray-900">TA 的作品（{posts.length}）</h2>
        <div className="space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-xl border border-gray-200 bg-white p-4">
              {post.title && <h3 className="text-sm font-bold text-gray-900">{post.title}</h3>}
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                {post.content}
              </p>
              <p className="mt-2 text-xs text-gray-400">
                {post.createdAt.toLocaleDateString('zh-CN')} · {post.likeCount} 赞 · {post.commentCount} 评论
              </p>
            </article>
          ))}
          {posts.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-xs text-gray-400">
              还没有发布过作品
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
