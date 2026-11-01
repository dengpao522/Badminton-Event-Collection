import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { approveVenueAction, rejectVenueAction } from '../actions';

export const metadata: Metadata = { title: '球馆认证' };
export const dynamic = 'force-dynamic';

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500';

/** 球馆认证审核：待审列表 + 通过/驳回（驳回需填原因） */
export default async function AdminVenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  await requireAdmin();
  const { done } = await searchParams;

  const profiles = await prisma.venueProfile.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], // PENDING 排最前（字母序 PENDING<REJECTED……不行，PENDING<R? R<P？字母序 APPROVED<REJECTED/PENDING……直接前端分组）
    include: { user: true },
  });
  const pending = profiles.filter((p) => p.status === 'PENDING');
  const reviewed = profiles.filter((p) => p.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">球馆认证</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          认证通过后球馆即可在本站发布赛事（发布内容仍会在赛事管理中逐条审核）。
          {done === 'approved' && <span className="ml-2 font-semibold text-green-600">已通过认证</span>}
          {done === 'rejected' && <span className="ml-2 font-semibold text-amber-600">已驳回</span>}
        </p>
      </div>

      {/* 待审核 */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-900">待审核（{pending.length}）</h2>
        <div className="space-y-3">
          {pending.map((p) => (
            <div key={p.id} className="rounded-xl border border-amber-200 bg-white p-4">
              <p className="text-sm font-bold text-gray-900">
                {p.venueName}
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {p.city} · 申请人 {p.user.name}（{p.user.email}）
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                电话：{p.phone}
                {p.address ? ` · 地址：${p.address}` : ''}
              </p>
              {p.intro && <p className="mt-1 text-xs leading-5 text-gray-600">{p.intro}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={approveVenueAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-green-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-green-600"
                  >
                    通过认证
                  </button>
                </form>
                <form action={rejectVenueAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="reviewNote" placeholder="驳回原因（必填）" required maxLength={100} className={inputCls} />
                  <button
                    type="submit"
                    className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    驳回
                  </button>
                </form>
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-xs text-gray-400">
              暂无待审核申请
            </div>
          )}
        </div>
      </section>

      {/* 已处理 */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-900">已处理（{reviewed.length}）</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
            {reviewed.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5 last:border-0">
                <span className="truncate text-gray-700">
                  {p.venueName}
                  <span className="ml-2 text-xs text-gray-400">{p.user.email}</span>
                  {p.reviewNote && <span className="ml-2 text-xs text-red-400">（{p.reviewNote}）</span>}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.status === 'APPROVED' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                  }`}
                >
                  {p.status === 'APPROVED' ? '已认证' : '已驳回'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
