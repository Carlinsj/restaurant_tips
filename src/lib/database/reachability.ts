import { createConnection } from "node:net";

type ReachabilityState = {
  available: boolean;
  expiresAt: number;
  pending?: Promise<boolean>;
};

const globalForReachability = globalThis as unknown as {
  databaseReachability?: ReachabilityState;
};

function databaseEndpoint(): { host: string; port: number } | null {
  const configured = process.env.DATABASE_URL;
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      return null;
    }
    return {
      host: url.hostname,
      port: Number(url.port || 5432),
    };
  } catch {
    return null;
  }
}

export async function isDatabaseReachable(
  timeoutMs = 200,
): Promise<boolean> {
  const now = Date.now();
  const cached = globalForReachability.databaseReachability;
  if (cached && cached.expiresAt > now) return cached.available;
  if (cached?.pending) return cached.pending;

  const endpoint = databaseEndpoint();
  if (!endpoint) return false;

  const pending = new Promise<boolean>((resolve) => {
    const socket = createConnection(endpoint);
    let settled = false;

    const finish = (available: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      globalForReachability.databaseReachability = {
        available,
        expiresAt: Date.now() + (available ? 5_000 : 10_000),
      };
      resolve(available);
    };

    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });

  globalForReachability.databaseReachability = {
    available: false,
    expiresAt: 0,
    pending,
  };
  return pending;
}
