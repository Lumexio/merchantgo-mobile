import React, { useState } from 'react';
import { Lock, Search, Plus, Minus, Utensils, Zap, Users } from 'lucide-react';
import { ModifierModal } from '../components/ModifierModal';

interface OrderBuilderProps {
  staffName: string;
  onLock: () => void;
}

export const OrderBuilderScreen: React.FC<OrderBuilderProps> = ({ staffName, onLock }) => {
  const isSoloModeInit = staffName.includes('Solo') || staffName.includes('Express');
  const [mode, setMode] = useState<'EXPRESS' | 'TABLE'>(isSoloModeInit ? 'EXPRESS' : 'TABLE');
  const [activeOperator, setActiveOperator] = useState(isSoloModeInit ? 'Owner (Lone Truck)' : staffName);
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState(isSoloModeInit ? 'Express Counter #1' : 'Table #4 (Patio)');
  
  const [cart, setCart] = useState<any[]>([
    { id: '1', customName: isSoloModeInit ? 'Gourmet Smash Burger' : 'Ribeye Tacos', price: isSoloModeInit ? 16.50 : 18.50, qty: 2 },
    { id: '2', customName: isSoloModeInit ? 'Agave Craft Lemonade' : 'Añejo Margarita', price: isSoloModeInit ? 6.50 : 14.00, qty: 1 }
  ]);
  
  const [activeItemForMod, setActiveItemForMod] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showExpressPayModal, setShowExpressPayModal] = useState(false);
  const [cashTendered, setCashTendered] = useState<number | null>(null);

  const categories = ['All', 'Food Truck Specials', 'Main Kitchen', 'Beverages', 'Bar & Cocktails'];

  const catalog = [
    { id: 'FT1', name: 'Gourmet Smash Burger', cat: 'Food Truck Specials', price: '$16.50', image: '🍔' },
    { id: 'FT2', name: 'Loaded Truffle Fries', cat: 'Food Truck Specials', price: '$9.00', image: '🍟' },
    { id: 'BV1', name: 'Agave Craft Lemonade', cat: 'Beverages', price: '$6.50', image: '🍋' },
    { id: 'M1', name: 'Ribeye Tacos (3pc)', cat: 'Main Kitchen', price: '$18.50', image: '🌮' },
    { id: 'M3', name: 'Guacamole Bowl & Chips', cat: 'Main Kitchen', price: '$12.00', image: '🥑' },
    { id: 'B1', name: 'Añejo Margarita', cat: 'Bar & Cocktails', price: '$14.00', image: '🍸' },
    { id: 'B2', name: 'IPA Craft Beer Pint', cat: 'Bar & Cocktails', price: '$8.00', image: '🍺' },
  ];

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

  const adjustQty = (idx: number, delta: number) => {
    const updated = [...cart];
    updated[idx].qty += delta;
    if (updated[idx].qty <= 0) {
      updated.splice(idx, 1);
    }
    setCart(updated);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleTableOrderConfirm = () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      alert(`✅ Table order emitted via WebSockets for [${selectedTable}]. Station will now auto-lock for shared Waiter security.`);
      onLock();
    }, 600);
  };

  const handleRapidExpressSettle = (method: string) => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setShowExpressPayModal(false);
      setCashTendered(null);
      alert(`⚡ [Express Settle via ${method}] $${cartTotal.toFixed(2)} recorded to Appwrite & Stripe! Cart wiped instantly for next customer in queue.`);
      setCart([]);
    }, 500);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0c10' }}>
      <header style={{ borderBottom: '1px solid var(--border-glass)', padding: '14px 28px', backgroundColor: 'rgba(16,19,26,0.95)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <button
              onClick={() => { setMode('EXPRESS'); setSelectedTable('Express Counter #1'); }}
              style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: mode === 'EXPRESS' ? '#00ff66' : 'transparent', color: mode === 'EXPRESS' ? '#000' : '#fff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              <Zap size={15} /> Express Register
            </button>
            <button
              onClick={() => { setMode('TABLE'); setSelectedTable('Table #4 (Patio)'); }}
              style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: mode === 'TABLE' ? '#00b368' : 'transparent', color: mode === 'TABLE' ? '#fff' : '#ccc', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              🍽️ Table Service
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <Users size={16} color="#00ff66" />
            <select 
              value={activeOperator}
              onChange={(e) => setActiveOperator(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.92rem', fontFamily: 'Outfit', outline: 'none', cursor: 'pointer' }}
            >
              <option value="Owner (Lone Truck)">👤 Owner (Lone Truck)</option>
              <option value="Helper #1 (Marco)">👤 Helper #1 (Marco)</option>
              <option value="Helper #2 (Sofia)">👤 Helper #2 (Sofia)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <select 
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-glass)', color: '#fff', padding: '10px 18px', borderRadius: '12px', fontSize: '1.02rem', fontWeight: 700, fontFamily: 'Outfit', outline: 'none' }}
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

          <button onClick={onLock} className="btn-secondary" style={{ padding: '10px 18px', background: 'rgba(255, 77, 77, 0.15)', borderColor: 'rgba(255, 77, 77, 0.4)', color: '#ff4d4d', fontWeight: 800 }}>
            <Lock size={16} /> {mode === 'EXPRESS' ? 'Lock Register' : 'Lock Station'}
          </button>
        </div>
      </header>

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
                style={{ width: '100%', padding: '16px 16px 16px 48px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '14px', color: '#fff', fontSize: '1.05rem', outline: 'none' }}
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
                    backgroundColor: selectedCategory === cat ? '#00ff66' : 'rgba(255,255,255,0.05)',
                    color: selectedCategory === cat ? '#000' : '#fff',
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
            {filteredCatalog.map(it => (
              <div key={it.id} onClick={() => setActiveItemForMod(it)} className="glass-tablet" style={{ padding: '24px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', borderTop: '3px solid #00ff66' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span style={{ fontSize: '2.6rem' }}>{it.image}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '3px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', color: 'var(--text-muted)' }}>
                      #{it.id}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '4px' }}>{it.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{it.cat}</span>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00ff66', fontFamily: 'Outfit' }}>{it.price}</span>
                  <span style={{ fontSize: '0.8rem', color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '8px', fontWeight: 700 }}>
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
              <span style={{ fontSize: '0.75rem', color: '#00ff66', fontWeight: 800 }}>
                Operator: {activeOperator}
              </span>
            </div>
            <h2 style={{ fontSize: '1.7rem', color: '#fff', marginBottom: '14px' }}>{selectedTable}</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ccc' }}>
              <span>Items Total: <strong>{cart.reduce((s, i) => s + i.qty, 0)} units</strong></span>
              <span style={{ color: '#00ff66', fontWeight: 700 }}>● {mode === 'EXPRESS' ? 'Ready to Settle' : 'Ready to Send'}</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cart.map((item, idx) => (
              <div key={idx} style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{item.customName}</span>
                  <strong style={{ fontFamily: 'Outfit', fontSize: '1.15rem', color: '#00ff66' }}>${(item.price * item.qty).toFixed(2)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>${item.price.toFixed(2)} each</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={() => adjustQty(idx, -1)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
                      <Minus size={16} />
                    </button>
                    <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                    <button onClick={() => adjustQty(idx, 1)} style={{ background: 'transparent', border: 'none', color: '#00ff66', cursor: 'pointer', padding: '4px' }}>
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
              <span style={{ fontSize: '2.6rem', fontWeight: 800, fontFamily: 'Outfit', color: '#fff' }}>${cartTotal.toFixed(2)}</span>
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

      {showExpressPayModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-tablet" style={{ width: '100%', maxWidth: '540px', padding: '40px', position: 'relative', border: '2px solid #00ff66', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#00ff66', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              ⚡ Express Quick-Serve Settlement
            </span>
            <h2 style={{ fontSize: '2.4rem', color: '#fff', marginBottom: '6px' }}>Total Due: ${cartTotal.toFixed(2)}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '28px' }}>
              Select instant settlement method below to execute and wipe cart for next inline customer.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}>
              <span style={{ fontSize: '0.85rem', color: '#ccc', fontWeight: 700, display: 'block', marginBottom: '14px' }}>💵 Cash Tender & Change Calculator:</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[20, 50, 100].map((amt) => (
                  <button 
                    key={amt}
                    onClick={() => setCashTendered(amt)}
                    style={{ padding: '14px', borderRadius: '12px', background: cashTendered === amt ? '#00cc52' : 'rgba(255,255,255,0.08)', border: '1px solid var(--border-glass)', color: cashTendered === amt ? '#000' : '#fff', fontWeight: 800, fontSize: '1.3rem', fontFamily: 'Outfit', cursor: 'pointer', transition: '0.15s' }}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              
              {cashTendered !== null && (
                <div style={{ padding: '12px', background: 'rgba(0, 255, 102, 0.1)', borderRadius: '12px', border: '1px solid rgba(0, 255, 102, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#00ff66', fontWeight: 700 }}>Return Change to Customer:</span>
                  <strong style={{ fontSize: '1.6rem', color: '#00ff66', fontFamily: 'Outfit' }}>
                    ${Math.max(0, cashTendered - cartTotal).toFixed(2)}
                  </strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button onClick={() => handleRapidExpressSettle('Exact Cash Tender')} className="btn-staff" style={{ width: '100%', padding: '16px', fontSize: '1.15rem', background: '#00cc52', color: '#000' }}>
                💵 Confirm Cash Payment & Wipe Cart →
              </button>
              <button onClick={() => handleRapidExpressSettle('Stripe Contactless NFC Terminal')} className="btn-staff" style={{ width: '100%', padding: '16px', fontSize: '1.15rem', background: '#635bff', color: '#fff' }}>
                💳 Settle via Stripe Contactless Card Reader
              </button>
              <button onClick={() => setShowExpressPayModal(false)} className="btn-secondary" style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '6px' }}>
                Cancel / Return to Cart
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
