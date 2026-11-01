/**
 * 密码哈希工具：Node 内置 scrypt（零第三方依赖）
 * 存储格式：`salt:hash`（均为 hex），校验使用 timingSafeEqual 防时序攻击
 */
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const KEY_LEN = 64;

/** 生成 `salt:hash` 格式的密码存储串 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

/** 校验明文密码与存储串是否匹配 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, KEY_LEN);
  const expected = Buffer.from(hash, 'hex');
  // 长度不同直接 false（避免 timingSafeEqual 抛错）
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
