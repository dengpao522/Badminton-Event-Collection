'use server';

/**
 * 球馆侧 Server Actions：认证申请 / 发布赛事（存草稿待运营审核）
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isApprovedVenue } from '@/lib/session';
import { ALL_CITIES } from '@/lib/constants';
import { parseDeadline, parseRaceDate } from '@/lib/parse-date';

/** 提交球馆认证申请（每用户一份，驳回后可修改重新提交） */
export async function applyVenueAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('请先登录')}`);

  const venueName = String(formData.get('venueName') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const intro = String(formData.get('intro') ?? '').trim().slice(0, 500);

  // 全国城市全集校验：羽毛球站覆盖全国，不能只限江浙沪试点名单
  if (!venueName || !ALL_CITIES.includes(city) || !phone) {
    redirect(`/venue/apply?error=${encodeURIComponent('请完整填写球馆名称、城市与联系电话')}`);
  }

  const existing = await prisma.venueProfile.findUnique({ where: { userId: user.id } });
  if (existing && existing.status === 'APPROVED') {
    redirect(`/venue/apply?error=${encodeURIComponent('你的球馆已认证通过，无需重复申请')}`);
  }

  if (existing) {
    // 驳回后修改重提：重置为待审核
    await prisma.venueProfile.update({
      where: { userId: user.id },
      data: { venueName, city, address, phone, intro, status: 'PENDING', reviewNote: '', reviewedAt: null },
    });
  } else {
    await prisma.venueProfile.create({
      data: { userId: user.id, venueName, city, address, phone, intro, status: 'PENDING' },
    });
  }
  redirect('/venue/apply?saved=1');
}

/** 已认证球馆发布赛事：默认存为草稿（isPublished=false），运营审核后上架 */
export async function submitVenueEventAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent('请先登录')}`);
  if (!isApprovedVenue(user)) {
    redirect(`/venue/apply?error=${encodeURIComponent('球馆认证通过后才能发布赛事')}`);
  }

  const name = String(formData.get('name') ?? '').trim().slice(0, 80);
  const city = String(formData.get('city') ?? '').trim();
  const venue = String(formData.get('venue') ?? '').trim().slice(0, 100);
  const raceDateText = String(formData.get('raceDateText') ?? '').trim().slice(0, 50);
  const deadlineText = String(formData.get('deadlineText') ?? '').trim().slice(0, 50);
  const registerGuide = String(formData.get('registerGuide') ?? '').trim().slice(0, 300);
  const registerUrl = String(formData.get('registerUrl') ?? '').trim();

  // 必填校验 + 城市白名单 + 直链协议白名单（与 admin 编辑口径一致）
  if (!name || !city || !raceDateText) {
    redirect(`/venue/events/new?error=${encodeURIComponent('赛事名称、城市、比赛日期为必填项')}`);
  }
  if (!ALL_CITIES.includes(city)) {
    redirect(`/venue/events/new?error=${encodeURIComponent('城市取值不合法')}`);
  }
  if (registerUrl && !/^https?:\/\//i.test(registerUrl)) {
    redirect(`/venue/events/new?error=${encodeURIComponent('报名链接必须以 http:// 或 https:// 开头')}`);
  }

  const race = parseRaceDate(raceDateText);

  await prisma.event.create({
    data: {
      name,
      city,
      province: '',
      category: '羽毛球',
      tags: JSON.stringify(['球馆发布']),
      raceDateText,
      raceDateStart: race.start,
      raceDateEnd: race.end,
      venue,
      status: 'UNVERIFIED',
      deadlineText,
      deadlineAt: deadlineText ? parseDeadline(deadlineText) : null,
      registerGuide,
      registerUrl,
      verifyStatus: 'UNVERIFIED',
      sourceName: '球馆发布',
      kind: 'PARTICIPATABLE',
      dataOrigin: 'VENUE_SUBMITTED',
      sourceSheet: '球馆发布',
      // 草稿状态：运营在后台核对后勾选发布才对前台可见
      isPublished: false,
      submittedByUserId: user.id,
    },
  });

  revalidatePath('/venue/dashboard');
  redirect('/venue/dashboard?submitted=1');
}
