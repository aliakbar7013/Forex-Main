import { NextRequest } from 'next/server';
import { registerSSEClient, unregisterSSEClient } from '@/lib/eventBroadcaster';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const stream = new ReadableStream({
    start(controller) {
      registerSSEClient(clientId, controller);

      // Keep connection alive with periodic heartbeat
      const interval = setInterval(() => {
        try {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(`event: HEARTBEAT\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`)
          );
        } catch {
          clearInterval(interval);
          unregisterSSEClient(clientId);
        }
      }, 25000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        unregisterSSEClient(clientId);
      });
    },
    cancel() {
      unregisterSSEClient(clientId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
