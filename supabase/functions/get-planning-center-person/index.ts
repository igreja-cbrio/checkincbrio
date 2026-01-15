import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get person_id from request
    const { person_id } = await req.json();
    if (!person_id) {
      return new Response(
        JSON.stringify({ error: 'person_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Planning Center credentials
    const appId = Deno.env.get('PLANNING_CENTER_APP_ID');
    const secret = Deno.env.get('PLANNING_CENTER_SECRET');

    if (!appId || !secret) {
      console.error('Planning Center credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Planning Center not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Basic Auth header
    const authHeader = btoa(`${appId}:${secret}`);

    // Get person details from Planning Center
    const personUrl = `https://api.planningcenteronline.com/people/v2/people/${person_id}`;
    
    console.log(`Fetching Planning Center person: ${person_id}`);

    const response = await fetch(personUrl, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Planning Center API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get person from Planning Center' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const person = data.data;
    
    // Return person details
    const result = {
      id: person.id,
      full_name: `${person.attributes.first_name || ''} ${person.attributes.last_name || ''}`.trim(),
      first_name: person.attributes.first_name || '',
      last_name: person.attributes.last_name || '',
      avatar_url: person.attributes.avatar || null,
    };

    console.log(`Found person: ${result.full_name}`);

    return new Response(
      JSON.stringify({ person: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-planning-center-person:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
