import { useState } from 'react';
import { PinKeypad } from './components/PinKeypad';
import { OrderBuilderScreen } from './screens/OrderBuilderScreen';
import './index.css';

export default function App() {
  const [authenticatedStaff, setAuthenticatedStaff] = useState<string | null>(null);

  const handleAuthSuccess = (name: string, pin: string) => {
    setAuthenticatedStaff(`${name} (ID: ${pin})`);
  };

  const handleLockStation = () => {
    setAuthenticatedStaff(null);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0c10', color: '#fff' }}>
      {!authenticatedStaff ? (
        <PinKeypad onAuthenticate={handleAuthSuccess} />
      ) : (
        <OrderBuilderScreen staffName={authenticatedStaff} onLock={handleLockStation} />
      )}
    </div>
  );
}
