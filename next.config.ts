import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM assets resolved relative to import.meta.url — it must
  // run from node_modules, not be bundled into the server build.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
