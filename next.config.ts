import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Identifica a versão do app que o navegador carregou. Na Vercel vem do commit; fora dela fica vazio e o aviso de "versão nova" não aparece.
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? "" },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dfrqgwpujodnwpbsgdrq.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
  },
};

export default nextConfig;
