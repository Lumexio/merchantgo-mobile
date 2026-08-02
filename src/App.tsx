import { useEffect, useState } from 'react';
import { PinKeypad } from './components/PinKeypad';
import { OrderBuilderScreen } from './screens/OrderBuilderScreen';
import './index.css';
import type { MerchantSession } from './api/cloudClient';
import { loginMerchantGoAccount } from './api/cloudClient';
import { createLocalAdmin, hasLocalRegister } from './localPos';
import type { LocalMode } from './localPos';

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(() => !hasLocalRegister());
  const [isSettingUpOffline, setIsSettingUpOffline] = useState(false);
  const [localAdminName, setLocalAdminName] = useState('');
  const [localAdminPin, setLocalAdminPin] = useState('');
  const [localMode, setLocalMode] = useState<LocalMode>('SOLO_FOOD_TRUCK');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [session, setSession] = useState<MerchantSession | null>(null);

  const handleLockStation = () => {
    setSession(null);
  };

  useEffect(() => {
    if (!session) return;
    let timer = window.setTimeout(handleLockStation, 5 * 60 * 1000);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(handleLockStation, 5 * 60 * 1000);
    };
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, reset));
    return () => {
      window.clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, reset));
    };
  }, [session]);

  if (isFirstLaunch) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0c10', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(24, 25, 33, 0.75)', padding: '40px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--primary-pos, #ff6b00)' }}>MerchantGo</h1>
          <p style={{ color: '#9496a3', marginBottom: '32px' }}>Mobile Express Register</p>
          
          {!isSettingUpOffline ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {authError && <p style={{ color: '#ff8585' }}>{authError}</p>}
              <input type="email" placeholder="Owner email" value={email} onChange={event => setEmail(event.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <input type="password" placeholder="Password" value={password} onChange={event => setPassword(event.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: 'none', background: '#00ff66', color: '#000', fontWeight: 600 }} onClick={async () => {
                try {
                  setAuthError('');
                  setSession(await loginMerchantGoAccount(email, password));
                  setIsFirstLaunch(false);
                } catch (error) {
                  setAuthError(error instanceof Error ? error.message : 'Sign in failed');
                }
              }}>
                Sign In & Sync Catalog
              </button>
              <button style={{ padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} onClick={() => setIsFirstLaunch(false)}>
                Use Shared Station PIN
              </button>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--primary-pos, #ff6b00)', color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => setIsSettingUpOffline(true)}>
                Continue Offline (Local Database)
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Create Local Admin</h2>
              <input type="text" placeholder="Admin Name (e.g. Marco)" value={localAdminName} onChange={e => setLocalAdminName(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <select value={localMode} onChange={event => setLocalMode(event.target.value as LocalMode)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#14171e', color: '#fff' }}>
                <option value="SOLO_FOOD_TRUCK">Solo Food Truck</option>
                <option value="MULTI_STATION_BAR">Multi-station Restaurant / Bar</option>
              </select>
              <input type="password" inputMode="numeric" placeholder="4 digit staff PIN" value={localAdminPin} onChange={event => setLocalAdminPin(event.target.value.replace(/\D/g, '').slice(0, 4))} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: 'none', background: '#00ff66', color: '#000', fontWeight: 600, marginTop: '8px', cursor: 'pointer' }} onClick={async () => {
                try {
                  setAuthError('');
                  setSession(await createLocalAdmin(localAdminName, localAdminPin, localMode));
                  setIsFirstLaunch(false);
                } catch (error) {
                  setAuthError(error instanceof Error ? error.message : 'Local setup failed');
                }
              }}>
                Initialize Local Register
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0c10', color: '#fff' }}>
      {!session ? (
        <PinKeypad onAuthenticate={setSession} />
      ) : (
        <OrderBuilderScreen session={session} onLock={handleLockStation} />
      )}
    </div>
  );
}
