import type { NextConfig } from "next";
import nextIntl from "next-intl/plugin";

const withNextIntl = nextIntl();

const config: NextConfig = {
  reactStrictMode: true
};

export default withNextIntl(config);