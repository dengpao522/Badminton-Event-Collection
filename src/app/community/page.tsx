import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { toggleLikeAction, createCommentAction } from './actions';
import { Avatar } from '@/components/Avatar';

export const metadata: Metadata = { title: '社区' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

/** 容错解析帖子图片 JSON：脏数据（非法 JSON/非数组）降级为空数组，避免整页 500 */
function parseImages(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** 时间的人话展示：N 分钟前 / N 小时前 / 日期 */
function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return date.toLocaleDateString('zh-CN');
}

/**
 * 社区流：最新 / 关注 两个 tab（登录可用关注流，只看关注的人+自己的帖子）
 * 评论全量随帖加载（MVP 数据量小，正序展示）
 */
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const me = await getCurrentUser();
  const { page, tab } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const activeTab = tab === 'following' && me ? 'following' : 'latest';

  // 关注流范围：我关注的人 + 我自己（自己发帖也在关注流可见）
  let followedIds: string[] = [];
  if (activeTab === 'following' && me) {
    const follows = await prisma.follow.findMany({
      where: { followerId: me.id },
      select: { followingId: true },
    });
    followedIds = [...follows.map((f) => f.followingId), me.id];
  }

  const posts = await prisma.post.findMany({
    where: activeTab === 'following' ? { userId: { in: followedIds } } : {},
    orderBy: { createdAt: 'desc' },
    skip: (pageNum - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1, // 多取一条判断是否有下一页
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      // 当前用户是否已点赞（用于按钮态）
      likes: me ? { where: { userId: me.id }, select: { id: true } } : false,
      // 评论全量（正序），含作者名
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  const hasNext = posts.length > PAGE_SIZE;
  const list = posts.slice(0, PAGE_SIZE);

  /** 分页链接保持当前 tab */
  const pageHref = (p: number) => `/community?tab=${activeTab}&page=${p}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-900">球友社区</h1>
          {/* tab 切换 */}
          <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
            <Link
              href="/community"
              className={`rounded-md px-3 py-1.5 ${activeTab === 'latest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              最新
            </Link>
            {me && (
              <Link
                href="/community?tab=following"
                className={`rounded-md px-3 py-1.5 ${activeTab === 'following' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                关注
              </Link>
            )}
          </div>
        </div>
        {me ? (
          <Link
            href="/community/new"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            + 发布作品
          </Link>
        ) : (
          <Link
            href={`/login?error=${encodeURIComponent('发帖需要先登录')}`}
            className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-bold text-brand-600 hover:bg-brand-50"
          >
            登录后发帖
          </Link>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {list.map((post) => {
          const images = parseImages(post.images);
          const liked = Array.isArray(post.likes) && post.likes.length > 0;
          return (
            <article key={post.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              {/* 作者行 */}
              <div className="flex items-center gap-2.5">
                <Link href={`/u/${post.user.id}`}>
                  <Avatar name={post.user.name} avatar={post.user.avatar} size={36} />
                </Link>
                <div className="min-w-0">
                  <Link href={`/u/${post.user.id}`} className="text-sm font-bold text-gray-900 hover:text-brand-600">
                    {post.user.name}
                  </Link>
                  <p className="text-xs text-gray-400">{timeAgo(post.createdAt)}</p>
                </div>
              </div>

              {/* 正文 */}
              {post.title && <h2 className="mt-3 text-base font-bold text-gray-900">{post.title}</h2>}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{post.content}</p>

              {/* 图片网格（本地 uploads 静态文件，MVP 用原生 img，部署换 OSS 时再引入 next/image） */}
              {images.length > 0 && (
                <div className={`mt-3 grid gap-2 ${images.length === 1 ? '' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {images.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element -- 本地 uploads 原生展示
                    <img key={src} src={src} alt="帖子图片" className="w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}

              {/* 互动行 */}
              <div className="mt-3 flex items-center gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                <span>
                  <b className="text-gray-700">{post.likeCount}</b> 赞 ·{' '}
                  <b className="text-gray-700">{post.comments.length}</b> 评论
                </span>
                {me ? (
                  <form action={toggleLikeAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="back" value={`/community?tab=${activeTab}&page=${pageNum}`} />
                    <button
                      type="submit"
                      className={`rounded-full px-2 py-1 font-semibold hover:bg-gray-100 ${
                        liked ? 'text-red-500' : 'text-gray-500'
                      }`}
                    >
                      {liked ? '♥' : '♡'} 点赞
                    </button>
                  </form>
                ) : (
                  <Link href="/login" className="text-brand-600 hover:underline">
                    登录后可点赞评论
                  </Link>
                )}
              </div>

              {/* 评论列表（全量，正序） */}
              {post.comments.length > 0 && (
                <div className="mt-2 space-y-1.5 rounded-lg bg-gray-50 px-3 py-2.5">
                  {post.comments.map((c) => (
                    <p key={c.id} className="text-xs leading-5 text-gray-600">
                      <Link href={`/u/${c.user.id}`} className="font-bold text-gray-800 hover:text-brand-600">
                        {c.user.name}
                      </Link>
                      ：{c.content}
                    </p>
                  ))}
                </div>
              )}

              {/* 评论输入 */}
              {me && (
                <form action={createCommentAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="postId" value={post.id} />
                  <input
                    name="content"
                    required
                    maxLength={500}
                    placeholder="说点什么…"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600"
                  >
                    评论
                  </button>
                </form>
              )}
            </article>
          );
        })}

        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="text-4xl">🏸</div>
            {activeTab === 'following' ? (
              <>
                <p className="mt-3 text-sm font-bold text-gray-700">关注的人还没有发帖</p>
                <p className="mt-1 text-xs text-gray-400">去「最新」里发现球友并关注，TA 的动态会出现在这里</p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm font-bold text-gray-700">社区还没有内容</p>
                <p className="mt-1 text-xs text-gray-400">发布第一个作品：约球心得、比赛战报、装备分享都欢迎</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* 分页 */}
      {(pageNum > 1 || hasNext) && (
        <div className="mt-6 flex justify-between text-sm">
          {pageNum > 1 ? (
            <Link href={pageHref(pageNum - 1)} className="text-brand-600 hover:underline">
              ← 上一页
            </Link>
          ) : (
            <span />
          )}
          {hasNext && (
            <Link href={pageHref(pageNum + 1)} className="text-brand-600 hover:underline">
              下一页 →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
