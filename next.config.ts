import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hd339l09uzcdhf0y.public.blob.vercel-storage.com",
        port: "",
        pathname: "/interlude-image.png",
        search: "",
      },
    ],
  },
};

export default nextConfig;
