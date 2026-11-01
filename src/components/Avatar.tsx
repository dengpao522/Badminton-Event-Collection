/**
 * 头像组件：有自定义头像展示图片，否则用昵称首字占位圆
 * 服务端/客户端组件均可使用（纯展示无状态）
 */
export function Avatar({
  name,
  avatar,
  size = 36,
}: {
  name: string;
  avatar?: string | null;
  size?: number;
}) {
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 本地 uploads 原生展示
      <img
        src={avatar}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700"
    >
      {name.slice(0, 1)}
    </span>
  );
}
