import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },

  async redirects() {
    return [
      {
        // /settings has no content of its own — Profile is the landing section.
        //
        // Done here rather than with redirect() in a page: the settings layout
        // awaits the database, so by the time a page-level redirect() ran the
        // response would already be streaming, and Next would fall back to a
        // client-side meta redirect — a 200 with an empty panel that flashes
        // before it moves. A config redirect resolves before rendering starts.
        source: "/settings",
        destination: "/settings/profile",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
