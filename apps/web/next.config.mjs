/** @type {import('next').NextConfig} */

/**
 * NOTE: `/api/*` is proxied by the route handler in `app/api/[...path]/route.ts`,
 * which resolves `API_URL` at request time.
 *
 * It used to be a `rewrites()` entry here, but `next.config` is evaluated at
 * BUILD time and frozen into `.next/routes-manifest.json`, so an `API_URL` that
 * was added after the build (or only set at runtime) was silently ignored and
 * every request went to the build-time default. Do not reintroduce it.
 */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
