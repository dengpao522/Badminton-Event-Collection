/**
 * 羽毛球全国深挖 第二轮（2026-11-01）
 * ---------------------------------------------------------------
 * 数据来源：中国羽毛球协会官网、国家体育总局、VICTOR/李宁官方渠道、
 * 中国香港羽毛球总会、BWF 官网、杭州市体育局、重庆市体育局、济南市体育局、
 * 新华网/中国体育报/齐鲁壹点/岳阳发布等（2026-11-01 检索核实）。
 * 目标：补充 11 月-2027 年 1 月赛事，参赛与观赛并重。
 * 可重复执行（城市+赛事名 幂等 upsert）。
 * 纪律：日期/截止保留原文；无法确认的字段留空或标待核实，不臆造；
 *       晋级制/代表队制赛事标 VIEWING（观赛），票务未开标 UPCOMING。
 */
import { prisma } from '../src/lib/prisma';
import { parseRaceDate, parseDeadline } from '../src/lib/parse-date';

interface SeedEvent {
  name: string;
  city: string;
  province: string;
  tags: string[];
  raceDateText: string;
  venue: string;
  status: string;
  deadlineText?: string;
  registerGuide: string;
  registerUrl?: string;
  verifyStatus: 'VERIFIED' | 'UNVERIFIED';
  sourceName: string;
  sourceUrl?: string;
  kind?: 'PARTICIPATABLE' | 'VIEWING' | 'REFERENCE';
}

const SHEET = '羽毛球全国深挖二 2026-11-01';

