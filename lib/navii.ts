/**
 * Navii deterministic mascot avatars.
 * Docs: https://navii.dev/docs/http-api
 *
 * Same seed → same avatar. Prefer email/user id as seed (not display name alone).
 */

export type NaviiMood = 'neutral' | 'happy' | 'serious' | 'sleepy' | 'wink';
export type NaviiBackground = 'none' | 'solid' | 'ring';

export type NaviiOptions = {
  size?: number;
  palette?: string;
  background?: NaviiBackground;
  mood?: NaviiMood;
  /** Opaque fill, e.g. `#F3F7F4` */
  tileBg?: string;
};

/** Stable seed from email — keeps profile avatar consistent across sessions. */
export function seedFromEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getNaviiAvatarUrl(seed: string, options: NaviiOptions = {}): string {
  const {
    size = 96,
    palette = 'mint',
    background = 'ring',
    mood = 'happy',
    tileBg = '#F3F7F4',
  } = options;

  const encodedSeed = encodeURIComponent(seed || 'guest');
  const params = new URLSearchParams({
    size: String(Math.min(1024, Math.max(16, size))),
    palette,
    background,
    mood,
    tileBg,
  });

  // PNG for React Native Image (SVG is also available without `.png`)
  return `https://api.navii.dev/avatar/${encodedSeed}.png?${params.toString()}`;
}
