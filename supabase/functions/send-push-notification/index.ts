import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { corsHeaders } from "../_shared/cors.ts";

type PushRequestBody = {
  title?: string;
  message?: string;
  url?: string;
  type?: string;
  user_ids?: string[];
  broadcast?: boolean;
  persist_notification?: boolean;
};

type SubscriptionRow = {
  endpoint: string;
  auth_key: string;
  p256dh_key: string;
  user_id: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function uniqueStrings(values: unknown[] | undefined) {
  return [...new Set((values ?? []).filter((value): value is string => typeof value === "string" && value.trim().length > 0))];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")?.trim();
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")?.trim();
    const vapidSubject = Deno.env.get("VAPID_SUBJECT")?.trim() ?? "mailto:support@massrides.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return jsonResponse({ error: "VAPID keys are not configured." }, 500);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const body = await req.json() as PushRequestBody;
    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();
    const url = String(body.url ?? "/").trim() || "/";
    const type = String(body.type ?? "info").trim() || "info";
    const broadcast = Boolean(body.broadcast);
    const persistNotification = Boolean(body.persist_notification);

    if (!title || !message) {
      return jsonResponse({ error: "Both title and message are required." }, 400);
    }

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const isInternalRequest = Boolean(token && serviceRoleKey && token === serviceRoleKey);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    let callerUserId: string | null = null;
    let callerRole: string | null = null;

    if (!isInternalRequest) {
      if (!token) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const userSupabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });

      const { data: { user }, error: authError } = await userSupabase.auth.getUser();
      if (authError || !user) {
        return jsonResponse({ error: authError?.message ?? "Unauthorized" }, 401);
      }

      callerUserId = user.id;

      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      callerRole = profile?.role ?? null;
    }

    const canBroadcast = isInternalRequest || callerRole === "admin" || callerRole === "super_admin";
    if (broadcast && !canBroadcast) {
      return jsonResponse({ error: "Only admins can broadcast push notifications." }, 403);
    }

    const requestedUserIds = uniqueStrings(body.user_ids);
    const targetUserIds = broadcast
      ? []
      : requestedUserIds.length > 0
        ? requestedUserIds
        : callerUserId
          ? [callerUserId]
          : [];

    if (!broadcast && targetUserIds.length === 0) {
      return jsonResponse({ error: "No recipient user IDs were provided." }, 400);
    }

    if (!broadcast && !canBroadcast && callerUserId && targetUserIds.some((userId) => userId !== callerUserId)) {
      return jsonResponse({ error: "You can only send push notifications to your own account." }, 403);
    }

    let subscriptionsQuery = supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, auth_key, p256dh_key, user_id");

    if (!broadcast) {
      subscriptionsQuery = subscriptionsQuery.in("user_id", targetUserIds);
    }

    const { data: subscriptions, error: subscriptionError } = await subscriptionsQuery;
    if (subscriptionError) {
      throw subscriptionError;
    }

    const subscriptionRows = (subscriptions ?? []) as SubscriptionRow[];
    if (subscriptionRows.length === 0) {
      return jsonResponse({
        success: true,
        sent: 0,
        skipped: 0,
        removed: 0,
        recipients: 0,
        reason: "No push subscriptions found.",
      });
    }

    const uniqueUserIds = uniqueStrings(subscriptionRows.map((subscription) => subscription.user_id));
    const { data: userSettings } = await supabaseAdmin
      .from("user_settings")
      .select("user_id, push_notifications")
      .in("user_id", uniqueUserIds);

    const pushDisabledUsers = new Set(
      (userSettings ?? [])
        .filter((settings) => settings.push_notifications === false)
        .map((settings) => settings.user_id),
    );

    const activeSubscriptions = subscriptionRows.filter(
      (subscription) => !pushDisabledUsers.has(subscription.user_id),
    );

    const payload = JSON.stringify({
      title,
      message,
      url,
      type,
      tag: `massrides-${type}`,
    });

    const staleEndpoints: string[] = [];
    let sent = 0;

    await Promise.all(activeSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth_key,
              p256dh: subscription.p256dh_key,
            },
          },
          payload,
        );
        sent += 1;
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : null;

        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(subscription.endpoint);
          return;
        }

        console.error("Failed to send push notification:", error);
      }
    }));

    if (staleEndpoints.length > 0) {
      const { error } = await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);

      if (error) {
        console.error("Failed to remove stale push subscriptions:", error);
      }
    }

    if (persistNotification) {
      const notificationRecipients = uniqueStrings(activeSubscriptions.map((subscription) => subscription.user_id));
      if (notificationRecipients.length > 0) {
        const { error } = await supabaseAdmin.from("notifications").insert(
          notificationRecipients.map((userId) => ({
            user_id: userId,
            title,
            message,
            type,
            link: url,
          })),
        );

        if (error) {
          console.error("Failed to persist notification rows:", error);
        }
      }
    }

    return jsonResponse({
      success: true,
      sent,
      skipped: Math.max(0, subscriptionRows.length - activeSubscriptions.length),
      removed: staleEndpoints.length,
      recipients: uniqueStrings(activeSubscriptions.map((subscription) => subscription.user_id)).length,
      broadcast,
    });
  } catch (error) {
    console.error("send-push-notification error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      400,
    );
  }
});
