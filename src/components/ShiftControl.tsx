import { useState } from 'react';
import { Clock3, LogOut, UserCheck } from 'lucide-react';
import { addLocalStaff, closeLocalShift, getLocalMode, getLocalShift, startLocalShift } from '../localPos';
import type { LocalShift } from '../localPos';

interface ShiftControlProps {
  offline?: boolean;
  onLock: () => void;
  onShiftChange: (shift: LocalShift | null) => void;
}

export function ShiftControl({ offline, onLock, onShiftChange }: ShiftControlProps) {
  const [shift, setShift] = useState<LocalShift | null>(() => getLocalShift());
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!offline) return null;

  const start = async () => {
    try {
      const next = await startLocalShift(pin);
      setShift(next);
      onShiftChange(next);
      setPin('');
      setError('');
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start shift');
    }
  };

  const close = () => {
    try {
      const report = closeLocalShift();
      alert(`Z-report ${report.id}: ${report.orderCount} orders, $${report.grossRevenue.toFixed(2)} gross.`);
      setShift(null);
      onShiftChange(null);
      setOpen(false);
      onLock();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to close shift');
    }
  };

  const addCrew = async () => {
    const name = window.prompt('Crew member name');
    if (!name) return;
    const crewPin = window.prompt('Assign a unique 4 digit PIN');
    if (!crewPin) return;
    try {
      await addLocalStaff(name, crewPin);
      alert(`${name} can now unlock this register with their PIN.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to add crew member');
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary" style={{ padding: '10px 14px', color: shift ? '#00ff66' : '#ffb800' }}>
        {shift ? <UserCheck size={16} /> : <Clock3 size={16} />}
        {shift ? `Shift: ${shift.staffName}` : 'Start staff shift'}
      </button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,.85)', display: 'grid', placeItems: 'center', padding: '24px' }}>
          <div className="glass-tablet" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
            <h2 style={{ marginBottom: '8px' }}>{shift ? 'Active staff shift' : 'Start staff shift'}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              {shift ? `Started ${new Date(shift.openedAt).toLocaleString()}.` : 'Enter your local staff PIN.'}
            </p>
            {!shift && (
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
                onKeyDown={event => event.key === 'Enter' && start()}
                placeholder="Staff PIN"
                style={{ width: '100%', padding: '14px', borderRadius: '10px', background: 'rgba(0,0,0,.4)', border: '1px solid var(--border-glass)', color: '#fff', marginBottom: '12px' }}
              />
            )}
            {error && <p style={{ color: '#ff8585', marginBottom: '12px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setOpen(false); setError(''); }} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>Cancel</button>
              {shift ? (
                <button onClick={close} className="btn-secondary" style={{ flex: 2, padding: '12px', color: '#ff8585' }}>
                  <LogOut size={16} /> Generate Z-report & end shift
                </button>
              ) : (
                <button onClick={start} className="btn-staff" style={{ flex: 2, padding: '12px' }}>Start shift</button>
              )}
            </div>
            {getLocalMode() === 'MULTI_STATION_BAR' && (
              <button onClick={addCrew} className="btn-secondary" style={{ width: '100%', padding: '10px', marginTop: '10px' }}>
                Add local crew member
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
