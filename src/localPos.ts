import type { MerchantSession } from './api/cloudClient';

const PREFIX = 'merchantgo.mobile.local.';
const CONFIG_KEY = `${PREFIX}config`;
const SHIFT_KEY = `${PREFIX}shift`;
const ORDERS_KEY = `${PREFIX}orders`;
const SHIFTS_KEY = `${PREFIX}closed-shifts`;
const REPORTS_KEY = `${PREFIX}zreports`;
const CATALOG_KEY = `${PREFIX}catalog`;
const SNAPSHOT_SCHEMA = 'merchantgo.snapshot';
const SNAPSHOT_VERSION = 2;
const LEGACY_SAMPLE_IDS = new Set(['FT1', 'FT2', 'BV1', 'M1', 'M3', 'B1', 'B2']);

export type LocalMode = 'SOLO_FOOD_TRUCK' | 'MULTI_STATION_BAR';

interface Revisioned {
  id: string;
  deviceId: string;
  revision: number;
}

export interface LocalStaff extends Revisioned {
  name: string;
  role: string;
  active: boolean;
  pinHash: string;
}

interface LocalConfig {
  deviceId: string;
  businessName: string;
  mode: LocalMode;
  staff: LocalStaff[];
}

export interface LocalShift {
  id: string;
  staffId: string;
  staffName: string;
  openedAt: string;
}

interface ClosedShift extends Revisioned, LocalShift {
  closedAt: string;
}

interface LocalOrder extends Revisioned {
  shiftId: string;
  operatorId: string;
  operatorName: string;
  status: 'ACTIVE' | 'SETTLED';
  paymentMethod?: string;
  total: number;
  items: unknown[];
  table: string;
  createdAt: string;
  settledAt?: string;
  closedShiftId?: string;
}

export interface LocalZReport extends Revisioned {
  shiftId: string;
  staffName: string;
  openedAt: string;
  closedAt: string;
  grossRevenue: number;
  cash: number;
  card: number;
  orderCount: number;
}

export interface LocalMenuItem extends Revisioned {
  name: string;
  category: string;
  price: number;
  active: boolean;
  type?: 'ITEM' | 'INGREDIENT';
}

export interface LocalSnapshot {
  schema: typeof SNAPSHOT_SCHEMA;
  version: typeof SNAPSHOT_VERSION;
  deviceId: string;
  exportedAt: string;
  data: {
    menuItems: LocalMenuItem[];
    branches: Array<Revisioned & Record<string, unknown>>;
    staffProfiles: Array<Revisioned & { name: string; role: string; active: boolean }>;
    orders: LocalOrder[];
    shifts: ClosedShift[];
    zReports: LocalZReport[];
  };
}

export interface MergePreview {
  additions: Record<string, number>;
  conflicts: Array<{ collection: string; id: string }>;
}

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function config(): LocalConfig | null {
  return read<LocalConfig | null>(CONFIG_KEY, null);
}

function requireConfig(): LocalConfig {
  const value = config();
  if (!value) throw new Error('Initialize the local register first');
  return value;
}

