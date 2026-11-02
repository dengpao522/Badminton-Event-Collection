import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { toggleLikeAction, createCommentAction } from './actions';
import { Avatar } from '@/components/Avatar';
import { TOPICS } from '@/lib/constants';
import { getUserLevel } from '@/lib/level';

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
 * 社区流：最新 / 关注 两个 tab + 话题筛选 chips
 * 关注流只看关注的人+自己的帖子；评论支持盖楼回复（回复 @某人）
 */
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; topic?: string }>;
}) {
  const me = await getCurrentUser();
  const { page, tab, topic } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const activeTab = tab === 'following' && me ? 'following' : 'latest';
  // 话题筛选：白名单外取值视为全部
  const activeTopic = topic && (TOPICS as readonly string[]).includes(topic) ? topic : '';

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
    where: {
      ...(activeTab === 'following' ? { userId: { in: followedIds } } : {}),
      ...(activeTopic ? { topic: activeTopic } : {}),
    },
    orderBy: { createdAt: 'desc' },
    skip: (pageNum - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1, // 多取一条判断是否有下一页
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      event: { select: { id: true, name: true } }, // 关联赛事（讨论区来源标记）
      // 当前用户是否已点赞（用于按钮态）
      likes: me ? { where: { userId: me.id }, select: { id: true } } : false,
      // 评论全量（正序），含作者名与盖楼回复目标
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true } },
          replyTo: { select: { name: true } },
        },
      },
    },
  });
  const hasNext = posts.length > PAGE_SIZE;
  const list = posts.slice(0, PAGE_SIZE);

  // 帖子作者等级：逐帖计算（发帖数×5 + 获赞）。数据量小可接受；
  // 去重后批量算，避免同一作者重复查询
  const levelCache = new Map<string, Awaited<ReturnType<typeof getUserLevel>>>();
  for (const p of list) {
    if (!levelCache.has(p.user.id)) {
      levelCache.set(p.user.id, await getUserLevel(prisma, p.user.id));
    }
  }

  /** 分页/筛选链接保持当前 tab 与话题 */
  const pageHref = (p: number) =>
    `/community?tab=${activeTab}${activeTopic ? `&topic=${encodeURIComponent(activeTopic)}` : ''}&page=${p}`;
  const topicHref = (t: string) =>
    `/community?tab=${activeTab}${t ? `&topic=${encodeURIComponent(t)}` : ''}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-900">球友社区</h1>
          {/* tab 切换 */}
          <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
            <Link
              href={topicHref('')}
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

      {/* 话题筛选 chips（「全部」+ 六大话题） */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={topicHref('')}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            activeTopic ? 'border-gray-300 text-gray-600' : 'border-brand-500 bg-brand-50 text-brand-700'
          }`}
        >
          全部
        </Link>
        {TOPICS.map((t) => (
          <Link
            key={t}
            href={topicHref(t)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              activeTopic === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-600 hover:border-brand-300'
            }`}
          >
            # {t}
          </Link>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {list.map((post) => {
          const images = parseImages(post.images);
          const liked = Array.isArray(post.likes) && post.likes.length > 0;
          const level = levelCache.get(post.user.id)!;
          const back = pageHref(pageNum);
          return (
            <article key={post.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              {/* 作者行：头像 + 昵称 + 等级徽章 + 时间 */}
              <div className="flex items-center gap-2.5">
                <Link href={`/u/${post.user.id}`}>
                  <Avatar name={post.user.name} avatar={post.user.avatar} size={36} />
                </Link>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/u/${post.user.id}`} className="text-sm font-bold text-gray-900 hover:text-brand-600">
                      {post.user.name}
                    </Link>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${level.cls}`}>
                      {level.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{timeAgo(post.createdAt)}</p>
                </div>
              </div>

              {/* 话题 + 关联赛事标记 */}
              {(post.topic || post.event) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {post.topic && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                      # {post.topic}
                    </span>
                  )}
                  {post.event && (
                    <Link
                      href={`/events/${post.event.id}`}
                      className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-100"
                    >
                      🏸 {post.event.name}
                    </Link>
                  )}
                </div>
              )}

              {/* 正文 */}
              {post.title && <h2 className="mt-3 text-base font-bold text-gray-900">{post.title}</h2>}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{post.content}</p>

              {/* 图片网格（本地 uploads 静态文件，MVP 用原生 img，部署换 OSS 时再引入 next/image） */}
              {images.length > 0 && (
                <div className={`mt-3 grid gap-2 ${images.length === 1 ? '' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {images.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element -- 本地 uploads 原生展示
                    <img key={src} src={src} alt="帖子图片" loading="lazy" className="w-full rounded-lg object-cover" />
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
                    <input type="hidden" name="back" value={back} />
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

              {/* 评论列表（全量，正序；盖楼显示「回复 @某人」） */}
              {post.comments.length > 0 && (
                <div className="mt-2 space-y-1.5 rounded-lg bg-gray-50 px-3 py-2.5">
                  {post.comments.map((c) => (
                    <div key={c.id} className="text-xs leading-5 text-gray-600">
                      <p>
                        <Link href={`/u/${c.user.id}`} className="font-bold text-gray-800 hover:text-brand-600">
                          {c.user.name}
                        </Link>
                        {c.replyTo && (
                          <span className="text-gray-400"> 回复 @{c.replyTo.name}</span>
                        )}
                        ：{c.content}
                      </p>
                      {/* 回复入口：details/summary 无 JS 展开，提交后带 replyTo 盖楼 */}
                      {me && (
                        <details className="mt-0.5">
                          <summary className="w-fit cursor-pointer select-none text-[10px] text-gray-400 hover:text-brand-600">
                            回复
                          </summary>
                          <form action={createCommentAction} className="mt-1.5 flex gap-2">
                            <input type="hidden" name="postId" value={post.id} />
                            <input type="hidden" name="replyTo" value={c.id} />
                            <input
                              name="content"
                              required
                              maxLength={500}
                              placeholder={`回复 @${c.user.name}…`}
                              className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs outline-none focus:border-brand-500"
                            />
                            <button
                              type="submit"
                              className="rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-brand-600"
                            >
                              回复
                            </button>
                          </form>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 评论输入（直接评论帖主） */}
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
                <p className="mt-3 text-sm font-bold text-gray-700">
                  {activeTopic ? `「${activeTopic}」话题下还没有内容` : '社区还没有内容'}
                </p>
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
