import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { loginAction } from '@/lib/auth-actions';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = { title: '登录' };

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

/** 登录页：邮箱+密码；已登录用户直接回首页 */
export default async function LoginPage({
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
        <h1 className="text-lg font-extrabold text-gray-900">登录全羽运动</h1>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form action={loginAction} className="mt-4 space-y-3">
          <input name="email" type="email" required placeholder="邮箱" className={inputCls} />
          <input name="password" type="password" required placeholder="密码" className={inputCls} />
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            登录
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          还没有账号？
          <Link href="/register" className="ml-1 text-brand-600 hover:underline">
            免费注册
          </Link>
        </p>
      </div>
    </div>
  );
}
