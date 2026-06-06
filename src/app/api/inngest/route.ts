import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

export const runtime = "nodejs";
export const maxDuration = 300;

// Inngest invokes this endpoint to run the registered functions.
// Local dev: run `npx inngest-cli@latest dev`. Prod: register the app URL in
// Inngest Cloud and set INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY.
export const { GET, POST, PUT } = serve({ client: inngest, functions });
