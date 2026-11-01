/**
 * Next.js 服务启动钩子（官方 instrumentation 约定）
 * 仅在 nodejs 运行时启动提醒邮件调度器（每小时扫描，全羽运动订阅提醒）；
 * 爬虫自动采集为主站（全民运动）能力，羽毛球站不启用。edge 运行时直接跳过。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startNotifyScheduler } = await import('./lib/scheduler');
    startNotifyScheduler();
  }
}
