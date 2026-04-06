import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { serviceId, action, scheduleId, volunteerName, planningCenterId } = body;

    if (!serviceId) {
      return new Response(
        JSON.stringify({ error: "serviceId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate service exists and is today
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, name, scheduled_at")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return new Response(
        JSON.stringify({ error: "Culto não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceDate = new Date(service.scheduled_at);
    const today = new Date();
    if (
      serviceDate.getFullYear() !== today.getFullYear() ||
      serviceDate.getMonth() !== today.getMonth() ||
      serviceDate.getDate() !== today.getDate()
    ) {
      return new Response(
        JSON.stringify({ error: "Este culto não é de hoje" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // LIST action — return schedules for the service
    if (action === "list") {
      const { data: schedules, error: schedError } = await supabase
        .from("schedules")
        .select("id, volunteer_name, team_name, position_name, planning_center_person_id")
        .eq("service_id", serviceId)
        .order("volunteer_name");

      if (schedError) throw schedError;

      // Get check-ins for this service
      const { data: checkIns } = await supabase
        .from("check_ins")
        .select("schedule_id")
        .eq("service_id", serviceId);

      const checkedInScheduleIds = new Set((checkIns || []).map((c: any) => c.schedule_id));

      const result = (schedules || []).map((s: any) => ({
        id: s.id,
        volunteer_name: s.volunteer_name,
        team_name: s.team_name,
        position_name: s.position_name,
        has_checkin: checkedInScheduleIds.has(s.id),
      }));

      return new Response(
        JSON.stringify({ serviceName: service.name, schedules: result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CHECK-IN action (scheduled)
    if (scheduleId) {
      const { data: existing } = await supabase
        .from("check_ins")
        .select("id")
        .eq("schedule_id", scheduleId)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "Check-in já foi realizado", alreadyCheckedIn: true }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: schedule } = await supabase
        .from("schedules")
        .select("id, volunteer_id, volunteer_name, team_name, position_name")
        .eq("id", scheduleId)
        .single();

      if (!schedule) {
        return new Response(
          JSON.stringify({ error: "Escala não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: checkInError } = await supabase
        .from("check_ins")
        .insert({
          schedule_id: scheduleId,
          volunteer_id: schedule.volunteer_id,
          service_id: serviceId,
          method: "self_service",
          is_unscheduled: false,
        });

      if (checkInError) {
        if (checkInError.code === "23505") {
          return new Response(
            JSON.stringify({ error: "Check-in já foi realizado", alreadyCheckedIn: true }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw checkInError;
      }

      await supabase
        .from("schedules")
        .update({ confirmation_status: "confirmed" })
        .eq("id", scheduleId)
        .eq("confirmation_status", "pending");

      return new Response(
        JSON.stringify({
          success: true,
          volunteerName: schedule.volunteer_name,
          teamName: schedule.team_name,
          positionName: schedule.position_name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UNSCHEDULED check-in
    if (!volunteerName) {
      return new Response(
        JSON.stringify({ error: "volunteerName é obrigatório para check-in sem escala" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let volunteerId: string | null = null;
    if (planningCenterId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("planning_center_id", planningCenterId)
        .maybeSingle();
      if (profile) volunteerId = profile.id;
    }

    const { error: insertError } = await supabase
      .from("check_ins")
      .insert({
        volunteer_id: volunteerId,
        service_id: serviceId,
        method: "self_service",
        is_unscheduled: true,
      });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, volunteerName, isUnscheduled: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Self-checkin error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar check-in" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
