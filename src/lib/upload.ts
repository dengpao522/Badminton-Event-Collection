/**
 * 图片上传工具（server 端）：保存到 public/uploads，返回相对路径数组。
 * 被社区发帖与资料头像编辑共用。
 */
import { redirect } from 'next/navigation';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

/** 允许的图片类型与大小上限（5MB） */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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
  const dir = join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
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
    await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));
    paths.push(`/uploads/${filename}`);
  }
  return paths;
}