const EVENTS: SeedEvent[] = [
  // ================= 可报名（参赛） =================
  {
    name: '2026岳阳市“金龙鱼丰益堂杯”业余羽毛球俱乐部混合团体赛', city: '岳阳', province: '湖南',
    tags: ['团体赛', '免费参赛', '业余赛'], raceDateText: '2026年11月21日至22日',
    venue: '岳阳市第九中学羽毛球馆',
    status: 'OPEN', deadlineText: '截止11月6日24:00',
    registerGuide: '俱乐部组队报名，免收报名费；以俱乐部为单位报名参赛',
    verifyStatus: 'VERIFIED', sourceName: '岳阳发布',
    sourceUrl: 'http://m.toutiao.com/group/7699703539555222050/',
  },
  {
    name: '2026“华人杯”全球华人羽毛球单项邀请赛（济南站）', city: '济南', province: '山东',
    tags: ['业余赛', '国际交流'], raceDateText: '2026年11月12日至15日',
    venue: '济南市GT健身羽毛球中心',
    status: 'UNVERIFIED',
    registerGuide: '全球华人业余品牌赛（1993年发起，本届规模千余人）；公开报名渠道未见公告，参赛资格以组委会安排为准，可关注组委会信息咨询',
    verifyStatus: 'VERIFIED', sourceName: '齐鲁壹点',
    sourceUrl: 'http://m.toutiao.com/group/7702346053571363347/',
  },

  // ================= 高水平观赛（VIEWING） =================
  {
    name: '2026 VICTOR双雄会总决赛', city: '西安', province: '陕西',
    tags: ['总决赛', '业余赛', '观赛'], raceDateText: '2026年11月7日至8日',
    venue: '西安威克多新瞳羽毛球运动中心（省体育馆店）',
    status: 'CLOSED',
    registerGuide: '双雄会为业余双打团体赛（甲/乙/丙组），总决赛由各分站赛晋级队伍参加，不设公开报名；总决赛参赛名单已于10月26日公示，可现场观赛',
    verifyStatus: 'VERIFIED', sourceName: 'VICTOR胜利在握官网',
    sourceUrl: 'http://www.victorsport.com.cn/news/20906',
    kind: 'VIEWING',
  },
  {
    name: '2026道达尔能源·李宁李永波杯3V3羽毛球赛年度总决赛', city: '北京', province: '北京',
    tags: ['总决赛', '3V3', '观赛'], raceDateText: '2026年11月1日15:00（当日）',
    venue: '北京·李宁中心',
    status: 'CLOSED',
    registerGuide: '全国21城分站赛收官后的年度总决赛，由分站赛晋级选手参加，不设公开报名；傅海峰、谌龙、张楠等奥运冠军出席，可关注官方渠道现场观赛',
    verifyStatus: 'VERIFIED', sourceName: '李宁羽毛球官方微博',
    sourceUrl: 'https://m.weibo.cn/detail/5356476767930743',
    kind: 'VIEWING',
  },
  {
    name: '2026王文教杯南安中国国际挑战赛（WANG WENJIAO CUP）', city: '泉州', province: '福建',
    tags: ['国际赛事', '观赛'], raceDateText: '2026年11月3日至8日',
    venue: '福建省南安市（场馆以赛事规程为准）',
    status: 'CLOSED',
    registerGuide: 'BWF国际挑战赛级别职业赛事，各国选手参赛，不设公开报名；可现场观赛',
    verifyStatus: 'VERIFIED', sourceName: '亚洲羽毛球联合会（赛事规程）',
    sourceUrl: 'https://badmintonasia.org/wp-content/uploads/2026/03/WANG-WENJIAO-CUP-Nanan-China-International-Challenge-2026-Tournament-prospectus-Final-10th-August.pdf',
    kind: 'VIEWING',
  },
  {
    name: '“李宁·小糊涂仙杯”2026年全国羽毛球团体锦标赛', city: '宜昌', province: '湖北',
    tags: ['全国锦标赛', '职业赛事', '观赛'], raceDateText: '2026年11月9日至15日',
    venue: '宜昌奥体中心综合馆',
    status: 'CLOSED',
    registerGuide: '中国羽协主办的全国专业队团体赛，各省代表队参赛，不开放个人报名；可现场观赛',
    verifyStatus: 'VERIFIED', sourceName: '新华网',
    sourceUrl: 'https://app.xinhuanet.com/news/article.html?articleId=202610235e57b9e0a5d04055b169ad55308676a7',
    kind: 'VIEWING',
  },
  {
    name: '2026-2027李宁·中国羽毛球俱乐部超级联赛·杭州站（常规赛第1-4轮）', city: '杭州', province: '浙江',
    tags: ['职业联赛', '观赛', '已开票'], raceDateText: '2026年11月26日至29日（每日13:30/19:30两个时段）',
    venue: '杭州滨江体育馆',
    status: 'CLOSED',
    registerGuide: '羽超联赛8支俱乐部（石宇奇、陈雨菲、梁伟铿等国手及外援参赛）常规赛杭州站共16场；门票已正式开售，最低58元，在“看个比赛”网购买',
    verifyStatus: 'VERIFIED', sourceName: '每日商报',
    sourceUrl: 'https://mdaily.hangzhou.com.cn/mrsb/2026/10/29/article_detail_3_20261029A045.html',
    kind: 'VIEWING',
  },
  {
    name: '2026-2027李宁·中国羽毛球俱乐部超级联赛·总决赛（福州）', city: '福州', province: '福建',
    tags: ['职业联赛', '总决赛', '观赛'], raceDateText: '2027年1月1日至2日',
    venue: '福建省福州市（场馆待官宣）',
    status: 'UPCOMING',
    registerGuide: '常规赛排名前4的俱乐部晋级总决赛；票务暂未开启，关注中国羽协及票务平台公告',
    verifyStatus: 'VERIFIED', sourceName: '中国体育报（国家体育总局官网）',
    sourceUrl: 'http://www.sport.gov.cn/n20001280/n20067662/n20067613/c30106915/content.html',
    kind: 'VIEWING',
  },
  {
    name: 'HSBC BWF世界巡回赛总决赛2026（杭州）', city: '杭州', province: '浙江',
    tags: ['国际赛事', '年终总决赛', '观赛'], raceDateText: '2026年12月9日至13日',
    venue: '杭州奥体中心体育馆（往届场地，以官方公告为准）',
    status: 'UPCOMING',
    registerGuide: '世界羽联年终总决赛（奖金35万美元级别，世界顶尖选手参赛）；往届门票11月下旬在大麦网开售，关注官方公告购票',
    verifyStatus: 'VERIFIED', sourceName: 'BWF世界羽联官网',
    sourceUrl: 'https://bwfworldchampionships.bwfbadminton.com/tournament/5602/hsbc-bwf-world-tour-finals-2026/overview/',
    kind: 'VIEWING',
  },
  {
    name: '李宁2026香港公开羽毛球锦标赛（BWF世界巡回赛超级500）', city: '香港', province: '香港',
    tags: ['国际赛事', '观赛', '售票中'], raceDateText: '2026年11月17日至22日',
    venue: '启德体育园·启德体艺馆（首度登陆）',
    status: 'OPEN',
    registerGuide: '超级500级别顶级国际赛事（奖金50万美元）；单节门票10月15日起在快达票/大麦网公开发售，全程通票（一票六天九节）已开售',
    verifyStatus: 'VERIFIED', sourceName: '中国香港羽毛球总会',
    sourceUrl: 'https://hkbadmintonassn.org.hk/2026/09/li-ning-hkopen-2026-ticket-sale/',
    kind: 'VIEWING',
  },

  // ================= 青少年代表队制（观赛） =================
  {
    name: '2026年重庆市青少年羽毛球锦标赛', city: '重庆', province: '重庆',
    tags: ['青少年', '锦标赛', '观赛'], raceDateText: '团体赛12月7日至9日；单项赛12月10日至13日',
    venue: '重庆北碚缙云文化体育中心篮球馆',
    status: 'UNVERIFIED',
    registerGuide: '“奔跑吧·少年”中国体育彩票杯；代表队制赛事，采用网络报名（由学校/单位组织），不开放个人报名；可现场观赛',
    verifyStatus: 'VERIFIED', sourceName: '重庆市体育局',
    sourceUrl: 'https://tyj.cq.gov.cn/zwxx_253/tzgg/202610/t20261019_16256820_wap.html',
    kind: 'VIEWING',
  },
  {
    name: '2026年杭州市青少年阳光体育羽毛球锦标赛', city: '杭州', province: '浙江',
    tags: ['青少年', '锦标赛', '观赛'], raceDateText: '2026年11月20日至22日',
    venue: '杭州市（场馆以规程为准）',
    status: 'CLOSED', deadlineText: '报名截止11月5日（单位报名）',
    registerGuide: '各区县（市）代表队参赛（经体育主管部门审查盖章报名），不开放个人报名；可现场观赛',
    verifyStatus: 'VERIFIED', sourceName: '杭州市体育局',
    sourceUrl: 'https://ty.hangzhou.gov.cn/col/col1228962445/art/2026/art_17111041bd6e4563bf3758a9fab4ca46.html',
    kind: 'VIEWING',
  },
];

