/** @type {import('next').NextConfig} */
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig = {};

if (staticExport) {
  // Static build for hosting on Hugging Face Spaces (no server needed).
  nextConfig.output = "export";
} else {
  // Local dev: proxy /api/* to the local FastAPI backend.
  nextConfig.rewrites = async () => {
    const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/:path*`,
      },
    ];
  };
}

module.exports = nextConfig;
