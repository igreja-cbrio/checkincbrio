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
    const { code, redirectUri } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('PLANNING_CENTER_CLIENT_ID');
    const clientSecret = Deno.env.get('PLANNING_CENTER_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!clientId || !clientSecret) {
      console.error('Planning Center OAuth credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Planning Center OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for access token
    console.log('Exchanging code for access token...');
    const tokenResponse = await fetch('https://api.planningcenteronline.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch user info from Planning Center
    console.log('Fetching user info from Planning Center...');
    const userResponse = await fetch('https://api.planningcenteronline.com/people/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Failed to fetch user info:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user information from Planning Center' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData = await userResponse.json();
    const pcUser = userData.data;
    
    const planningCenterId = pcUser.id;
    const firstName = pcUser.attributes.first_name || '';
    const lastName = pcUser.attributes.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const avatarUrl = pcUser.attributes.avatar || null;

    // Fetch email from Planning Center
    console.log('Fetching email from Planning Center...');
    const emailsResponse = await fetch(`https://api.planningcenteronline.com/people/v2/people/${planningCenterId}/emails`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    let email = '';
    if (emailsResponse.ok) {
      const emailsData = await emailsResponse.json();
      const primaryEmail = emailsData.data?.find((e: any) => e.attributes.primary) || emailsData.data?.[0];
      email = primaryEmail?.attributes?.address || '';
    }

    if (!email) {
      console.error('No email found for Planning Center user');
      return new Response(
        JSON.stringify({ error: 'No email associated with your Planning Center account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User info: ${fullName} (${email}), PC ID: ${planningCenterId}`);

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user already exists by planning_center_id in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('planning_center_id', planningCenterId)
      .single();

    let userId: string;
    let isNewUser = false;

    if (existingProfile) {
      // User exists, get their auth user
      console.log('Found existing user with PC ID:', planningCenterId);
      userId = existingProfile.id;
      
      // Update profile with latest info
      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } else {
      // Check if user exists by email
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileByEmail) {
        // Link existing account to Planning Center
        console.log('Linking existing account to PC:', email);
        userId = profileByEmail.id;
        
        await supabase
          .from('profiles')
          .update({
            planning_center_id: planningCenterId,
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } else {
        // Create new user
        console.log('Creating new user:', email);
        isNewUser = true;
        
        // Generate a random password for the new user
        const randomPassword = crypto.randomUUID() + crypto.randomUUID();
        
        const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            planning_center_id: planningCenterId,
          },
        });

        if (createError) {
          console.error('Failed to create user:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create user account' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        userId = authUser.user.id;

        // Create profile
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            email,
            full_name: fullName,
            planning_center_id: planningCenterId,
            avatar_url: avatarUrl,
          });

        // Add default volunteer role
        await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'volunteer',
          });

        // Link schedules to this user
        await supabase
          .from('schedules')
          .update({ volunteer_id: userId })
          .eq('planning_center_person_id', planningCenterId);
      }
    }

    // Generate a magic link for the user to sign in
    console.log('Generating sign-in link for user:', userId);
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://checkincbrio.lovable.app'}/dashboard`,
      },
    });

    if (linkError) {
      console.error('Failed to generate magic link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate sign-in link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OAuth flow completed successfully');

    // Extract verification URL from link data
    const properties = linkData.properties as Record<string, unknown> | undefined;
    
    return new Response(
      JSON.stringify({
        success: true,
        isNewUser,
        user: {
          id: userId,
          email,
          fullName,
          planningCenterId,
          avatarUrl,
        },
        // Return the token hashes needed for verification
        tokenHash: properties?.hashed_token,
        verificationUrl: properties?.verification_url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
