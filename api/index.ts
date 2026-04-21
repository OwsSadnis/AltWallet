// Vercel serverless entry — all /api/* requests are routed here by vercel.json.
// Express handles internal routing. Static files and SPA fallback are handled
// by Vercel CDN and vercel.json rewrites, not by this function.
export { default } from "../server/index";
