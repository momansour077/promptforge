export default {
  testDir: ".",
  testMatch: "**/*.spec.js",
  timeout: 180_000,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4173",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
    viewport: {
      width: 1440,
      height: 1200
    },
    screenshot: "off",
    trace: "off",
    video: "off"
  }
};