/** 修正项：库里过期/失实的既有条目（幂等，按 city+name 定位） */
const FIXES = {
  /** 林丹杯 2026 届实际已于 10 月在济南办完（1500 余人，融创国际体育中心），替换原「往年绍兴新昌」推测条目 */
  removeStale: { city: '杭州', name: '林丹杯羽毛球公开赛（往年在绍兴新昌）' },
  /** 上海虹赛场报名截止 10 月 21 日已过，报名状态修正为已截止 */
  closeExpired: { city: '上海', name: '上海城市业余联赛『虹赛场』全民健身系列赛羽毛球比赛（混合团体专场）' },
};

/** 林丹杯 2026 实际举办信息（替换旧条目） */
const LINDAN_2026: SeedEvent = {
  name: '2026济南“摘要”林丹杯羽毛球公开赛', city: '济南', province: '山东',
  tags: ['业余赛', '明星赛事'], raceDateText: '2026年10月4日至6日（已闭幕）',
  venue: '济南融创国际体育中心、龙鼎体育公园',
  status: 'FINISHED',
  registerGuide: '林丹创办的业余品牌赛（男子单打/混合团体/青少年组），全球1500余名选手参赛；2026届已闭幕，可关注来年报名',
  verifyStatus: 'VERIFIED', sourceName: '济南市体育局',
  sourceUrl: 'http://jnstyj.jinan.gov.cn/col/col12769/art/2026/art_1f2c4e11eb7e46229f1645546b141109.html',
};

async function upsertEvent(e: SeedEvent) {
  const race = parseRaceDate(e.raceDateText);
  const deadlineText = e.deadlineText ?? '';
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
    deadlineText,
    deadlineAt: deadlineText ? parseDeadline(deadlineText) : null,
    registerGuide: e.registerGuide,
    registerUrl: e.registerUrl ?? '',
    verifyStatus: e.verifyStatus,
    verifiedAt: e.verifyStatus === 'VERIFIED' ? new Date() : null,
    kind: e.kind ?? 'PARTICIPATABLE',
    dataOrigin: 'MANUAL_COLLECTION',
    sourceName: e.sourceName,
    sourceUrl: e.sourceUrl ?? '',
    sourceSheet: SHEET,
    isPublished: true,
  };
  const existing = await prisma.event.findFirst({ where: { city: e.city, name: e.name } });
  if (existing) {
    await prisma.event.update({ where: { id: existing.id }, data });
    return 'updated' as const;
  }
  await prisma.event.create({ data });
  return 'inserted' as const;
}

async function main() {
  let inserted = 0;
  let updated = 0;
  for (const e of EVENTS) {
    const r = await upsertEvent(e);
    if (r === 'inserted') inserted++;
    else updated++;
  }

  // 林丹杯：删除旧推测条目，写入 2026 实际举办信息
  const stale = await prisma.event.findFirst({
    where: { city: FIXES.removeStale.city, name: FIXES.removeStale.name },
  });
  if (stale) {
    await prisma.event.delete({ where: { id: stale.id } });
    console.log('[修正] 已删除过期条目：林丹杯羽毛球公开赛（往年在绍兴新昌）');
  }
  const lindan = await upsertEvent(LINDAN_2026);
  if (lindan === 'inserted') inserted++;
  else updated++;

  // 上海虹赛场：报名截止已过，状态修正为已截止
  const shanghai = await prisma.event.findFirst({
    where: { city: FIXES.closeExpired.city, name: FIXES.closeExpired.name },
  });
  if (shanghai && shanghai.status === 'OPEN') {
    await prisma.event.update({ where: { id: shanghai.id }, data: { status: 'CLOSED' } });
    console.log('[修正] 上海虹赛场 报名状态 OPEN → CLOSED（截止10月21日已过）');
  }

  console.log(`[羽毛球深挖二] 新增 ${inserted}，更新 ${updated}，共 ${EVENTS.length + 1} 条种子数据`);
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
