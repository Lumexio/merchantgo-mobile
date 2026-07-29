import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface ModifierModalProps {
  item: any;
  onClose: () => void;
  onConfirm: (modifiedItem: any) => void;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({ item, onClose, onConfirm }) => {
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);

  const availableExtras = [
    { name: 'Extra Truffle Cream', price: 2.50 },
    { name: 'Double Protein Shot', price: 4.50 },
    { name: 'Side Avocado Salsa', price: 2.00 },
    { name: 'No Onions / Allergic', price: 0.00, alert: true }
  ];

  const toggleExtra = (extra: any) => {
    if (selectedExtras.some(e => e.name === extra.name)) {
      setSelectedExtras(selectedExtras.filter(e => e.name !== extra.name));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };

  const calculateTotalPrice = () => {
    const base = parseFloat(item.price.replace('$', ''));
    const extrasSum = selectedExtras.reduce((sum, e) => sum + e.price, 0);
    return (base + extrasSum).toFixed(2);
  };

  const handleAdd = () => {
    const customTitle = `${item.name}${selectedExtras.length ? ' (' + selectedExtras.map(e => e.name).join(', ') + ')' : ''}`;
    onConfirm({
      ...item,
      customName: customTitle,
      calculatedPrice: parseFloat(calculateTotalPrice())
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-tablet" style={{ width: '100%', maxWidth: '580px', padding: '36px', position: 'relative', border: '1px solid var(--border-glass)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '12px', width: '42px', height: '42px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={22} />
        </button>

        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#00b368', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
          Ingredient Engineering & Modifiers
        </span>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '10px', color: '#fff' }}>{item.name}</h2>
        <span style={{ fontSize: '1.3rem', color: '#00b368', fontWeight: 800, fontFamily: 'Outfit', display: 'block', marginBottom: '24px' }}>
          Base Price: {item.price}
        </span>

        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '14px' }}>
          Tap to add extra ingredients or kitchen notices:
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {availableExtras.map((ex, idx) => {
            const isSelected = selectedExtras.some(e => e.name === ex.name);
            return (
              <div 
                key={idx} 
                onClick={() => toggleExtra(ex)}
                style={{
                  padding: '16px 20px',
                  borderRadius: '14px',
                  background: isSelected ? 'rgba(0, 179, 104, 0.15)' : 'rgba(255,255,255,0.04)',
                  border: isSelected ? '2px solid #00b368' : '1px solid var(--border-glass)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.3)', backgroundColor: isSelected ? '#00b368' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSelected && <Check size={16} color="#000" />}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: ex.alert ? '#ff8585' : '#fff' }}>{ex.name}</span>
                </div>
                <span style={{ fontWeight: 800, color: '#00b368', fontSize: '1rem' }}>
                  {ex.price > 0 ? `+ $${ex.price.toFixed(2)}` : 'FREE'}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Total Item Calculation:</span>
            <strong style={{ fontSize: '2.2rem', fontFamily: 'Outfit', color: '#fff' }}>${calculateTotalPrice()}</strong>
          </div>
          
          <button onClick={handleAdd} className="btn-staff" style={{ padding: '16px 36px', fontSize: '1.15rem' }}>
            Confirm & Add to Table →
          </button>
        </div>
      </div>
    </div>
  );
};
