const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.merchantgo.store/api/v1';

export interface MerchantSession {
  token?: string;
  id: string;
  name: string;
  role: string;
  plan: string;
  mode: 'SOLO_FOOD_TRUCK' | 'MULTI_STATION_BAR';
  entitlements: {
    features: string[];
    limits: { menuItems: number; staff: number; branches: number };
    storage?: { authority: string; crossDeviceSync: string; multiTenant: boolean };
  };
  offline?: boolean;
}

type OfflineOperation =
  | { kind: 'create_order'; payload: unknown; created_at: string }
  | { kind: 'settle_order'; payload: unknown; created_at: string };

const OFFLINE_QUEUE_KEY = 'merchantgo.mobile.offline.queue';

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
  return json.data ?? json;
}

function authorized(token: string, json = false): Record<string, string> {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: ['Bearer', token].join(' '),
  };
}

export function authenticatePin(pin: string): Promise<MerchantSession> {
  return request('/auth/pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
}

export function loginMerchantGoAccount(email: string, password: string): Promise<MerchantSession> {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function registerMerchantGoAccount(
  email: string,
  password: string,
  name: string,
  mode: MerchantSession['mode'],
): Promise<MerchantSession> {
  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, mode }),
  });
}

export function googleDriveStatus(token: string) {
  return request('/cloud/google/status', {
    headers: authorized(token),
  });
}

export async function connectGoogleDrive(token: string) {
  const { url } = await request('/cloud/google/authorize', {
    headers: authorized(token),
  });
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function pushSnapshot(snapshot: unknown, session: MerchantSession) {
  if (session.plan === 'FREE') {
    return request('/cloud/google/push', {
      method: 'POST',
      headers: authorized(session.token || '', true),
      body: JSON.stringify({ snapshot }),
    });
  }
  return request('/tenant/snapshot/import', {
    method: 'POST',
    headers: authorized(session.token || '', true),
    body: JSON.stringify({ snapshot, dryRun: false }),
  });
}

export function previewSnapshot(snapshot: unknown, session: MerchantSession) {
  if (session.plan === 'FREE') return Promise.resolve({ source: 'local', snapshot });
  return request('/tenant/snapshot/import', {
    method: 'POST',
    headers: authorized(session.token || '', true),
    body: JSON.stringify({ snapshot, dryRun: true }),
  });
}

export async function pullSnapshot(session: MerchantSession) {
  if (session.plan === 'FREE') {
    const result = await request('/cloud/google/pull', {
      method: 'POST',
      headers: authorized(session.token || ''),
    });
    return result.snapshot;
  }
  const result = await request('/tenant/snapshot', {
    headers: authorized(session.token || ''),
  });
  return result.snapshot;
}

export async function fetchMenuCatalog(session: MerchantSession) {
  if (!session.token) return [];
  const result = session.plan === 'FREE'
    ? await request('/cloud/google/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
      })
    : await request('/tenant/menu-items', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
      });
  const items = session.plan === 'FREE' ? result.snapshot.data.menuItems : result.items;
  return items.map((item: any) => ({
    id: item.id || item.$id,
    name: item.name,
    cat: item.category || 'General',
    price: `$${Number(item.price || 0).toFixed(2)}`,
    image: '🍽️',
  }));
}

export function submitOrderToCloud(orderPayload: unknown, token: string) {
  return request('/orders/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderPayload),
  });
}

export function settleExpressOrder(orderPayload: unknown, token: string) {
  return request('/orders/settle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderPayload),
  });
}

export function enqueueOfflineOperation(operation: OfflineOperation): void {
  const queue = readOfflineQueue();
  queue.push(operation);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function readOfflineQueue(): OfflineOperation[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export async function flushOfflineQueue(token: string): Promise<{ synced: number; remaining: number }> {
  const queue = readOfflineQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const remaining: OfflineOperation[] = [];
  let synced = 0;
  for (const operation of queue) {
    try {
      if (operation.kind === 'create_order') {
        await submitOrderToCloud(operation.payload, token);
      } else if (operation.kind === 'settle_order') {
        await settleExpressOrder(operation.payload, token);
      }
      synced += 1;
    } catch {
      remaining.push(operation);
    }
  }
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  return { synced, remaining: remaining.length };
}
export async function fetchActiveOrders(_token?: string): Promise<any[]> { return []; }
