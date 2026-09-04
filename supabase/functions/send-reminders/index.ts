import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  try {
    let org_id: string | null = null;
    try {
      if (req.method === "POST") {
        const body = await req.json();
        org_id = body?.org_id || null;
      } else {
        const url = new URL(req.url);
        org_id = url.searchParams.get("org_id");
      }
    } catch {
      // optional org_id
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Process 15+ days overdue tasks (org-scoped if org_id is provided)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const cutoffDateStr = fifteenDaysAgo.toISOString().split("T")[0];

    let taskQuery = supabase
      .from("tasks")
      .select("*")
      .eq("completed", false)
      .lte("deadline", cutoffDateStr)
      .eq("overdue_email_sent", false);

    if (org_id) {
      taskQuery = taskQuery.eq("org_id", org_id);
    }

    const { data: overdueTasks, error: taskError } = await taskQuery;

    if (taskError) {
      console.error("Error fetching overdue tasks:", taskError);
    } else {
      for (const task of overdueTasks || []) {
        const targetUserId = task.assignee_id || task.user_id;
        const { data: userData } = await supabase.auth.admin.getUserById(targetUserId);
        const userEmail = userData.user?.email;

        if (!userEmail) continue;

        // Send alert email
        await resend.emails.send({
          from: "ASTRAV <onboarding@resend.dev>",
          to: userEmail,
          subject: `Action Needed: Overdue Task Alert ⚠️`,
          html: `
            <div style="font-family:sans-serif;padding:24px;max-width:550px;background:#1a140d;color:#FFF3E2;border-radius:12px;border:1px solid rgba(241,94,28,0.12);">
              <h2 style="color:#C13E1A;margin-top:0;font-size:22px;letter-spacing:-0.5px;">Task Overdue by 15+ Days</h2>
              <p style="color:#C9A98A;font-size:14px;line-height:1.5;">This is an automated alert from your ASTRAV Command Center. The following task has been overdue for more than 15 days:</p>
              
              <div style="background:#2b2015;padding:16px;border-radius:8px;border-left:4px solid #C13E1A;margin:20px 0;">
                <strong style="font-size:16px;color:#ffffff;display:block;margin-bottom:4px;">${task.title}</strong>
                <span style="color:#8A7461;font-size:12px;">Deadline: ${new Date(task.deadline).toLocaleDateString()}</span>
              </div>
              
              <p style="color:#C9A98A;font-size:14px;line-height:1.5;margin-bottom:0;">Please log back into <a href="https://founder-dashboard.vercel.app" style="color:#f15e1c;text-decoration:none;font-weight:600;">ASTRAV</a> to mark it as complete or reschedule. Keep pushing forward! 🚀</p>
            </div>
          `,
        });

        // Mark task email as sent
        await supabase
          .from("tasks")
          .update({ overdue_email_sent: true })
          .eq("id", task.id);
      }
    }

    // 2. Process custom pending reminders (org-scoped if org_id is provided)
    let reminderQuery = supabase
      .from("reminders")
      .select("*")
      .eq("sent", false)
      .lte("remind_at", new Date().toISOString());

    if (org_id) {
      reminderQuery = reminderQuery.eq("org_id", org_id);
    }

    const { data: reminders, error: reminderError } = await reminderQuery;

    if (reminderError) {
      throw reminderError;
    }

    for (const reminder of reminders || []) {
      // Get user email
      const { data: userData } =
        await supabase.auth.admin.getUserById(reminder.user_id);

      const userEmail = userData.user?.email;

      if (!userEmail) continue;

      // Send email
      await resend.emails.send({
        from: "ASTRAV <onboarding@resend.dev>",
        to: userEmail,
        subject: `Reminder: ${reminder.title}`,
        html: `
          <div style="font-family:sans-serif;padding:24px;max-width:550px;background:#0f172a;color:#f1f5f9;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
            <h2 style="color:#6366f1;margin-top:0;font-size:22px;letter-spacing:-0.5px;">Custom Reminder</h2>
            <div style="background:#1e293b;padding:16px;border-radius:8px;border-left:4px solid #6366f1;margin:20px 0;">
              <strong style="font-size:16px;color:#ffffff;display:block;margin-bottom:4px;">${reminder.title}</strong>
              <p style="color:#94a3b8;font-size:14px;margin:0;">${reminder.description || ""}</p>
            </div>
            <p style="color:#94a3b8;font-size:14px;margin-bottom:0;">Stay consistent 🚀</p>
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