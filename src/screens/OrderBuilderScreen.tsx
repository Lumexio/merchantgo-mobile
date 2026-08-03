import React, { useEffect, useState } from 'react';
import { Lock, Search, Plus, Minus, Utensils, Zap } from 'lucide-react';
import { ModifierModal } from '../components/ModifierModal';
import { fetchMenuCatalog, flushOfflineQueue, settleExpressOrder, submitOrderToCloud } from '../api/cloudClient';
import type { MerchantSession } from '../api/cloudClient';
import { ShiftControl } from '../components/ShiftControl';
import { AdminSettings } from '../components/AdminSettings';
import { MenuRegistrationModal } from '../components/MenuRegistrationModal';
import { getLocalCatalog, getLocalShift, recordLocalOrder } from '../localPos';
import type { LocalMenuItem } from '../localPos';

interface OrderBuilderProps {
  session: MerchantSession;
  onLock: () => void;
}

export const OrderBuilderScreen: React.FC<OrderBuilderProps> = ({ session, onLock }) => {
  const isSoloModeInit = session.mode === 'SOLO_FOOD_TRUCK';
  const [mode, setMode] = useState<'EXPRESS' | 'TABLE'>(isSoloModeInit ? 'EXPRESS' : 'TABLE');
  const [activeOperator, setActiveOperator] = useState(() => getLocalShift()?.staffName || session.name);
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState(isSoloModeInit ? 'Express Counter #1' : 'Table #4 (Patio)');
  
  const [cart, setCart] = useState<any[]>([]);
  
  const [activeItemForMod, setActiveItemForMod] = useState<any | null>(null);
  const [editingCartItemIdx, setEditingCartItemIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showExpressPayModal, setShowExpressPayModal] = useState(false);
  const [cashTendered, setCashTendered] = useState<number | null>(null);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showMenuRegistration, setShowMenuRegistration] = useState(false);

  const displayCatalog = (items: LocalMenuItem[]) => items.map(item => ({
    id: item.id,
    name: item.name,
    cat: item.category,
    price: `$${item.price.toFixed(2)}`,
    image: '🍽️',
  }));
  const [catalog, setCatalog] = useState(() => session.offline ? displayCatalog(getLocalCatalog()) : []);
  const [catalogNotice, setCatalogNotice] = useState('');
  const categories = ['All', ...new Set(catalog.map(item => item.cat))];

  const filteredCatalog = catalog.filter(it => {
    const matchesCat = selectedCategory === 'All' || it.cat === selectedCategory;
    const matchesSearch = it.name.toLowerCase().includes(searchQuery.toLowerCase()) || it.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddItemToCart = (modifiedItem: any) => {
    const existsIndex = cart.findIndex(c => c.customName === modifiedItem.customName);
    if (existsIndex >= 0) {
      const updated = [...cart];
      updated[existsIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        id: Math.random().toString(),
        customName: modifiedItem.customName,
        price: modifiedItem.calculatedPrice,
        qty: 1
      }]);
    }
    setActiveItemForMod(null);
  };

  const handleUpdateCartItem = (modifiedItem: any) => {
    if (editingCartItemIdx !== null) {
      const updated = [...cart];
      updated[editingCartItemIdx].customName = modifiedItem.customName;
      updated[editingCartItemIdx].price = modifiedItem.calculatedPrice;
      setCart(updated);
    }
    setEditingCartItemIdx(null);
  };

  const adjustQty = (idx: number, delta: number) => {
    const updated = [...cart];
    updated[idx].qty += delta;
    if (updated[idx].qty <= 0) {
      updated.splice(idx, 1);
    }
    setCart(updated);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  useEffect(() => {
    if (!session.token || session.offline) return;
    flushOfflineQueue(session.token).catch(() => null);
  }, [session.token, session.offline]);

  useEffect(() => {
    if (session.offline) {
      setCatalog(displayCatalog(getLocalCatalog()));
      return;
    }
    if (!session.token) return;
    fetchMenuCatalog(session)
      .then(items => {
        if (items.length) {
          setCatalog(items);
        }
        setCatalogNotice(
          session.plan === 'FREE'
            ? 'Catalog loaded from your Google Drive.'
            : 'Catalog loaded from MerchantGo managed storage.',
        );
      })
      .catch(error => setCatalogNotice(
        error instanceof Error ? error.message : 'Catalog sync failed',
      ));
  }, [session]);

  const handleTableOrderConfirm = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        table: selectedTable,
        total: cartTotal,
        items: cart.map(item => `${item.customName} x${item.qty}`),
      };
      if (!session.offline) {
        await submitOrderToCloud(payload, session.token || '');
      } else {
        if (!getLocalShift()) throw new Error('Start a staff shift before creating orders');
        recordLocalOrder(payload, false);
      }
      setSubmitting(false);
      alert(`Order confirmed for ${selectedTable}. The shared station will now lock.`);
      onLock();
    } catch (error) {
      setSubmitting(false);
      alert(error instanceof Error ? error.message : 'Order submission failed');
    }
  };

  const handleRapidExpressSettle = async (paymentMethod: 'CASH' | 'CARD') => {
    setSubmitting(true);
    try {
      const payload = {
        paymentMethod,
        table: selectedTable,
        total: cartTotal,
        items: cart.map(item => `${item.customName} x${item.qty}`),
      };
      if (!session.offline) {
        await settleExpressOrder(payload, session.token || '');
      } else {
        if (!getLocalShift()) throw new Error('Start a staff shift before settling orders');
        recordLocalOrder(payload, true);
      }
      setSubmitting(false);
      setShowExpressPayModal(false);
      setCashTendered(null);
      alert(`Express ${paymentMethod.toLowerCase()} payment recorded. Cart cleared for the next customer.`);
      setCart([]);
    } catch (error) {
      setSubmitting(false);
      alert(error instanceof Error ? error.message : 'Settlement failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0c10' }}>
      <header style={{ borderBottom: '1px solid var(--border-glass)', padding: '14px 28px', backgroundColor: 'rgba(16,19,26,0.95)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <button
              onClick={() => { setMode('EXPRESS'); setSelectedTable('Express Counter #1'); }}
              style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: mode === 'EXPRESS' ? 'var(--accent-success)' : 'transparent', color: mode === 'EXPRESS' ? '#000' : 'var(--text-main)', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              <Zap size={15} /> Express Register
            </button>
            <button
              onClick={() => { setMode('TABLE'); setSelectedTable('Table #4 (Patio)'); }}
              style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: mode === 'TABLE' ? '#00b368' : 'transparent', color: mode === 'TABLE' ? 'var(--text-main)' : '#ccc', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              🍽️ Table Service
            </button>
          </div>

        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {session.role === 'ADMIN' && (
            <>
              <button onClick={() => setShowMenuRegistration(true)} className="btn-secondary" style={{ padding: '10px 14px', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}>
                + Menu / Ingredients
              </button>
              <button onClick={() => setShowAdminSettings(true)} className="btn-secondary" style={{ padding: '10px 14px' }}>
                Settings & Sync
              </button>
            </>
          )}
          <ShiftControl
            offline={session.offline}
            onLock={onLock}
            onShiftChange={shift => setActiveOperator(shift?.staffName || session.name)}
          />
          <select 
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            style={{ background: 'var(--border-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '10px 18px', borderRadius: '12px', fontSize: '1.02rem', fontWeight: 700, fontFamily: 'Outfit', outline: 'none' }}
          >
            {mode === 'EXPRESS' ? (
              <>
                <option>⚡ Express Counter #1 (Window)</option>
                <option>⚡ Express Counter #2 (Queue)</option>
                <option>📦 Phone Pick-up / Takeout</option>
              </>
            ) : (
              <>
                <option>Table #4 (Patio)</option>
                <option>Table #8 (VIP Lounge)</option>
                <option>Bar Station #2</option>
                <option>General Dining #15</option>
              </>
            )}
          </select>

          {['CASHIER', 'MANAGER', 'ADMIN', 'OWNER'].includes(session.role?.toUpperCase()) && (
            <select
              onChange={(e) => document.documentElement.setAttribute('data-theme', e.target.value)}
              style={{ background: 'var(--border-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.9rem', outline: 'none' }}
              title="Theme (Ponytail mode: minimal CSS-based themes)"
            >
              <option value="dark-default">Dark (Default)</option>
              <option value="light-default">Light</option>
              <option value="dark-ocean">Ocean</option>
              <option value="light-warm">Warm</option>
            </select>
          )}
          <button onClick={onLock} className="btn-secondary" style={{ padding: '10px 18px', background: 'rgba(var(--accent-error-rgb, 255, 77, 77), 0.15)', borderColor: 'rgba(var(--accent-error-rgb, 255, 77, 77), 0.4)', color: '#ff4d4d', fontWeight: 800 }}>
            <Lock size={16} /> {mode === 'EXPRESS' ? 'Lock Register' : 'Lock Station'}
          </button>
        </div>
      </header>
      {catalogNotice && (
        <div style={{ padding: '8px 28px', background: 'rgba(0,255,102,0.1)', color: 'var(--accent-success)', fontSize: '0.8rem' }}>
          {catalogNotice}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto', borderRight: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px' }} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu item title or code (e.g. Smash Burger, FT1)..." 
                style={{ width: '100%', padding: '16px 16px 16px 48px', background: 'var(--glass-overlay)', border: '1px solid var(--border-glass)', borderRadius: '14px', color: 'var(--text-main)', fontSize: '1.05rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0 18px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: selectedCategory === cat ? 'var(--accent-success)' : 'var(--glass-overlay)',
                    color: selectedCategory === cat ? '#000' : 'var(--text-main)',
                    fontWeight: 800,
                    fontFamily: 'Outfit',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '22px' }}>
            {catalog.length === 0 && (
              <div className="glass-tablet" style={{ gridColumn: '1 / -1', padding: '36px', textAlign: 'center', border: '1px dashed var(--accent-success)' }}>
                <span style={{ fontSize: '2.5rem' }}>1️⃣</span>
                <h2 style={{ margin: '10px 0' }}>Create your first menu item</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Your new offline POS starts empty. Add the food and drinks you actually sell, then start a shift and take orders.
                </p>
                {session.role === 'ADMIN' && session.offline && (
                  <button onClick={() => setShowMenuRegistration(true)} className="btn-staff" style={{ padding: '12px 20px' }}>
                    Open Menu Registration
                  </button>
                )}
              </div>
            )}
            {filteredCatalog.map(it => (
              <div key={it.id} onClick={() => setActiveItemForMod(it)} className="glass-tablet" style={{ padding: '24px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', borderTop: '3px solid var(--accent-success)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span style={{ fontSize: '2.6rem' }}>{it.image}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '3px 8px', background: 'var(--border-glass)', borderRadius: '6px', color: 'var(--text-muted)' }}>
                      #{it.id}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.3rem', color: 'var(--text-main)', marginBottom: '4px' }}>{it.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{it.cat}</span>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-success)', fontFamily: 'Outfit' }}>{it.price}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', backgroundColor: 'var(--border-glass)', padding: '6px 12px', borderRadius: '8px', fontWeight: 700 }}>
                    + Add / Custom
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: '420px', backgroundColor: 'rgba(12,15,20,0.95)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '1px solid var(--border-glass)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>
                {mode === 'EXPRESS' ? '⚡ EXPRESS COUNTER TICKET' : 'TABLE ORDER CART'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-success)', fontWeight: 800 }}>
                Operator: {activeOperator}
              </span>
            </div>
            <h2 style={{ fontSize: '1.7rem', color: 'var(--text-main)', marginBottom: '14px' }}>{selectedTable}</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ccc' }}>
              <span>Items Total: <strong>{cart.reduce((s, i) => s + i.qty, 0)} units</strong></span>
              <span style={{ color: 'var(--accent-success)', fontWeight: 700 }}>● {mode === 'EXPRESS' ? 'Ready to Settle' : 'Ready to Send'}</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cart.map((item, idx) => (
              <div key={idx} style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-overlay-hover)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span onClick={() => setEditingCartItemIdx(idx)} style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', cursor: 'pointer', textDecoration: 'underline' }} title="Tap to add or edit modifiers">{item.customName}</span>
                  <strong style={{ fontFamily: 'Outfit', fontSize: '1.15rem', color: 'var(--accent-success)' }}>${(item.price * item.qty).toFixed(2)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>${item.price.toFixed(2)} each</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-input)', padding: '4px 8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={() => adjustQty(idx, -1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px' }}>
                      <Minus size={16} />
                    </button>
                    <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                    <button onClick={() => adjustQty(idx, 1)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-success)', cursor: 'pointer', padding: '4px' }}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div style={{ textAlign: 'center', margin: 'auto 0', color: 'var(--text-muted)' }}>
                <Utensils size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>No items in cart. Tap items from menu catalog on the left to build the account.</p>
              </div>
            )}
          </div>

          <div style={{ padding: '28px', backgroundColor: '#07080c', borderTop: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Gross Order Sum:</span>
              <span style={{ fontSize: '2.6rem', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-main)' }}>${cartTotal.toFixed(2)}</span>
            </div>

            {mode === 'EXPRESS' ? (
              <button 
                onClick={() => setShowExpressPayModal(true)} 
                disabled={cart.length === 0 || submitting} 
                className="btn-staff" 
                style={{ width: '100%', padding: '18px', fontSize: '1.25rem', opacity: cart.length === 0 ? 0.5 : 1, background: '#00cc52', color: '#000' }}
              >
                ⚡ Rapid Pay & Settle (${cartTotal.toFixed(2)}) →
              </button>
            ) : (
              <button 
                onClick={handleTableOrderConfirm} 
                disabled={cart.length === 0 || submitting} 
                className="btn-staff" 
                style={{ width: '100%', padding: '18px', fontSize: '1.15rem', opacity: cart.length === 0 ? 0.5 : 1 }}
              >
                {submitting ? 'Committing & Syncing...' : 'Confirm Order & Auto-Lock Station →'}
              </button>
            )}
          </div>
        </div>
      </div>

      {activeItemForMod && (
        <ModifierModal 
          item={activeItemForMod}
          onClose={() => setActiveItemForMod(null)}
          onConfirm={handleAddItemToCart}
        />
      )}

      {editingCartItemIdx !== null && (
        <ModifierModal 
          item={{ name: cart[editingCartItemIdx].customName, price: `$${cart[editingCartItemIdx].price.toFixed(2)}` }}
          onClose={() => setEditingCartItemIdx(null)}
          onConfirm={handleUpdateCartItem}
        />
      )}

      {showExpressPayModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-tablet" style={{ width: '100%', maxWidth: '540px', padding: '40px', position: 'relative', border: '2px solid var(--accent-success)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-success)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              ⚡ Express Quick-Serve Settlement
            </span>
            <h2 style={{ fontSize: '2.4rem', color: 'var(--text-main)', marginBottom: '6px' }}>Total Due: ${cartTotal.toFixed(2)}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '28px' }}>
              Select instant settlement method below to execute and wipe cart for next inline customer.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--glass-overlay-hover)', textAlign: 'left' }}>
              <span style={{ fontSize: '0.85rem', color: '#ccc', fontWeight: 700, display: 'block', marginBottom: '14px' }}>💵 Cash Tender & Change Calculator:</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[20, 50, 100].map((amt) => (
                  <button 
                    key={amt}
                    onClick={() => setCashTendered(amt)}
                    style={{ padding: '14px', borderRadius: '12px', background: cashTendered === amt ? '#00cc52' : 'var(--border-glass)', border: '1px solid var(--border-glass)', color: cashTendered === amt ? '#000' : 'var(--text-main)', fontWeight: 800, fontSize: '1.3rem', fontFamily: 'Outfit', cursor: 'pointer', transition: '0.15s' }}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              
              {cashTendered !== null && (
                <div style={{ padding: '12px', background: 'rgba(0, 255, 102, 0.1)', borderRadius: '12px', border: '1px solid rgba(0, 255, 102, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--accent-success)', fontWeight: 700 }}>Return Change to Customer:</span>
                  <strong style={{ fontSize: '1.6rem', color: 'var(--accent-success)', fontFamily: 'Outfit' }}>
                    ${Math.max(0, cashTendered - cartTotal).toFixed(2)}
                  </strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button onClick={() => handleRapidExpressSettle('CASH')} disabled={submitting} className="btn-staff" style={{ width: '100%', padding: '16px', fontSize: '1.15rem', background: '#00cc52', color: '#000' }}>
                💵 Confirm Cash Payment & Wipe Cart →
              </button>
              <button onClick={() => handleRapidExpressSettle('CARD')} disabled={submitting} className="btn-staff" style={{ width: '100%', padding: '16px', fontSize: '1.15rem', background: '#635bff', color: 'var(--text-main)' }}>
                💳 Confirm External Card Terminal Payment
              </button>
              <button onClick={() => setShowExpressPayModal(false)} className="btn-secondary" style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '6px' }}>
                Cancel / Return to Cart
              </button>
            </div>

          </div>
        </div>
      )}
      {showAdminSettings && (
        <AdminSettings
          operator={session}
          onClose={() => setShowAdminSettings(false)}
        />
      )}

      {showMenuRegistration && (
        <MenuRegistrationModal
          onClose={() => setShowMenuRegistration(false)}
          onCatalogChange={items => setCatalog(displayCatalog(items))}
        />
      )}

    </div>
  );
};
