import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { toggleFollowAction } from './actions';
import { toggleBookmarkAction, deletePostAction } from '../../community/actions';
import { Avatar } from '@/components/Avatar';
import { getUserLevel } from '@/lib/level';

export const dynamic = 'force-dynamic';

/**
 * 个人主页（参考抖音/小红书）：
 * 资料卡（关注/粉丝/好友/获赞 数据化，可点击进列表）+ 内容 tab（作品/收藏）
 * 收藏 tab 仅本人可见；好友 = 互相关注
 */
export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const me = await getCurrentUser();

  const user = await prisma.user.findUnique({
    where: { id },
    include: { venueProfile: true },
  });
  if (!user) notFound();

  const isMe = me?.id === id;
  const venue = user.venueProfile?.status === 'APPROVED' ? user.venueProfile : null;
  const level = await getUserLevel(prisma, id);
  const activeTab = tab === 'bookmarks' && isMe ? 'bookmarks' : 'works';

  // 社交数据并行取：
  // - 关注/粉丝的 ID 集合用于算「好友」（互相关注）数
  // - 获赞总数 = 该用户全部帖子的赞数合计
  const [followerCount, followingCount, myFollowingRows, myFollowerRows, likeAgg, publishedEvents, myFollow] =
    await Promise.all([
      prisma.follow.count({ where: { followingId: id } }),
      prisma.follow.count({ where: { followerId: id } }),
      prisma.follow.findMany({ where: { followerId: id }, select: { followingId: true } }),
      prisma.follow.findMany({ where: { followingId: id }, select: { followerId: true } }),
      prisma.post.aggregate({ where: { userId: id }, _sum: { likeCount: true } }),
      prisma.event.findMany({
        where: { submittedByUserId: id, isPublished: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      me
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: me.id, followingId: id } },
          })
        : null,
    ]);

  // 内容数据按 tab 独立查询（分开查让 TS 正确收窄类型，避免联合类型访问报错）：
  // 作品 = 最近 20 帖；收藏（仅本人）= 最近 20 条收藏记录带原帖
  const workPosts =
    activeTab === 'works'
      ? await prisma.post.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : [];
  const bookmarkRows =
    activeTab === 'bookmarks'
      ? await prisma.bookmark.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { post: { include: { user: { select: { id: true, name: true } } } } },
        })
      : [];

  // 好友 = 互相关注（我关注的人里，对方也关注我的）
  const followingIdSet = new Set(myFollowingRows.map((r) => r.followingId));
  const friendsCount = myFollowerRows.filter((r) => followingIdSet.has(r.followerId)).length;
  const likeTotal = likeAgg._sum.likeCount ?? 0;

  /** 数据项链接：关注/粉丝/好友进社交列表页 */
  const statHref = (t: string) => `/u/${id}/social?tab=${t}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* 资料卡（抖音/小红书式：头像 + 昵称 + 徽章行 + bio + 互动数据行 + 操作按钮） */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <Avatar name={user.name} avatar={user.avatar} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold text-gray-900">{user.name}</h1>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${level.cls}`}>
                {level.label}
              </span>
              {venue && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  🏸 认证球馆 · {venue.venueName}
                </span>
              )}
            </div>
            {/* 个人介绍：空时给引导文案，避免主页空荡荡 */}
            <p className="mt-1 text-sm leading-6 text-gray-600">
              {user.bio || (isMe ? <span className="text-gray-400">还没有简介，去「设置」写一句让球友认识你</span> : <span className="text-gray-400">这位球友很神秘，什么都没留下</span>)}
            </p>
            {/* 互动数据行：抖音式数字 + 可点击 */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <Link href={statHref('follows')} className="text-gray-600 hover:text-brand-600">
                <b className="font-bold text-gray-900">{followingCount}</b> 关注
              </Link>
              <Link href={statHref('followers')} className="text-gray-600 hover:text-brand-600">
                <b className="font-bold text-gray-900">{followerCount}</b> 粉丝
              </Link>
              {friendsCount > 0 && (
                <Link href={statHref('friends')} className="text-gray-600 hover:text-brand-600">
                  <b className="font-bold text-gray-900">{friendsCount}</b> 好友
                </Link>
              )}
              <span className="text-gray-600">
                <b className="font-bold text-gray-900">{likeTotal}</b> 获赞
              </span>
            </div>
          </div>
          {/* 操作区：本人（编辑资料）；他人（关注 + 私信）；未登录（去关注） */}
          {isMe && (
            <div className="flex shrink-0 flex-col gap-2">
              <Link
                href="/settings"
                className="rounded-lg border border-gray-300 px-4 py-1.5 text-center text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                ✏️ 编辑资料
              </Link>
              <Link
                href="/messages"
                className="rounded-lg border border-gray-300 px-4 py-1.5 text-center text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                💬 我的私信
              </Link>
            </div>
          )}
          {!isMe && me && (
            <div className="flex shrink-0 flex-col gap-2">
              <form action={toggleFollowAction}>
                <input type="hidden" name="targetId" value={id} />
                <input type="hidden" name="back" value={`/u/${id}`} />
                <button
                  type="submit"
                  className={`w-full rounded-lg px-4 py-1.5 text-xs font-bold ${
                    myFollow
                      ? 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      : 'bg-brand-500 text-white hover:bg-brand-600'
                  }`}
                >
                  {myFollow ? '已关注（点击取关）' : '+ 关注'}
                </button>
              </form>
              <Link
                href={`/messages/${id}`}
                className="rounded-lg border border-gray-300 px-4 py-1.5 text-center text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                💬 私信
              </Link>
            </div>
          )}
          {!me && (
            <Link
              href={`/login?error=${encodeURIComponent('关注球友需要先登录')}`}
              className="shrink-0 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-600"
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

      {/* 内容 tab：作品 / 收藏（仅本人可见收藏） */}
      <div className="mt-5 flex gap-6 border-b border-gray-200 text-sm font-bold">
        <Link
          href={`/u/${id}`}
          className={`-mb-px border-b-2 pb-2 ${
            activeTab === 'works' ? 'border-brand-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          作品
        </Link>
        {isMe && (
          <Link
            href={`/u/${id}?tab=bookmarks`}
            className={`-mb-px border-b-2 pb-2 ${
              activeTab === 'bookmarks' ? 'border-brand-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            🔖 收藏
          </Link>
        )}
      </div>

      {/* TA 发布的赛事（认证球馆）：仅作品 tab 下展示 */}
      {activeTab === 'works' && publishedEvents.length > 0 && (
        <section className="mt-4">
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

      {/* 内容列表：作品 或 收藏 */}
      <section className="mt-4 space-y-3">
        {activeTab === 'works' &&
          workPosts.map((post) => (
            <div key={post.id}>
              <PostCard
                title={post.title}
                content={post.content}
                meta={`${post.createdAt.toLocaleDateString('zh-CN')} · ${post.likeCount} 赞 · ${post.commentCount} 评论 · ${post.bookmarkCount} 收藏`}
              />
              {/* 删除自己的作品（本人主页可见，details 展开防误触） */}
              {isMe && (
                <details className="mt-1">
                  <summary className="w-fit cursor-pointer select-none text-xs text-gray-300 hover:text-gray-500">
                    ⋯
                  </summary>
                  <form action={deletePostAction} className="mt-1">
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="back" value={`/u/${id}`} />
                    <button type="submit" className="text-xs font-semibold text-red-500 hover:bg-red-50 rounded-md px-2 py-1">
                      删除作品
                    </button>
                  </form>
                </details>
              )}
            </div>
          ))}
        {activeTab === 'bookmarks' &&
          bookmarkRows.map((b) => (
            <div key={b.id}>
              <PostCard
                title={b.post.title}
                content={b.post.content}
                meta={`${b.post.createdAt.toLocaleDateString('zh-CN')} · 来自 @${b.post.user.name} · ${b.post.likeCount} 赞 · ${b.post.commentCount} 评论`}
              />
              {/* 收藏管理：跳原帖（社区对应话题）+ 取消收藏 */}
              <div className="mt-1 flex items-center gap-3 text-xs">
                <Link
                  href={`/community?topic=${encodeURIComponent(b.post.topic || '')}`}
                  className="text-brand-600 hover:underline"
                >
                  去社区查看 →
                </Link>
                <form action={toggleBookmarkAction}>
                  <input type="hidden" name="postId" value={b.postId} />
                  <input type="hidden" name="back" value={`/u/${id}?tab=bookmarks`} />
                  <button type="submit" className="text-gray-400 hover:text-red-500">
                    取消收藏
                  </button>
                </form>
              </div>
            </div>
          ))}
        {(activeTab === 'works' ? workPosts.length === 0 : bookmarkRows.length === 0) && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-xs text-gray-400">
            {activeTab === 'works'
              ? isMe
                ? '还没有发布过作品，去社区发第一帖吧'
                : 'TA 还没有发布过作品'
              : '收藏夹是空的：在社区点帖子下的「☆ 收藏」就能存到这里（仅你自己可见）'}
          </div>
        )}
      </section>
    </div>
  );
}

/** 帖子摘要卡（作品/收藏两个 tab 共用样式） */
function PostCard({ title, content, meta }: { title: string; content: string; meta: string }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      {title && <h3 className="text-sm font-bold text-gray-900">{title}</h3>}
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">{content}</p>
      <p className="mt-2 text-xs text-gray-400">{meta}</p>
    </article>
  );
}
