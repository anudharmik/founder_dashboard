import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get pending reminders
    const { data: reminders, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("sent", false)
      .lte("remind_at", new Date().toISOString());

    if (error) {
      throw error;
    }

    for (const reminder of reminders || []) {
      // Get user email
      const { data: userData } =
        await supabase.auth.admin.getUserById(reminder.user_id);

      const userEmail = userData.user?.email;

      if (!userEmail) continue;

      // Send email
      await resend.emails.send({
        from: "FounderOS <onboarding@resend.dev>",
        to: userEmail,
        subject: `Reminder: ${reminder.title}`,
        html: `
          <div style="font-family:sans-serif;padding:20px;">
            <h2>${reminder.title}</h2>
            <p>${reminder.description || ""}</p>
            <p>Stay consistent 🚀</p>
          </div>
        `,
      });

      // Mark reminder as sent
      await supabase
        .from("reminders")
        .update({ sent: true })
        .eq("id", reminder.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
      }
    );
  }
});