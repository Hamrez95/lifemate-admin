import { spawn } from "node:child_process";

import { startQaMockServices } from "./mock-services.mjs";

const { server: mockServer, origin } = await startQaMockServices();

const child = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3100"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: origin,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "qa_publishable_key_only",
      NEXT_PUBLIC_ADMIN_API_URL: origin,
    },
  },
);

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  child.kill(signal === "SIGINT" ? "SIGINT" : "SIGTERM");
  await new Promise((resolve) => mockServer.close(resolve));
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

child.on("exit", async (code, signal) => {
  await new Promise((resolve) => mockServer.close(resolve));
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
