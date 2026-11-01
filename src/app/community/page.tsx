import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { toggleLikeAction, createCommentAction } from './actions';

export const metadata: Metadata = { title: '社区' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

/** 时间的人话展示：N 分钟前 / N 小时前 / 日期 */
function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return date.toLocaleDateString('zh-CN');
}

/** 社区流：全站帖子按时间倒序（MVP 不做算法推荐），登录后可点赞/评论 */
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const me = await getCurrentUser();
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (pageNum - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1, // 多取一条判断是否有下一页
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      // 当前用户是否已点赞（用于按钮态）
      likes: me ? { where: { userId: me.id }, select: { id: true } } : false,
    },
  });
  const hasNext = posts.length > PAGE_SIZE;
  const list = posts.slice(0, PAGE_SIZE);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">球友社区</h1>
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
          const images: string[] = JSON.parse(post.images || '[]');
          const liked = Array.isArray(post.likes) && post.likes.length > 0;
          return (
            <article key={post.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              {/* 作者行 */}
              <div className="flex items-center gap-2.5">
                <Link href={`/u/${post.user.id}`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {post.user.name.slice(0, 1)}
                  </span>
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
                  <b className="text-gray-700">{post.commentCount}</b> 评论
                </span>
                {me ? (
                  <>
                    <form action={toggleLikeAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="back" value="/community" />
                      <button
                        type="submit"
                        className={`rounded-full px-2 py-1 font-semibold hover:bg-gray-100 ${
                          liked ? 'text-red-500' : 'text-gray-500'
                        }`}
                      >
                        {liked ? '♥' : '♡'} 点赞
                      </button>
                    </form>
                    {/* 评论输入（折叠在 details 里保持流清爽） */}
                    <details className="flex-1">
                      <summary className="cursor-pointer select-none rounded-full px-2 py-1 hover:bg-gray-100">
                        写评论
                      </summary>
                      <form action={createCommentAction} className="mt-2 flex gap-2">
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
                          发送
                        </button>
                      </form>
                    </details>
                  </>
                ) : (
                  <Link href="/login" className="text-brand-600 hover:underline">
                    登录后可点赞评论
                  </Link>
                )}
              </div>

              {/* 评论列表 */}
              {post.commentCount > 0 && (
                <div className="mt-2 space-y-1.5 rounded-lg bg-gray-50 px-3 py-2">
                  {/* 评论取最新若干条展示（MVP：全量取该帖评论的最近 5 条） */}
                  <CommentList postId={post.id} />
                </div>
              )}
            </article>
          );
        })}

        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="text-4xl">🏸</div>
            <p className="mt-3 text-sm font-bold text-gray-700">社区还没有内容</p>
            <p className="mt-1 text-xs text-gray-400">发布第一个作品：约球心得、比赛战报、装备分享都欢迎</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      {(pageNum > 1 || hasNext) && (
        <div className="mt-6 flex justify-between text-sm">
          {pageNum > 1 ? (
            <Link href={`/community?page=${pageNum - 1}`} className="text-brand-600 hover:underline">
              ← 上一页
            </Link>
          ) : (
            <span />
          )}
          {hasNext && (
            <Link href={`/community?page=${pageNum + 1}`} className="text-brand-600 hover:underline">
              下一页 →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** 服务端子组件：取单帖最近 5 条评论（含作者名） */
async function CommentList({ postId }: { postId: string }) {
  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: { select: { name: true } } },
  });
  return (
    <>
      {comments.map((c) => (
        <p key={c.id} className="text-xs leading-5 text-gray-600">
          <b className="text-gray-800">{c.user.name}</b>：{c.content}
        </p>
      ))}
    </>
  );
}
