import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { setSentryUser } from "./sentry";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Tag Sentry events with the authenticated user (no-op if Sentry not configured)
  if (user) {
    setSentryUser({ id: user.id, phone: user.phone ?? undefined, role: user.role ?? undefined });
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
