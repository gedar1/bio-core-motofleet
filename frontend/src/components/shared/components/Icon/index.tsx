import type { FC } from "react";
import { rawIcons, type IconName } from "@/assets/icons/raw";

export type { IconName };

/**
 * Normalizes a raw SVG string so its color follows `currentColor` and it
 * renders at an explicit pixel size. Fixed fills/strokes (black, white,
 * off-white) are swapped for `currentColor`, and the intrinsic width/height
 * are replaced with the requested size so it never falls back to the (often
 * large) viewBox dimensions.
 */
const normalizeSvg = (raw: string, size: number): string =>
  raw
    .replace(/(fill|stroke)="#[0-9a-fA-F]{3,8}"/g, '$1="currentColor"')
    .replace(/\swidth="[^"]*"/, "")
    .replace(/\sheight="[^"]*"/, "")
    .replace(/<svg /, `<svg width="${size}" height="${size}" `);

/**
 * Renders an inline SVG whose color is inherited from `currentColor`.
 * This makes every icon adapt automatically to the theme (dark/light) and to
 * the container's state (e.g. active item on a colored background), using a
 * single SVG file per icon.
 */
interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export const Icon: FC<IconProps> = ({ name, size = 20, className = "" }) => (
  <span
    aria-hidden="true"
    className={`inline-flex shrink-0 items-center justify-center ${className}`}
    dangerouslySetInnerHTML={{ __html: normalizeSvg(rawIcons[name], size) }}
  />
);
