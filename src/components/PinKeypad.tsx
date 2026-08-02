import React, { useState } from 'react';
import { Lock, Delete, ShieldCheck } from 'lucide-react';
import { authenticatePin } from '../api/cloudClient';
import type { MerchantSession } from '../api/cloudClient';
import { authenticateLocalPin, hasLocalRegister } from '../localPos';

interface PinKeypadProps {
  onAuthenticate: (session: MerchantSession) => void;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({ onAuthenticate }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const updated = pin + num;
      setPin(updated);
      setError(null);
      if (updated.length === 4) {
        verifyPin(updated);
      }
    }
  };

  const verifyPin = async (code: string) => {
    try {
      onAuthenticate(await (hasLocalRegister() ? authenticateLocalPin(code) : authenticatePin(code)));
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Invalid staff PIN');
    } finally {
      setPin('');
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'radial-gradient(circle at center, #151a24 0%, #0a0c10 100%)' }}>
      <div className="glass-tablet" style={{ maxWidth: '460px', width: '100%', padding: '48px 36px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #00ff66, #008033)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#000', boxShadow: '0 8px 25px rgba(0, 255, 102, 0.3)' }}>
          <Lock size={32} />
        </div>

        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px', color: '#fff' }}>Shared Tablet Station</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '28px' }}>
          Enter your 4-digit waitstaff PIN code to unlock assigned accounts and submit table orders.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
          {[0, 1, 2, 3].map((idx) => (
            <div 
              key={idx} 
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '999px',
                border: '2px solid rgba(255,255,255,0.2)',
                backgroundColor: idx < pin.length ? '#00b368' : 'transparent',
                boxShadow: idx < pin.length ? '0 0 12px rgba(0, 179, 104, 0.8)' : 'none',
                transition: 'all 0.15s'
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{ color: '#ff4d4d', fontSize: '0.9rem', fontWeight: 700, marginBottom: '20px', backgroundColor: 'rgba(255, 77, 77, 0.1)', padding: '8px', borderRadius: '8px' }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '320px', margin: '0 auto 32px' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handlePress(num)}
              style={{
                height: '70px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-glass)',
                color: '#fff',
                fontSize: '1.6rem',
                fontWeight: 800,
                fontFamily: 'Outfit',
                cursor: 'pointer',
                transition: '0.1s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {num}
            </button>
          ))}
          <button onClick={() => setPin('')} style={{ height: '70px', borderRadius: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}>
            Clear
          </button>
          <button onClick={() => handlePress('0')} style={{ height: '70px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Outfit', cursor: 'pointer' }}>
            0
          </button>
          <button onClick={handleDelete} style={{ height: '70px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Delete size={24} color="var(--text-muted)" />
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="#00ff66" /> PINs are validated on this device in offline mode.
        </div>

      </div>
    </div>
  );
};
