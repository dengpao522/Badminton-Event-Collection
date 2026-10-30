/**
 * 站点级常量：基础 URL 与站点名（SEO 共用）——全羽运动（羽毛球垂直站）
 * NEXT_PUBLIC_SITE_URL 在部署时配置为线上域名；
 * 本地开发默认 localhost:3001（与主站 3000 并存）。
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(
  /\/+$/,
  ''
);
export const SITE_NAME = '全羽运动';
/** 本站唯一品类：所有赛事均为羽毛球（砍掉品类维度后的固定值） */
export const FIXED_CATEGORY = '羽毛球';
