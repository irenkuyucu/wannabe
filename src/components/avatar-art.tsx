import Image from "next/image";

import type { AvatarOption } from "@/lib/avatar-options";

type AvatarArtProps = {
  alt?: string;
  avatar: AvatarOption;
  className?: string;
  decorative?: boolean;
  priority?: boolean;
};

export function AvatarArt({
  alt,
  avatar,
  className,
  decorative = false,
  priority = false,
}: AvatarArtProps) {
  return (
    <Image
      alt={decorative ? "" : (alt ?? avatar.label)}
      aria-hidden={decorative || undefined}
      className={className}
      draggable={false}
      height={165}
      priority={priority}
      src={avatar.src}
      unoptimized
      width={165}
    />
  );
}
