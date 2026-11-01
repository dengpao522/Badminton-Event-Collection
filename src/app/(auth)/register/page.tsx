import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { registerAction } from '@/lib/auth-actions';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = { title: '注册' };

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

/** 注册页：邮箱+昵称+密码；已登录用户直接回首页 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect('/');
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-extrabold text-gray-900">注册全羽运动账号</h1>
        <p className="mt-1 text-xs text-gray-400">免注册也可浏览比赛与社区；发帖、发布赛事需登录</p>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form action={registerAction} className="mt-4 space-y-3">
          <input name="email" type="email" required placeholder="邮箱（用于登录）" className={inputCls} />
          <input name="name" required maxLength={20} minLength={2} placeholder="昵称（2-20 字，社区展示）" className={inputCls} />
          <input name="password" type="password" required minLength={8} placeholder="密码（至少 8 位）" className={inputCls} />
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            注册并登录
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          已有账号？
          <Link href="/login" className="ml-1 text-brand-600 hover:underline">
            去登录
          </Link>
        </p>
        <p className="mt-2 text-center text-[11px] leading-5 text-gray-400">
          注册即表示同意隐私政策：我们仅保存邮箱、昵称与密码哈希，不收集其他个人信息。
        </p>
      </div>
    </div>
  );
}
