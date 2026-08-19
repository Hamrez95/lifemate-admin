import { spawn } from "node:child_process";

import { startQaMockServices } from "./mock-services.mjs";
import { startQaWorkforceAuth } from "./mock-workforce-auth.mjs";

const { server: mockServer, origin: canonicalOrigin } = await startQaMockServices();
const { server: workforceAuthServer, origin: workforceAuthOrigin } = await startQaWorkforceAuth();

const child = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3100"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: canonicalOrigin,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "qa_publishable_key_only",
      NEXT_PUBLIC_ADMIN_API_URL: canonicalOrigin,
      NEXT_PUBLIC_ADMIN_AUTH_URL: `${workforceAuthOrigin}/functions/v1/lifemate-admin-auth`,
      NEXT_PUBLIC_PWA_TEST: "1",
    },
  },
);

let shuttingDown = false;
async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  child.kill(signal === "SIGINT" ? "SIGINT" : "SIGTERM");
  await Promise.all([closeServer(mockServer), closeServer(workforceAuthServer)]);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

child.on("exit", async (code, signal) => {
  if (!shuttingDown) {
    shuttingDown = true;
    await Promise.all([closeServer(mockServer), closeServer(workforceAuthServer)]);
  }
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
