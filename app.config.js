// Settings that differ per build, layered on app.json.
// EXPO_BASE_URL: the path the web build is served from, e.g. "/jamboree" on GitHub Pages.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL || undefined },
});
