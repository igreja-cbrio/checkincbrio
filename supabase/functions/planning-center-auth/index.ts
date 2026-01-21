import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const clientId = Deno.env.get('PLANNING_CENTER_CLIENT_ID');
    const redirectUri = `${req.headers.get('origin') || 'https://checkincbrio.lovable.app'}/planning-center/callback`;
    
    if (!clientId) {
      console.error('PLANNING_CENTER_CLIENT_ID not configured');
      return new Response(
        JSON.stringify({ error: 'Planning Center OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a random state for CSRF protection
    const state = crypto.randomUUID();
    
    // Build the Planning Center OAuth authorization URL
    const scopes = ['people'];
    const authUrl = new URL('https://api.planningcenteronline.com/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'login'); // Force individual login for each user

    console.log('Generated auth URL for Planning Center OAuth');

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        state 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating auth URL:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
