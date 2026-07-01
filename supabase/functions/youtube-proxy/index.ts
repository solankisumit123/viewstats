import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Auth mode "publishable" — no user JWT needed for the YouTube proxy.
// `verify_jwt = false` is set in supabase/config.toml for this function.
// ctx.supabase uses the publishable (anon) key with RLS applied.
// ctx.supabaseAdmin uses the secret key and bypasses RLS (available if needed).
export default {
  fetch: withSupabase({ auth: "publishable" }, async (req, _ctx) => {
    // Handle CORS pre-flight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
      const url = new URL(req.url);
      const path = url.pathname.replace("/youtube-proxy/", "");

      const apiKey = Deno.env.get("YOUTUBE_API_KEY") || "";
      const targetUrl = `https://www.googleapis.com/youtube/v3/${path}${
        url.search ? url.search + "&" : "?"
      }key=${apiKey}`;

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
  }),
};
