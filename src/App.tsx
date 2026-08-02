import { useState } from 'react';
import { PinKeypad } from './components/PinKeypad';
import { OrderBuilderScreen } from './screens/OrderBuilderScreen';
import './index.css';
import type { MerchantSession } from './api/cloudClient';
import { loginMerchantGoAccount } from './api/cloudClient';

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isSettingUpOffline, setIsSettingUpOffline] = useState(false);
  const [localAdminName, setLocalAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [session, setSession] = useState<MerchantSession | null>(null);

  const handleLockStation = () => {
    setSession(null);
  };

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
              <input type="password" placeholder="Secure Password" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <button style={{ padding: '14px', borderRadius: '8px', border: 'none', background: '#00ff66', color: '#000', fontWeight: 600, marginTop: '8px', cursor: 'pointer' }} onClick={() => {
                setIsFirstLaunch(false);
                setSession({
                  id: 'local-admin',
                  name: localAdminName || 'Local Admin',
                  role: 'ADMIN',
                  plan: 'FREE',
                  mode: 'SOLO_FOOD_TRUCK',
                  entitlements: { features: ['CREATE_ORDER', 'SETTLE_ORDER', 'VIEW_ANALYTICS', 'MANAGE_MENU', 'INDIVIDUAL_CASHOUT'], limits: { menuItems: 25, staff: 1, branches: 1 } },
                  offline: true,
                });
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
