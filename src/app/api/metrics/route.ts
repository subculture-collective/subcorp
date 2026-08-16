import { NextResponse } from "next/server";
import { register, collectDefaultMetrics } from "prom-client";

import "@/lib/metrics";

collectDefaultMetrics();

export async function GET() {
  return new NextResponse(await register.metrics(), {
    headers: { "Content-Type": register.contentType },
  });
}
