/**
 * 羽毛球数据迁移：从主站库（../web/prisma/dev.db）抽取 category='羽毛球' 的已发布赛事，
 * 写入本站独立库（幂等：城市+赛事名 upsert）。订阅/投稿数据不迁移（新站从零开始）。
 * 运行：先 npm run db:push 建库，再 npm run seed:badminton
 */
import { PrismaClient, Prisma } from '@prisma/client';

/** 主站库（只读）：直接指到主站的 dev.db 文件 */
const source = new PrismaClient({
  datasources: { db: { url: 'file:../../web/prisma/dev.db' } },
});
/** 本站库（写入，走本站 .env 的 DATABASE_URL） */
const target = new PrismaClient();

async function main() {
  const events = await source.event.findMany({
    where: { category: '羽毛球', isPublished: true },
  });
  console.log(`主站羽毛球赛事: ${events.length} 场`);

  let inserted = 0;
  let updated = 0;
  for (const e of events) {
    // 显式挑选可迁移字段（id/crationTime 等不迁移，由本库生成）
    const data: Prisma.EventUncheckedCreateInput = {
      name: e.name,
      city: e.city,
      province: e.province,
      category: e.category,
      tags: e.tags,
      raceDateText: e.raceDateText,
      raceDateStart: e.raceDateStart,
      raceDateEnd: e.raceDateEnd,
      venue: e.venue,
      status: e.status,
      deadlineText: e.deadlineText,
      deadlineAt: e.deadlineAt,
      registerGuide: e.registerGuide,
      registerUrl: e.registerUrl,
      verifyStatus: e.verifyStatus,
      verifiedAt: e.verifiedAt,
      sourceName: e.sourceName,
      sourceUrl: e.sourceUrl,
      kind: e.kind,
      dataOrigin: e.dataOrigin,
      sourceSheet: e.sourceSheet,
      isPublished: e.isPublished,
    };
    // 幂等：同一（城市+赛事名）只保留一条，重复执行即更新
    const existing = await target.event.findFirst({ where: { city: e.city, name: e.name } });
    if (existing) {
      const updateData: Prisma.EventUncheckedUpdateInput = {
        name: data.name,
        city: data.city,
        province: data.province,
        category: data.category,
        tags: data.tags,
        raceDateText: data.raceDateText,
        raceDateStart: data.raceDateStart,
        raceDateEnd: data.raceDateEnd,
        venue: data.venue,
        status: data.status,
        deadlineText: data.deadlineText,
        deadlineAt: data.deadlineAt,
        registerGuide: data.registerGuide,
        registerUrl: data.registerUrl,
        verifyStatus: data.verifyStatus,
        verifiedAt: data.verifiedAt,
        sourceName: data.sourceName,
        sourceUrl: data.sourceUrl,
        kind: data.kind,
        dataOrigin: data.dataOrigin,
        sourceSheet: data.sourceSheet,
        isPublished: data.isPublished,
      };
      await target.event.update({ where: { id: existing.id }, data: updateData });
      updated++;
    } else {
      await target.event.create({ data });
      inserted++;
    }
  }
  console.log(`[全羽运动] 新增 ${inserted}，更新 ${updated}`);
}

main()
  .then(async () => {
    await source.$disconnect();
    await target.$disconnect();
  })
  .catch(async (e) => {
    console.error('迁移失败:', e);
    await source.$disconnect();
    await target.$disconnect();
    process.exit(1);
  });
