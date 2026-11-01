import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { StatusBadge } from '@/components/StatusBadge';

export const metadata: Metadata = { title: '我发布的赛事' };
export const dynamic = 'force-dynamic';

/** 球馆工作台：我提交的赛事与审核状态 */
export default async function VenueDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('请先登录')}`);
  // getCurrentUser 已附带 venueProfile，未认证直接引导去申请页
  if (user.venueProfile?.status !== 'APPROVED') redirect('/venue/apply');
  const { submitted } = await searchParams;

  const events = await prisma.event.findMany({
    where: { submittedByUserId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">我发布的赛事</h1>
        <Link
          href="/venue/events/new"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
        >
          + 发布新赛事
        </Link>
      </div>

      {submitted && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">
          已提交审核，通过后将在前台「找比赛」上架
        </p>
      )}

      <div className="mt-5 space-y-3">
        {events.map((ev) => (          <div key={ev.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{ev.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {ev.city} · {ev.raceDateText}
                  {ev.venue ? ` · ${ev.venue}` : ''}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  ev.isPublished
                    ? 'bg-green-50 text-green-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {ev.isPublished ? '已上架' : '审核中'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <StatusBadge status={ev.status} />
              {ev.isPublished && (
                <Link href={`/events/${ev.id}`} className="text-brand-600 hover:underline">
                  查看前台页面 →
                </Link>
              )}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-400">
            还没有发布过赛事，点右上角「发布新赛事」开始
          </div>
        )}
      </div>
    </div>
  );
}
