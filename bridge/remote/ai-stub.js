// Stub for the optional `ai` package. The `agents` client bundle does a dynamic
// `import("ai")` for features we don't use (we only use the server-side
// createMcpHandler). Aliased here via wrangler.toml so esbuild can resolve it;
// never actually executed on our code path.
export const jsonSchema = (x) => x
export default {}
