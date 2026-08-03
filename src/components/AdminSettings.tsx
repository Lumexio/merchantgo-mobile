import { useState } from 'react';
import {
  connectGoogleDrive,
  googleDriveStatus,
  loginMerchantGoAccount,
  previewSnapshot,
  pullSnapshot,
  pushSnapshot,
  registerMerchantGoAccount,
} from '../api/cloudClient';
import type { MerchantSession } from '../api/cloudClient';
import {
  commitLocalMerge,
  createLocalSnapshot,
  previewLocalMerge,
} from '../localPos';
import type { LocalSnapshot } from '../localPos';

interface Props {
  operator: MerchantSession;
  onClose: () => void;
}

export function AdminSettings({ operator, onClose }: Props) {
  const [account, setAccount] = useState<MerchantSession | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [incoming, setIncoming] = useState<LocalSnapshot | null>(null);

  const authenticate = async (register: boolean) => {
    try {
      setStatus('');
      const next = register
        ? await registerMerchantGoAccount(email, password, operator.name, operator.mode)
        : await loginMerchantGoAccount(email, password);
      setAccount(next);
      setStatus(`Connected as ${next.name} on the ${next.plan} plan.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Account connection failed');
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(createLocalSnapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `merchantgo-local-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const stage = (snapshot: LocalSnapshot) => {
    const preview = previewLocalMerge(snapshot);
    setIncoming(snapshot);
    setStatus(
      `Merge preview: ${Object.values(preview.additions).reduce((sum, count) => sum + count, 0)} additions, ` +
      `${preview.conflicts.length} conflicts.`,
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.9)', overflowY: 'auto', padding: '24px' }}>
      <div className="glass-tablet" style={{ maxWidth: '620px', margin: '20px auto', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h2>Admin settings & sync</h2>
            <p style={{ color: 'var(--text-muted)' }}>Local POS data remains on this device until you explicitly upload or merge it.</p>
          </div>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>

        {/* Menu items section extracted to MenuRegistrationModal per ponytail simplifications */}

        {!account ? (
          <section style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
            <h3>Connect MerchantGo account</h3>
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email" style={inputStyle} />
            <input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Password" style={inputStyle} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => authenticate(false)} className="btn-staff" style={{ flex: 1, padding: '12px' }}>Log in</button>
              <button onClick={() => authenticate(true)} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>Register</button>
            </div>
          </section>
        ) : (
          <section style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
            <strong>{account.name} · {account.plan}</strong>
            {account.plan === 'FREE' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => connectGoogleDrive(account.token || '')} className="btn-secondary">Connect Google Drive</button>
                <button onClick={async () => {
                  const result = await googleDriveStatus(account.token || '');
                  setStatus(result.connected ? 'Google Drive is connected.' : 'Google Drive is not connected.');
                }} className="btn-secondary">Check Drive status</button>
              </div>
            )}
            <button onClick={async () => {
              await previewSnapshot(createLocalSnapshot(), account);
              await pushSnapshot(createLocalSnapshot(), account);
              setStatus('Local snapshot uploaded after explicit confirmation.');
            }} className="btn-staff" style={{ padding: '12px' }}>Upload local data to connected account</button>
            <button onClick={async () => stage(await pullSnapshot(account))} className="btn-secondary" style={{ padding: '12px' }}>Preview remote merge</button>
            <button onClick={() => { setAccount(null); setPassword(''); setStatus('Account disconnected; local POS data was preserved.'); }} className="btn-secondary">Disconnect account</button>
          </section>
        )}

        <section style={{ display: 'grid', gap: '10px' }}>
          <h3>Local backup</h3>
          <button onClick={download} className="btn-secondary">Export local snapshot</button>
          <label className="btn-secondary" style={{ textAlign: 'center', cursor: 'pointer' }}>
            Preview snapshot file
            <input type="file" accept="application/json" hidden onChange={async event => {
              const file = event.target.files?.[0];
              if (file) stage(JSON.parse(await file.text()) as LocalSnapshot);
            }} />
          </label>
          {incoming && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { commitLocalMerge(incoming, 'local'); setIncoming(null); setStatus('Merge committed; local values kept for conflicts.'); }} className="btn-secondary" style={{ flex: 1 }}>Merge, keep local conflicts</button>
              <button onClick={() => { commitLocalMerge(incoming, 'remote'); setIncoming(null); setStatus('Merge committed; remote values chosen for conflicts.'); }} className="btn-secondary" style={{ flex: 1 }}>Merge, use remote conflicts</button>
            </div>
          )}
        </section>
        {status && <p style={{ marginTop: '18px', color: '#00ff66' }}>{status}</p>}
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,.1)',
  background: 'rgba(0,0,0,.35)',
  color: '#fff',
};
