import Link from 'next/link';
import { logoutAction } from '@/lib/auth-actions';
import { getCurrentUser } from '@/lib/session';

/** 站点头部：品牌标识 + 主导航 + 登录态（全羽运动） */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const isVenue = user?.venueProfile?.status === 'APPROVED';

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-base font-black text-white">
              羽
            </span>
            <span className="text-lg font-extrabold tracking-tight text-gray-900">
              全羽运动
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium text-gray-600">
            <Link href="/" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-700">
              找比赛
            </Link>
            <Link href="/community" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-700">
              社区
            </Link>
            <Link
              href="/submit"
              className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-700"
            >
              我要投稿
            </Link>
          </nav>
        </div>

        {/* 登录态区 */}
        <div className="flex items-center gap-1 text-sm font-medium text-gray-600">
          {user ? (
            <>
              {/* 已认证球馆：发布赛事入口 */}
              {isVenue && (
                <Link
                  href="/venue/events/new"
                  className="rounded-md bg-brand-500 px-3 py-1.5 font-semibold text-white hover:bg-brand-600"
                >
                  发布赛事
                </Link>
              )}
              {/* 未认证：球馆认证入口 */}
              {!user.venueProfile && (
                <Link
                  href="/venue/apply"
                  className="rounded-md px-3 py-1.5 text-gray-500 hover:bg-gray-100"
                >
                  球馆入驻
                </Link>
              )}
              {/* 我的主页（发帖/关注/提交的赛事） */}
              <Link
                href={`/u/${user.id}`}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-brand-50 hover:text-brand-700"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {user.name.slice(0, 1)}
                </span>
                {user.name}
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md px-2 py-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  退出
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/venue/apply" className="rounded-md px-3 py-1.5 text-gray-500 hover:bg-gray-100">
                球馆入驻
              </Link>
              <Link href="/login" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-700">
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-brand-500 px-3 py-1.5 font-semibold text-white hover:bg-brand-600"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
