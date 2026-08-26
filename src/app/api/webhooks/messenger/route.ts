import { createServiceRoleClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// GET for Facebook Webhook Verification
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// POST for receiving messages
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    const appSecret = process.env.FACEBOOK_APP_SECRET;

    // 1. Verify Signature
    if (appSecret && signature) {
      const hmac = await import("crypto").then((m) => m.createHmac("sha256", appSecret));
      const expectedSignature = `sha256=${hmac.update(rawBody).digest("hex")}`;
      if (signature !== expectedSignature) {
        return new Response("Invalid Signature", { status: 403 });
      }
    } else if (!appSecret) {
      console.warn("FACEBOOK_APP_SECRET is not set. Skipping signature verification.");
    }

    const payload = JSON.parse(rawBody);

    if (payload.object !== "page") {
      return new Response("Not Found", { status: 404 });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    for (const entry of payload.entry) {
      const pageId = entry.id;

      // Find channel and organization
      const { data: channelData } = await supabase
        .from("crm_channels")
        .select("id, organization_id")
        .eq("channel_external_id", pageId)
        .eq("channel_type", "facebook_page")
        .single();

      if (!channelData) {
        console.warn(`Received webhook for unknown page_id: ${pageId}`);
        continue;
      }

      const { id: channel_id, organization_id } = channelData;

      if (!entry.messaging) continue;

      for (const event of entry.messaging) {
        // Only handle message events
        if (!event.message) continue;

        const senderId = event.sender.id;
        // The message ID provided by Facebook
        const messageId = event.message.mid;
        // Fallback for event ID if message ID is not present
        const externalEventId = messageId || `${senderId}_${event.timestamp}`;

        // 2. Idempotency Check
        const { data: existingEvent, error: insertError } = await supabase
          .from("crm_webhook_events")
          .insert({
            organization_id,
            provider: "facebook",
            external_event_id: externalEventId,
            payload: event,
          })
          .select("id")
          .single();

        // If insert fails due to unique constraint, it's a replay
        if (insertError) {
          if (insertError.code === "23505") { // 23505 is unique_violation
            console.log(`Duplicate event skipped: ${externalEventId}`);
            continue;
          } else {
            console.error("Idempotency record insertion failed:", insertError);
            // Fail closed on unknown database errors to avoid duplicate processing
            continue;
          }
        }

        // 3. Upsert Identity (using RPC)
        const { data: customerId, error: rpcError } = await supabase.rpc(
          "crm_upsert_channel_identity",
          {
            p_organization_id: organization_id,
            p_channel_id: channel_id,
            p_external_user_id: senderId,
            p_customer_name: "Khách hàng Facebook", // We can fetch real name via Graph API later if needed
            p_phone_number: null, // extracted later by bot
          }
        );

        if (rpcError || !customerId) {
          console.error("Error upserting identity:", rpcError);
          continue;
        }

        // 4. Upsert Thread
        // Let's find existing thread or create a new one
        let { data: thread } = await supabase
          .from("crm_threads")
          .select("id, status")
          .eq("organization_id", organization_id)
          .eq("channel_id", channel_id)
          .eq("customer_id", customerId)
          .single();

        if (!thread) {
          const { data: newThread, error: newThreadError } = await supabase
            .from("crm_threads")
            .insert({
              organization_id,
              channel_id,
              customer_id: customerId, // Fixed reference
              status: "bot_handling",
            })
            .select("id, status")
            .single();
          
          if (newThreadError || !newThread) {
            console.error("Error creating thread:", newThreadError);
            continue;
          }
          thread = newThread;
        } else {
          // Update last_message_at and unread_count
          await supabase.rpc('increment_unread_count', { p_thread_id: thread.id });
          await supabase
            .from("crm_threads")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", thread.id);
        }

        if (!thread) continue;

        // 5. Insert Message
        await supabase.from("crm_messages").insert({
          organization_id,
          thread_id: thread.id,
          sender_type: "customer",
          content: event.message.text || "",
          delivery_status: "delivered", // incoming message is always delivered
        });

        // 6. Trigger n8n Bot if handling
        if (thread.status === "bot_handling") {
          const n8nWebhookUrl = process.env.N8N_CSKH_WEBHOOK_URL;
          if (n8nWebhookUrl) {
            fetch(n8nWebhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                organization_id,
                channel_id,
                customer_id: customerId,
                thread_id: thread.id,
                message: event.message.text,
                sender_id: senderId
              })
            }).catch(e => console.error("Error calling n8n:", e));
          }
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Always return 200 to Facebook even on internal error to prevent retry storm if it's our bug
    return new Response("OK", { status: 200 });
  }
}
