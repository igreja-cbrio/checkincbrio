import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { serviceId, scheduleId, volunteerName, planningCenterId } = await req.json();

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

    // Validate the service exists and is today
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

    // If scheduleId provided, do a scheduled check-in
    if (scheduleId) {
      // Check for duplicate
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

      // Get schedule to find volunteer_id
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

      const { data: checkIn, error: checkInError } = await supabase
        .from("check_ins")
        .insert({
          schedule_id: scheduleId,
          volunteer_id: schedule.volunteer_id,
          service_id: serviceId,
          method: "self_service",
          is_unscheduled: false,
        })
        .select()
        .single();

      if (checkInError) {
        if (checkInError.code === "23505") {
          return new Response(
            JSON.stringify({ error: "Check-in já foi realizado", alreadyCheckedIn: true }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw checkInError;
      }

      // Update confirmation status
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

    // Unscheduled check-in
    if (!volunteerName) {
      return new Response(
        JSON.stringify({ error: "volunteerName é obrigatório para check-in sem escala" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to find volunteer_id from profiles or volunteer_qrcodes
    let volunteerId: string | null = null;

    if (planningCenterId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("planning_center_id", planningCenterId)
        .maybeSingle();
      if (profile) volunteerId = profile.id;
    }

    // Check for existing unscheduled check-in today
    if (volunteerId) {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data: existingUnscheduled } = await supabase
        .from("check_ins")
        .select("id")
        .eq("volunteer_id", volunteerId)
        .eq("service_id", serviceId)
        .eq("is_unscheduled", true)
        .gte("checked_in_at", startOfDay)
        .lt("checked_in_at", endOfDay)
        .maybeSingle();

      if (existingUnscheduled) {
        return new Response(
          JSON.stringify({ error: "Você já fez check-in neste culto", alreadyCheckedIn: true }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
      JSON.stringify({
        success: true,
        volunteerName,
        isUnscheduled: true,
      }),
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
