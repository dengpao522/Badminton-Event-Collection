import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createPostAction } from '../actions';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { TOPICS } from '@/lib/constants';

export const metadata: Metadata = { title: '发布作品' };
export const dynamic = 'force-dynamic';

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

/**
 * 发帖页：标题可选 + 正文 + 最多 4 张图
 * 话题单选（默认「球友闲聊」）；可关联赛事（赛事讨论区跳转时经 searchParams 预填）
 */
export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; eventId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('发帖需要先登录')}`);
  const { error, eventId } = await searchParams;

  // 关联赛事下拉数据源：已发布赛事（按比赛日排序），MVP 数量少一次全查
  const events = await prisma.event.findMany({
    where: { isPublished: true },
    orderBy: [{ raceDateStart: 'asc' }],
    select: { id: true, name: true, city: true, raceDateText: true },
  });
  // 预填的赛事需真实存在（不存在则静默忽略，不阻断发帖）
  const selectedEvent = eventId ? events.find((e) => e.id === eventId) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-extrabold text-gray-900">发布作品</h1>
      <p className="mt-1.5 text-sm leading-6 text-gray-500">
        约球心得、比赛战报、装备评测、球馆探店——羽球生活都可以分享。
      </p>
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6">
        <form action={createPostAction} className="space-y-4">
          {/* 话题单选：chips 单选按钮组，默认闲聊 */}
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">话题</span>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t, i) => (
                <label key={t} className="cursor-pointer">
                  {/* 隐藏 radio + 兄弟选择器实现选中态高亮（无 JS） */}
                  <input
                    type="radio"
                    name="topic"
                    value={t}
                    defaultChecked={i === 0}
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700">
                    {t}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <input name="title" maxLength={60} placeholder="标题（选填）" className={inputCls} />
          <textarea
            name="content"
            required
            rows={8}
            maxLength={5000}
            placeholder="正文（必填）…"
            className={inputCls}
          />

          {/* 关联赛事：赛事讨论区入口跳转时预填；下拉可改选/留空为纯闲聊帖 */}
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-gray-700">关联赛事（选填，发布后进入赛事讨论区）</span>
            <select name="eventId" defaultValue={selectedEvent?.id ?? ''} className={inputCls}>
              <option value="">不关联</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  [{e.city}] {e.name}（{e.raceDateText}）
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-gray-700">图片（最多 4 张，单张 ≤ 5MB）</span>
            <input
              name="images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-600"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            发布
          </button>
          <p className="text-center text-xs text-gray-400">
            请勿发布广告、虚假信息与人身攻击内容，违规将被删除
          </p>
        </form>
      </div>
    </div>
  );
}
