import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App';
import {
  createLocalAdmin,
  startLocalShift,
  recordLocalOrder,
  listLocalOrders,
  closeLocalShift,
} from '../src/localPos';
import { fetchActiveOrders } from '../src/api/cloudClient';

describe('MerchantGo Mobile POS & Active Orders Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders root mobile entry point without crashing', () => {
    let html = '';
    expect(() => {
      html = renderToString(React.createElement(App));
    }).not.toThrow();
    expect(html).toContain('MerchantGo');
  });

  it('listLocalOrders returns only active shift orders from ORDERS_KEY', async () => {
    await createLocalAdmin('Mobile Operator', '5678', 'SOLO_FOOD_TRUCK');
    await startLocalShift('5678');

    // 1. Initial list is empty
    expect(listLocalOrders()).toEqual([]);

    // 2. Record an active order
    recordLocalOrder(
      { table: 'Table A1', total: 34.5, items: ['Pizza Margherita x1'] },
      false,
    );

    const activeOrders = listLocalOrders();
    expect(activeOrders.length).toBe(1);
    expect(activeOrders[0].table).toBe('Table A1');
    expect(activeOrders[0].total).toBe(34.5);
    expect(activeOrders[0].status).toBe('ACTIVE');

    // 3. Record a settled order (e.g. express counter payment)
    recordLocalOrder(
      { table: 'Express Counter', total: 12.0, items: ['Soda x2'], paymentMethod: 'CASH' },
      true,
    );

    // listLocalOrders must still only return the active one
    const openAfterSettled = listLocalOrders();
    expect(openAfterSettled.length).toBe(1);
    expect(openAfterSettled[0].table).toBe('Table A1');
  });

  it('fetchActiveOrders queries /orders/active with authorization and formats waiter as server', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          orders: [
            { id: 'ORD-991', table: 'Patio 2', waiter: 'Carlos', total: 58.0, items: ['Wine x1'] },
          ],
        },
      }),
    });
    global.fetch = fetchMock;

    // With token
    const orders = await fetchActiveOrders('mobile-token-xyz');
    expect(orders.length).toBe(1);
    expect(orders[0].id).toBe('ORD-991');
    expect(orders[0].server).toBe('Carlos');
    expect(orders[0].time).toBe('Cloud');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.merchantgo.store/api/v1/orders/active',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mobile-token-xyz',
        }),
      }),
    );

    // Without token
    const empty = await fetchActiveOrders();
    expect(empty).toEqual([]);
  });
});
