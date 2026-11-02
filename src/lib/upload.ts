/**
 * 图片上传工具（server 端）：保存到 public/uploads，返回相对路径数组。
 * 被社区发帖与资料头像编辑共用。
 */
import { redirect } from 'next/navigation';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

/** 允许的图片类型与大小上限（5MB） */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** uploads 目录在文件系统中的绝对路径 */
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

/**
 * 删除 uploads 下的已存文件（换头像/删帖时清理旧文件，防磁盘垃圾堆积）。
 * 安全：仅接受 /uploads/ 前缀的站内相对路径，resolve 后校验仍落在 uploads 目录内，
 * 防止拼接出 ../ 逃逸删除任意文件；文件不存在等异常静默忽略（幂等清理）。
 */
export async function deleteUploads(paths: string[]): Promise<void> {
  for (const p of paths) {
    if (typeof p !== 'string' || !p.startsWith('/uploads/')) continue;
    const target = join(UPLOAD_DIR, p.slice('/uploads/'.length));
    if (!target.startsWith(UPLOAD_DIR)) continue; // 路径逃逸防护
    try {
      await unlink(target);
    } catch {
      // 文件不存在/被占用等：清理失败不阻断主流程
    }
  }
}

/**
 * 保存上传图片（最多 maxCount 张）。
 * @param errorTarget 校验失败时 redirect 回去的页面（带 error 提示）
 */
export async function saveImages(
  files: File[],
  errorTarget: string,
  maxCount = 4,
): Promise<string[]> {
  const picked = files.filter((f) => f && f.size > 0).slice(0, maxCount);
  if (picked.length === 0) return [];
  await mkdir(UPLOAD_DIR, { recursive: true });
  const paths: string[] = [];
  for (const file of picked) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      redirect(`${errorTarget}?error=${encodeURIComponent('仅支持 JPG/PNG/WebP 图片')}`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      redirect(`${errorTarget}?error=${encodeURIComponent('单张图片不能超过 5MB')}`);
    }
    // 扩展名从 MIME 映射（不用原始文件名，防路径注入）
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    await writeFile(join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));
    paths.push(`/uploads/${filename}`);
  }
  return paths;
}
