import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { submitVenueEventAction } from '../../actions';
import { getCurrentUser, isApprovedVenue } from '@/lib/session';
import { ALL_CITIES } from '@/lib/constants';

export const metadata: Metadata = { title: '发布赛事' };
export const dynamic = 'force-dynamic';

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
const labelCls = 'block text-sm font-semibold text-gray-700';

/** 球馆发布赛事：仅已认证球馆可见；提交后为草稿，运营审核上架 */
export default async function VenueEventNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('发布赛事需要先登录')}`);
  if (!isApprovedVenue(user)) redirect('/venue/apply');
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-extrabold text-gray-900">发布羽毛球赛事</h1>
      <p className="mt-1.5 text-sm leading-6 text-gray-500">
        以「{user.venueProfile?.venueName}」名义发布。提交后进入运营审核，通过后在前台上架并通知订阅球友。
      </p>
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6">
        <form action={submitVenueEventAction} className="space-y-4">
          <label className="block text-sm">
            <span className={labelCls}>赛事名称 *</span>
            <input name="name" required maxLength={80} className={`mt-1 ${inputCls}`} placeholder="如：动力杯周末双打循环赛（第12期）" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className={labelCls}>城市 *</span>
              <select name="city" required defaultValue={user.venueProfile?.city ?? '上海'} className={`mt-1 ${inputCls}`}>
                {ALL_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className={labelCls}>比赛地点</span>
              <input name="venue" maxLength={100} defaultValue={user.venueProfile?.venueName} className={`mt-1 ${inputCls}`} placeholder="默认球馆名称，可修改" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className={labelCls}>比赛日期（原文）*</span>
              <input name="raceDateText" required maxLength={50} className={`mt-1 ${inputCls}`} placeholder="如：11月16日（周日）14:00-18:00" />
            </label>
            <label className="text-sm">
              <span className={labelCls}>报名截止（原文）</span>
              <input name="deadlineText" maxLength={50} className={`mt-1 ${inputCls}`} placeholder="如：11月14日 18:00 截止 或 报满即止" />
            </label>
          </div>
          <label className="block text-sm">
            <span className={labelCls}>报名方式说明</span>
            <textarea
              name="registerGuide"
              rows={3}
              maxLength={300}
              className={`mt-1 ${inputCls}`}
              placeholder="参赛条件、费用、组队方式、联系电话等（300 字内）"
            />
          </label>
          <label className="block text-sm">
            <span className={labelCls}>报名直链（选填）</span>
            <input name="registerUrl" type="url" className={`mt-1 ${inputCls}`} placeholder="https://...（报名页/接龙/表单链接）" />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            提交审核
          </button>
          <p className="text-center text-xs text-gray-400">
            提交即表示信息真实有效；虚假赛事将被驳回并可能取消发布权限
          </p>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href="/venue/dashboard" className="text-brand-600 hover:underline">
          ← 查看我发布的赛事
        </Link>
      </p>
    </div>
  );
}