async function hashPin(pin: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function sessionFor(staff: LocalStaff, local: LocalConfig): MerchantSession {
  const multiStation = local.mode === 'MULTI_STATION_BAR';
  return {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    plan: 'FREE',
    mode: local.mode,
    entitlements: {
      features: [
        'CREATE_ORDER',
        'SETTLE_ORDER',
        'VIEW_ANALYTICS',
        ...(['ADMIN', 'OWNER'].includes(staff.role) ? ['MANAGE_MENU', 'INDIVIDUAL_CASHOUT'] : []),
        ...(multiStation && ['ADMIN', 'OWNER'].includes(staff.role) ? ['MANAGE_STAFF'] : []),
      ],
      limits: { menuItems: 999, staff: 99, branches: 1 },
    },
    offline: true,
  };
}

function assertPin(pin: string) {
  if (!/^\d{4}$/.test(pin)) throw new Error('Use a 4 digit staff PIN');
}

function mergeCollection<T extends Revisioned>(
  local: T[],
  incoming: T[],
  mutable: boolean,
  policy?: 'local' | 'remote',
): T[] {
  const merged = new Map(local.map(record => [record.id, record]));
  for (const record of incoming) {
    const current = merged.get(record.id);
    if (!current) {
      merged.set(record.id, record);
    } else if (mutable && current.revision !== record.revision && policy === 'remote') {
      merged.set(record.id, record);
    }
  }
  return [...merged.values()];
}

export function hasLocalRegister(): boolean {
  return Boolean(config()?.staff.length);
}

export function getLocalMode(): LocalMode {
  return config()?.mode || 'SOLO_FOOD_TRUCK';
}

export async function createLocalAdmin(
  name: string,
  pin: string,
  mode: LocalMode = 'SOLO_FOOD_TRUCK',
): Promise<MerchantSession> {
  assertPin(pin);
  const deviceId = crypto.randomUUID();
  const staff: LocalStaff = {
    id: crypto.randomUUID(),
    deviceId,
    revision: 1,
    name: name.trim() || 'Local Admin',
    role: 'OWNER',
    active: true,
    pinHash: await hashPin(pin),
  };
  const local = { deviceId, businessName: 'My Business', mode, staff };
  write(CONFIG_KEY, { ...local, staff: [staff] });
  return sessionFor(staff, { ...local, staff: [staff] });
}

export async function addLocalStaff(name: string, pin: string): Promise<void> {
  assertPin(pin);
  const local = requireConfig();
  if (local.mode === 'SOLO_FOOD_TRUCK') throw new Error('Solo Food Truck mode uses the admin as its only operator');
  const pinHash = await hashPin(pin);
  if (local.staff.some(member => member.pinHash === pinHash)) throw new Error('That PIN is already assigned');
  local.staff.push({
    id: crypto.randomUUID(),
    deviceId: local.deviceId,
    revision: 1,
    name: name.trim() || 'Crew Member',
    role: 'CASHIER',
    active: true,
    pinHash,
  });
  write(CONFIG_KEY, local);
}

export async function authenticateLocalPin(pin: string): Promise<MerchantSession> {
  const local = requireConfig();
  const pinHash = await hashPin(pin);
  const staff = local.staff.find(member => member.active && member.pinHash === pinHash);
  if (!staff) throw new Error('Invalid local staff PIN');
  const shift = getLocalShift();
  if (shift && shift.staffId !== staff.id) throw new Error(`${shift.staffName} must close the current shift first`);
  return sessionFor(staff, local);
}

export function getLocalShift(): LocalShift | null {
  return read<LocalShift | null>(SHIFT_KEY, null);
}

export async function startLocalShift(pin: string): Promise<LocalShift> {
  const staff = await authenticateLocalPin(pin);
  const existing = getLocalShift();
  if (existing) return existing;
  const shift = { id: crypto.randomUUID(), staffId: staff.id, staffName: staff.name, openedAt: new Date().toISOString() };
  write(SHIFT_KEY, shift);
  return shift;
}

export function recordLocalOrder(
  payload: { table: string; total: number; items: unknown[]; paymentMethod?: string },
  settled: boolean,
) {
  const local = requireConfig();
  const shift = getLocalShift();
  if (!shift) throw new Error('Start a staff shift before recording orders');
  const now = new Date().toISOString();
  const orders = read<LocalOrder[]>(ORDERS_KEY, []);
  orders.push({
    id: crypto.randomUUID(),
    deviceId: local.deviceId,
    revision: 1,
    shiftId: shift.id,
    operatorId: shift.staffId,
    operatorName: shift.staffName,
    status: settled ? 'SETTLED' : 'ACTIVE',
    paymentMethod: payload.paymentMethod,
    total: Number(payload.total) || 0,
    items: payload.items,
    table: payload.table,
    createdAt: now,
    ...(settled ? { settledAt: now } : {}),
  });
  write(ORDERS_KEY, orders);
}

export function closeLocalShift(): LocalZReport {
  const local = requireConfig();
  const shift = getLocalShift();
  if (!shift) throw new Error('Start a staff shift before generating a Z-report');
  const closedAt = new Date().toISOString();
  const allOrders = read<LocalOrder[]>(ORDERS_KEY, []);
  const shiftOrders = allOrders.filter(order => order.status === 'SETTLED' && order.shiftId === shift.id);
  const report: LocalZReport = {
    id: `Z-${Date.now().toString(36).toUpperCase()}`,
    deviceId: local.deviceId,
    revision: 1,
    shiftId: shift.id,
    staffName: shift.staffName,
    openedAt: shift.openedAt,
    closedAt,
    grossRevenue: shiftOrders.reduce((sum, order) => sum + order.total, 0),
    cash: shiftOrders.filter(order => order.paymentMethod === 'CASH').reduce((sum, order) => sum + order.total, 0),
    card: shiftOrders.filter(order => order.paymentMethod === 'CARD').reduce((sum, order) => sum + order.total, 0),
    orderCount: shiftOrders.length,
  };
  write(ORDERS_KEY, allOrders.map(order => order.shiftId === shift.id ? { ...order, closedShiftId: shift.id } : order));
  write(SHIFTS_KEY, [...read<ClosedShift[]>(SHIFTS_KEY, []), {
    ...shift,
    deviceId: local.deviceId,
    revision: 1,
    closedAt,
  }]);
  write(REPORTS_KEY, [...read<LocalZReport[]>(REPORTS_KEY, []), report]);
  localStorage.removeItem(SHIFT_KEY);
  return report;
}

export function setLocalCatalog(menuItems: Array<Record<string, unknown>>) {
  const local = requireConfig();
  write(CATALOG_KEY, menuItems.map((item, index) => ({
    ...item,
    id: String(item.id || crypto.randomUUID()),
    deviceId: String(item.deviceId || local.deviceId),
    revision: Number(item.revision || 1),
    position: index,
  })));
}

export function getLocalCatalog(): LocalMenuItem[] {
  const items = read<LocalMenuItem[]>(CATALOG_KEY, []);
  if (items.length > 0 && items.every(item => LEGACY_SAMPLE_IDS.has(item.id))) {
    write(CATALOG_KEY, []);
    return [];
  }
  return items;
}

export function addLocalMenuItem(name: string, category: string, price: number, type: 'ITEM' | 'INGREDIENT' = 'ITEM'): LocalMenuItem[] {
  const local = requireConfig();
  const items = getLocalCatalog();
  if (!name.trim()) throw new Error('Menu item name is required');
  if (!Number.isFinite(price) || price < 0) throw new Error('Enter a valid price or cost');
  if (items.length >= 25) throw new Error('Free offline menus support up to 25 items');
  const next = [...items, {
    id: `ITEM-${Date.now().toString(36).toUpperCase()}`,
    deviceId: local.deviceId,
    revision: 1,
    name: name.trim(),
    category: category.trim() || (type === 'INGREDIENT' ? 'Ingredient' : 'Menu'),
    price,
    active: true,
    type,
  }];
  write(CATALOG_KEY, next);
  return next;
}

export function removeLocalMenuItem(id: string): LocalMenuItem[] {
  const next = getLocalCatalog().filter(item => item.id !== id);
  write(CATALOG_KEY, next);
  return next;
}

export function createLocalSnapshot(): LocalSnapshot {
  const local = requireConfig();
  return {
    schema: SNAPSHOT_SCHEMA,
    version: SNAPSHOT_VERSION,
    deviceId: local.deviceId,
    exportedAt: new Date().toISOString(),
    data: {
      menuItems: getLocalCatalog(),
      branches: [{
        id: 'branch_root',
        deviceId: local.deviceId,
        revision: 1,
        name: local.businessName,
      }],
      staffProfiles: local.staff.map(({ pinHash: _pinHash, ...staff }) => staff),
      orders: read<LocalOrder[]>(ORDERS_KEY, []).filter(order => Boolean(order.closedShiftId)),
      shifts: read<ClosedShift[]>(SHIFTS_KEY, []),
      zReports: read<LocalZReport[]>(REPORTS_KEY, []),
    },
  };
}

export function previewLocalMerge(snapshot: LocalSnapshot): MergePreview {
  if (snapshot?.schema !== SNAPSHOT_SCHEMA || snapshot.version !== SNAPSHOT_VERSION) {
    throw new Error('Unsupported MerchantGo snapshot');
  }
  const local = createLocalSnapshot();
  const mutable = ['menuItems', 'branches', 'staffProfiles'] as const;
  const appendOnly = ['orders', 'shifts', 'zReports'] as const;
  const additions: Record<string, number> = {};
  const conflicts: Array<{ collection: string; id: string }> = [];
  for (const key of [...mutable, ...appendOnly]) {
    const current = new Map(local.data[key].map(record => [record.id, record]));
    additions[key] = snapshot.data[key].filter(record => !current.has(record.id)).length;
    if (mutable.includes(key as typeof mutable[number])) {
      for (const record of snapshot.data[key]) {
        const existing = current.get(record.id);
        if (existing && existing.revision !== record.revision) conflicts.push({ collection: key, id: record.id });
      }
    }
  }
  return { additions, conflicts };
}

export function commitLocalMerge(snapshot: LocalSnapshot, policy: 'local' | 'remote' = 'local') {
  previewLocalMerge(snapshot);
  const local = requireConfig();
  const catalog = mergeCollection(read(CATALOG_KEY, []), snapshot.data.menuItems, true, policy);
  write(CATALOG_KEY, catalog);
  const remoteStaff = snapshot.data.staffProfiles.map(profile => ({ ...profile, pinHash: '' }));
  const mergedProfiles = mergeCollection(
    local.staff.map(({ pinHash: _pinHash, ...staff }) => staff),
    remoteStaff,
    true,
    policy,
  );
  local.staff = mergedProfiles.map(profile => {
    const current = local.staff.find(staff => staff.id === profile.id);
    return { ...profile, pinHash: current?.pinHash || '' };
  });
  write(CONFIG_KEY, local);
  write(ORDERS_KEY, mergeCollection(read(ORDERS_KEY, []), snapshot.data.orders, false));
  write(SHIFTS_KEY, mergeCollection(read(SHIFTS_KEY, []), snapshot.data.shifts, false));
  write(REPORTS_KEY, mergeCollection(read(REPORTS_KEY, []), snapshot.data.zReports, false));
}
