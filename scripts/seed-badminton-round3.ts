/**
 * 羽毛球全国深挖 第三轮（2026-11-03）
 * ---------------------------------------------------------------
 * 数据来源：国家体育总局官网（sport.gov.cn）、中国体育报、新浪新闻、
 * 东南网、郑思维官方微博（2026-11-03 检索核实）。
 * 目标：羽超联赛后续三站赛程官宣入库 + 待官宣条目信息补全。
 * 可重复执行（城市+赛事名 幂等 upsert；更新项幂等）。
 * 纪律：日期/场馆保留原文；查无实据的字段不填，不臆造。
 */
import { prisma } from '../src/lib/prisma';
import { parseRaceDate } from '../src/lib/parse-date';

const SHEET = '羽毛球全国深挖三 2026-11-03';

interface SeedEvent {
  name: string;
  city: string;
  province: string;
  tags: string[];
  raceDateText: string;
  venue: string;
  status: string;
  registerGuide: string;
  sourceName: string;
  sourceUrl: string;
}

/** 羽超常规赛后续三站（赛程官宣：国家体育总局官网转载中国体育报） */
const EVENTS: SeedEvent[] = [
  {
    name: '2026-2027李宁·中国羽毛球俱乐部超级联赛·瑞昌站（常规赛第2站）', city: '九江', province: '江西',
    tags: ['职业联赛', '观赛'], raceDateText: '2026年12月3日至5日（共3个比赛日）',
    venue: '瑞昌市体育公园体育馆',
    status: 'UPCOMING',
    registerGuide: '羽超常规赛第二站；观赛门票暂未开售，参考杭州站渠道（“看个比赛”网），关注官方公告',
    sourceName: '中国体育报（国家体育总局官网）',
    sourceUrl: 'http://www.sport.gov.cn/n20001280/n20067662/n20067613/c29845079/content.html',
  },
  {
    name: '2026-2027李宁·中国羽毛球俱乐部超级联赛·苏州站（常规赛第3站）', city: '苏州', province: '江苏',
    tags: ['职业联赛', '观赛'], raceDateText: '2026年12月18日至20日（共3个比赛日）',
    venue: '苏州奥体中心体育馆（2023年苏迪曼杯举办地）',
    status: 'UPCOMING',
    registerGuide: '羽超常规赛第三站；观赛门票暂未开售，关注官方公告购票',
    sourceName: '中国体育报（国家体育总局官网）',
    sourceUrl: 'http://www.sport.gov.cn/n20001280/n20067662/n20067613/c29845079/content.html',
  },
  {
    name: '2026-2027李宁·中国羽毛球俱乐部超级联赛·厦门站（常规赛收官战）', city: '厦门', province: '福建',
    tags: ['职业联赛', '观赛', '收官战'], raceDateText: '2026年12月24日至27日（共4个比赛日）',
    venue: '厦门工人体育馆',
    status: 'UPCOMING',
    registerGuide: '常规赛收官战，各俱乐部在此决出总决赛晋级名额（前四会师福州）；观赛门票暂未开售，关注官方公告',
    sourceName: '中国体育报/福建网络广播电视台',
    sourceUrl: 'http://www.fjtv.net/yw/2026-08-13/7238371.html',
  },
];

async function main() {
  // ---------- 1) 新增：羽超三站（幂等 upsert） ----------
  let inserted = 0;
  let updated = 0;
  for (const e of EVENTS) {
    const race = parseRaceDate(e.raceDateText);
    const data = {
      name: e.name,
      city: e.city,
      province: e.province,
      category: '羽毛球',
      tags: JSON.stringify(e.tags),
      raceDateText: e.raceDateText,
      raceDateStart: race.start,
      raceDateEnd: race.end,
      venue: e.venue,
      status: e.status,
      deadlineText: '',
      deadlineAt: null,
      registerGuide: e.registerGuide,
      registerUrl: '',
      verifyStatus: 'VERIFIED',
      verifiedAt: new Date(),
      kind: 'VIEWING',
      dataOrigin: 'MANUAL_COLLECTION',
      sourceName: e.sourceName,
      sourceUrl: e.sourceUrl,
      sourceSheet: SHEET,
      isPublished: true,
    };
    const existing = await prisma.event.findFirst({ where: { city: e.city, name: e.name } });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.event.create({ data });
      inserted++;
    }
  }

  // ---------- 2) 更新：思维杯（地点官宣：郑思维官方微博） ----------
  const siwei = await prisma.event.findFirst({
    where: { city: '杭州', name: '2026“思维杯”混双双打羽毛球赛（郑思维主办）' },
  });
  if (siwei && siwei.status === 'PENDING_ANNOUNCEMENT') {
    await prisma.event.update({
      where: { id: siwei.id },
      data: {
        venue: 'VICTOR·郑思维国际羽毛球基地',
        status: 'UPCOMING',
        registerGuide: '郑思维主办的混团双打赛，时间地点已官宣（VICTOR·郑思维国际羽毛球基地）；报名渠道暂未公布，关注郑思维微博及 VICTOR 官方渠道',
        sourceName: '郑思维官方微博',
        sourceUrl: 'https://m.weibo.cn/detail/5353612805147309',
        verifyStatus: 'VERIFIED',
        verifiedAt: new Date(),
        sourceSheet: SHEET,
      },
    });
    console.log('[更新] 思维杯：地点官宣补全，状态 → 即将报名');
  }

  // ---------- 3) 更新：羽超总决赛福州站（场馆官宣：东南网） ----------
  const fuzhou = await prisma.event.findFirst({
    where: { city: '福州', name: '2026-2027李宁·中国羽毛球俱乐部超级联赛·总决赛（福州）' },
  });
  if (fuzhou && !fuzhou.venue.includes('海峡奥林匹克')) {
    await prisma.event.update({
      where: { id: fuzhou.id },
      data: {
        venue: '福州海峡奥林匹克体育中心综合体育馆',
        sourceUrl: 'http://fjnews.fjsen.com/wap/2026-08/12/content_32234763.htm',
        sourceSheet: SHEET,
      },
    });
    console.log('[更新] 羽超总决赛：场馆官宣补全（福州海峡奥体中心综合体育馆）');
  }

  console.log(`[羽毛球深挖三] 新增 ${inserted}，更新 ${updated}，共 ${EVENTS.length} 条种子数据`);
  const total = await prisma.event.count({ where: { isPublished: true } });
  console.log(`本站赛事总数（已发布）：${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('导入失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
