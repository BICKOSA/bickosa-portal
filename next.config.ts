import type { NextConfig } from "next";

function getR2RemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const configuredUrl = process.env.R2_PUBLIC_URL;
  if (!configuredUrl) {
    return [];
  }

  try {
    const parsed = new URL(configuredUrl);
    const normalizedPath = parsed.pathname === "/" ? "/**" : `${parsed.pathname.replace(/\/$/, "")}/**`;
    return [
      {
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
        pathname: normalizedPath,
      },
    ];
  } catch {
    return [];
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.io https://*.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.posthog.io https://*.posthog.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getR2RemotePatterns(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
