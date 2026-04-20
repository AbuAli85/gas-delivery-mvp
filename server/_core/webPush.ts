import webpush from "web-push";
import { ENV } from "./env";

let initialized = false;

function ensureInit() {
  if (initialized) return;
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) {
    console.warn("[WebPush] VAPID keys not configured — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(
    "mailto:admin@gasdelivery.om",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
  initialized = true;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: { title: string; body: string; tag?: string }
): Promise<boolean> {
  ensureInit();
  if (!initialized) return false;

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) {
      // Subscription expired — caller should remove it from DB
      return false;
    }
    console.error("[WebPush] Send error:", err);
    return false;
  }
}
