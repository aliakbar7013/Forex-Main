export type SSEEventType = 
  | 'NEW_SIGNAL' 
  | 'SIGNAL_UPDATED' 
  | 'SIGNAL_DELETED' 
  | 'TRADE_RESOLVED'
  | 'LIVE_PRICE_TICK'
  | 'RISK_UPDATED' 
  | 'IPDA_UPDATED' 
  | 'HEARTBEAT';

export interface SSEMessage {
  type: SSEEventType;
  data: any;
  timestamp: string;
}

// Global in-memory list of active client response controllers
type ClientController = {
  id: string;
  controller: ReadableStreamDefaultController;
};

declare global {
  // eslint-disable-next-line no-var
  var __sseClients: Map<string, ReadableStreamDefaultController> | undefined;
}

if (!global.__sseClients) {
  global.__sseClients = new Map();
}

export function registerSSEClient(clientId: string, controller: ReadableStreamDefaultController) {
  global.__sseClients?.set(clientId, controller);
  // Send initial welcome/connected event
  sendEventToClient(controller, {
    type: 'HEARTBEAT',
    data: { message: 'Connected to live signals stream', clientId },
    timestamp: new Date().toISOString()
  });
}

export function unregisterSSEClient(clientId: string) {
  global.__sseClients?.delete(clientId);
}

export function broadcastSSE(type: SSEEventType, data: any) {
  const message: SSEMessage = {
    type,
    data,
    timestamp: new Date().toISOString()
  };

  if (!global.__sseClients) return;

  const deadClients: string[] = [];

  global.__sseClients.forEach((controller, clientId) => {
    try {
      sendEventToClient(controller, message);
    } catch {
      deadClients.push(clientId);
    }
  });

  // Clean up any closed streams
  deadClients.forEach(id => global.__sseClients?.delete(id));
}

function sendEventToClient(controller: ReadableStreamDefaultController, message: SSEMessage) {
  const payload = `event: ${message.type}\ndata: ${JSON.stringify(message)}\n\n`;
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(payload));
}
