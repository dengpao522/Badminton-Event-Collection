/**
 * 社区等级徽章：按「内容贡献 × 互动反馈」实时计算，不落库（数据量小，免维护冗余字段）。
 * 积分规则：发帖 ×5 + 帖子获赞总数 ×1 —— 鼓励发优质内容而非灌水。
 */
import type { PrismaClient } from '@prisma/client';

/** 等级定义：阈值 = 积分下限；label 面向球友的话术 */
export const LEVELS = [
  { min: 0, label: 'Lv1 新羽', cls: 'bg-gray-100 text-gray-600' },
  { min: 20, label: 'Lv2 场上常客', cls: 'bg-green-50 text-green-700' },
  { min: 100, label: 'Lv3 球馆老手', cls: 'bg-blue-50 text-blue-700' },
  { min: 300, label: 'Lv4 业余高手', cls: 'bg-purple-50 text-purple-700' },
  { min: 1000, label: 'Lv5 羽球传奇', cls: 'bg-amber-50 text-amber-700' },
] as const;

/** 计算积分：发帖数 ×5 + 该用户全部帖子的获赞总数 */
export async function getUserScore(prisma: PrismaClient, userId: string): Promise<number> {
  const [postCount, agg] = await Promise.all([
    prisma.post.count({ where: { userId } }),
    prisma.post.aggregate({ where: { userId }, _sum: { likeCount: true } }),
  ]);
  return postCount * 5 + (agg._sum.likeCount ?? 0);
}

/** 由积分取等级（LEVELS 按 min 升序，取最后一个满足下限的档位） */
export function levelOf(score: number): (typeof LEVELS)[number] {
  let cur: (typeof LEVELS)[number] = LEVELS[0];
  for (const lv of LEVELS) if (score >= lv.min) cur = lv;
  return cur;
}

/** 一步到位：查用户等级（主页/社区流共用） */
export async function getUserLevel(prisma: PrismaClient, userId: string) {
  return levelOf(await getUserScore(prisma, userId));
}
