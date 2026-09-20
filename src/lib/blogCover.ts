// Covers that ship with the website are stored as site-relative paths
// (/images/blog/...) — resolve those against the website so they preview here.
const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://sochill-website.vercel.app';

export function coverSrc(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${WEBSITE_URL}${url}` : url;
}
