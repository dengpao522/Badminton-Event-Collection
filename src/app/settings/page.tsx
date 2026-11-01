import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { updateProfileAction } from './actions';
import { getCurrentUser } from '@/lib/session';
import { Avatar } from '@/components/Avatar';

export const metadata: Metadata = { title: '账号设置' };
export const dynamic = 'force-dynamic';

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
const labelCls = 'block text-sm font-semibold text-gray-700';

/** 账号设置：改昵称 / 简介 / 头像；邮箱不可改（登录标识） */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('请先登录')}`);
  const { error, saved } = await searchParams;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-xl font-extrabold text-gray-900">账号设置</h1>
      {saved && <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">资料已更新</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6">
        {/* 当前头像预览 */}
        <div className="flex items-center gap-4">
          <Avatar name={user.name} avatar={user.avatar} size={56} />
          <div className="text-xs text-gray-400">
            {user.email}
            <br />
            头像可在下方表单更换
          </div>
        </div>

        <form action={updateProfileAction} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className={labelCls}>昵称 *</span>
            <input name="name" required minLength={2} maxLength={20} defaultValue={user.name} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="block text-sm">
            <span className={labelCls}>个人简介（100 字内，主页展示）</span>
            <textarea
              name="bio"
              rows={3}
              maxLength={100}
              defaultValue={user.bio}
              placeholder="如：周末单打党，浦东活动常驻"
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <label className="block text-sm">
            <span className={labelCls}>更换头像（JPG/PNG/WebP，≤ 5MB）</span>
            <input
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-600"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            保存资料
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href={`/u/${user.id}`} className="text-brand-600 hover:underline">
          查看我的主页 →
        </Link>
      </p>
    </div>
  );
}
