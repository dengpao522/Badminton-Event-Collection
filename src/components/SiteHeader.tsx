import Link from 'next/link';
import { logoutAction } from '@/lib/auth-actions';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { Avatar } from './Avatar';

/** 站点头部：品牌标识 + 主导航 + 登录态（全羽运动）
 *  窄屏适配：文字全部 nowrap 防竖排，次要入口（投稿/昵称/球馆入驻）按断点隐藏 */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const isVenue = user?.venueProfile?.status === 'APPROVED';
  // 未读通知数（已登录才查；查询失败按 0 处理不阻塞渲染）
  let unread = 0;
  if (user) {
    try {
      unread = await prisma.notification.count({ where: { userId: user.id, read: false } });
    } catch {
      unread = 0;
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 overflow-x-auto px-3 sm:px-4">
        {/* 左侧：品牌 + 主导航 */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-base font-black text-white">
              羽
            </span>
            {/* 小屏隐藏品牌文字，只留 Logo 方块 */}
            <span className="whitespace-nowrap text-lg font-extrabold tracking-tight text-gray-900 hidden sm:inline">
              全羽运动
            </span>
          </Link>
          <nav className="flex items-center gap-0.5 text-sm font-medium text-gray-600 sm:gap-1">
            <Link href="/" className="whitespace-nowrap rounded-md px-2 py-1.5 hover:bg-brand-50 hover:text-brand-700 sm:px-3">
              找比赛
            </Link>
            <Link href="/community" className="whitespace-nowrap rounded-md px-2 py-1.5 hover:bg-brand-50 hover:text-brand-700 sm:px-3">
              社区
            </Link>
            {/* 投稿入口：小屏隐藏（页脚与详情页仍有入口） */}
            <Link
              href="/submit"
              className="hidden whitespace-nowrap rounded-md px-2 py-1.5 hover:bg-brand-50 hover:text-brand-700 md:inline sm:px-3"
            >
              我要投稿
            </Link>
          </nav>
        </div>

        {/* 右侧：登录态区 */}
        <div className="flex items-center gap-0.5 text-sm font-medium text-gray-600 sm:gap-1">
          {user ? (
            <>
              {/* 已认证球馆：发布赛事入口 */}
              {isVenue && (
                <Link
                  href="/venue/events/new"
                  className="whitespace-nowrap rounded-md bg-brand-500 px-2.5 py-1.5 font-semibold text-white hover:bg-brand-600 sm:px-3"
                >
                  发布赛事
                </Link>
              )}
              {/* 未认证：球馆认证入口（小屏隐藏） */}
              {!user.venueProfile && (
                <Link
                  href="/venue/apply"
                  className="hidden whitespace-nowrap rounded-md px-2 py-1.5 text-gray-500 hover:bg-gray-100 sm:inline"
                >
                  球馆入驻
                </Link>
              )}
              {/* 通知铃铛（未读红点） */}
              <Link
                href="/notifications"
                aria-label="通知"
                className="relative shrink-0 rounded-md px-1.5 py-1.5 text-lg hover:bg-gray-100 sm:px-2"
              >
                🔔
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              {/* 我的主页（发帖/关注/提交的赛事）；小屏只留头像 */}
              <Link
                href={`/u/${user.id}`}
                aria-label="我的主页"
                className="flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1.5 hover:bg-brand-50 hover:text-brand-700 sm:px-2"
              >
                <Avatar name={user.name} avatar={user.avatar} size={24} />
                <span className="hidden max-w-24 truncate md:inline">{user.name}</span>
              </Link>
              {/* 账号设置 */}
              <Link
                href="/settings"
                className="whitespace-nowrap rounded-md px-2 py-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                设置
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-md px-2 py-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  退出
                </button>
              </form>
            </>
          ) : (
            <>
              {/* 未登录：球馆入驻（小屏隐藏） */}
              <Link
                href="/venue/apply"
                className="hidden whitespace-nowrap rounded-md px-2 py-1.5 text-gray-500 hover:bg-gray-100 sm:inline"
              >
                球馆入驻
              </Link>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-md px-2 py-1.5 hover:bg-brand-50 hover:text-brand-700"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="whitespace-nowrap rounded-md bg-brand-500 px-2.5 py-1.5 font-semibold text-white hover:bg-brand-600 sm:px-3"
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
