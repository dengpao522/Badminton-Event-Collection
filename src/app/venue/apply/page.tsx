import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { applyVenueAction } from '../actions';
import { getCurrentUser } from '@/lib/session';
import { CITIES } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: '球馆入驻' };
export const dynamic = 'force-dynamic';

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
const labelCls = 'block text-sm font-semibold text-gray-700';

const STATUS_TEXT: Record<string, { label: string; cls: string }> = {
  PENDING: { label: '审核中', cls: 'bg-amber-50 text-amber-600 border-amber-100' },
  APPROVED: { label: '已认证', cls: 'bg-green-50 text-green-600 border-green-100' },
  REJECTED: { label: '已驳回', cls: 'bg-red-50 text-red-600 border-red-100' },
};

/**
 * 球馆入驻页：登录用户提交场馆资料申请认证；
 * 认证通过后获得「发布赛事」权限。驳回后可修改重新提交。
 */
export default async function VenueApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('球馆入驻需要先登录账号')}`);
  const { error, saved } = await searchParams;
  const profile = await prismaVenueProfile(user.id);
  const st = profile ? STATUS_TEXT[profile.status] : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-extrabold text-gray-900">球馆入驻</h1>
      <p className="mt-1.5 text-sm leading-6 text-gray-500">
        认证通过后，你的球馆可以在本站发布赛事（业余赛/会员赛/包场赛等），经运营审核后上架供球友报名。
      </p>

      {/* 当前认证状态 */}
      {profile && st && (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${st.cls}`}>
          认证状态：<b>{st.label}</b>
          {profile.status === 'REJECTED' && profile.reviewNote && (
            <span className="ml-2">驳回原因：{profile.reviewNote}</span>
          )}
          {profile.status === 'APPROVED' && (
            <Link href="/venue/events/new" className="ml-2 font-semibold underline">
              去发布赛事 →
            </Link>
          )}
          {profile.status === 'PENDING' && <span className="ml-2">运营会尽快审核，通过后此处出现发布入口</span>}
        </div>
      )}
      {saved && <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">已提交，等待运营审核</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* 已认证球馆不再展示表单 */}
      {profile?.status !== 'APPROVED' && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6">
          <form action={applyVenueAction} className="space-y-4">
            <label className="block text-sm">
              <span className={labelCls}>球馆名称 *</span>
              <input name="venueName" required maxLength={30} defaultValue={profile?.venueName} className={`mt-1 ${inputCls}`} placeholder="如：动力羽毛球馆" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className={labelCls}>城市 *</span>
                <select name="city" required defaultValue={profile?.city ?? '上海'} className={`mt-1 ${inputCls}`}>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className={labelCls}>联系电话 *</span>
                <input name="phone" required maxLength={20} defaultValue={profile?.phone} className={`mt-1 ${inputCls}`} placeholder="用于核实场馆信息" />
              </label>
            </div>
            <label className="block text-sm">
              <span className={labelCls}>场馆地址</span>
              <input name="address" maxLength={60} defaultValue={profile?.address} className={`mt-1 ${inputCls}`} placeholder="如：浦东新区张江路 100 号" />
            </label>
            <label className="block text-sm">
              <span className={labelCls}>场馆介绍</span>
              <textarea
                name="intro"
                rows={3}
                maxLength={500}
                defaultValue={profile?.intro}
                className={`mt-1 ${inputCls}`}
                placeholder="场地数量、木地板/塑胶、更衣淋浴、常办活动等，有助于加快审核"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
            >
              {profile ? '修改并重新提交' : '提交认证申请'}
            </button>
            <p className="text-center text-xs text-gray-400">提交后运营将通过电话核实场馆信息，一般 1-2 天内完成审核</p>
          </form>
        </div>
      )}
    </div>
  );
}

/** 小工具：查当前用户球馆资料（避免组件内多处重复查询） */
function prismaVenueProfile(userId: string) {
  return prisma.venueProfile.findUnique({ where: { userId } });
}
