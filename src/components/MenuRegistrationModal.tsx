import { useState } from 'react';
import { addLocalMenuItem, getLocalCatalog, removeLocalMenuItem } from '../localPos';
import type { LocalMenuItem } from '../localPos';

interface Props {
  onClose: () => void;
  onCatalogChange: (items: LocalMenuItem[]) => void;
}

export function MenuRegistrationModal({ onClose, onCatalogChange }: Props) {
  const [menuItems, setMenuItems] = useState(() => getLocalCatalog());
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [isIngredient, setIsIngredient] = useState(false);
  const [status, setStatus] = useState('');

  const updateMenu = (items: LocalMenuItem[]) => {
    setMenuItems(items);
    onCatalogChange(items);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.9)', overflowY: 'auto', padding: '24px' }}>
      <div className="glass-tablet" style={{ maxWidth: '620px', margin: '20px auto', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h2>Register New {isIngredient ? 'Ingredient' : 'Menu Item'}</h2>
            <p style={{ color: 'var(--text-muted)' }}>Manage your local catalog and stock ingredients.</p>
          </div>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>

        <section style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
            <button onClick={() => setIsIngredient(false)} className={!isIngredient ? 'btn-staff' : 'btn-secondary'} style={{ flex: 1, padding: '10px' }}>Menu Item</button>
            <button onClick={() => setIsIngredient(true)} className={isIngredient ? 'btn-staff' : 'btn-secondary'} style={{ flex: 1, padding: '10px' }}>Ingredient</button>
          </div>

          <input value={itemName} onChange={event => setItemName(event.target.value)} placeholder={`${isIngredient ? 'Ingredient' : 'Item'} name`} style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input value={itemCategory} onChange={event => setItemCategory(event.target.value)} placeholder="Category (e.g. Tacos)" style={inputStyle} />
            <input type="number" min="0" step="0.01" value={itemPrice} onChange={event => setItemPrice(event.target.value)} placeholder={isIngredient ? "Cost per unit (optional)" : "Price"} style={inputStyle} />
          </div>
          <button onClick={() => {
            try {
              // ponytail: Minimal implementation using type flag instead of complex relational joins.
              updateMenu(addLocalMenuItem(itemName, itemCategory, Number(itemPrice) || 0, isIngredient ? 'INGREDIENT' : 'ITEM'));
              setItemName('');
              setItemPrice('');
              setStatus(`${isIngredient ? 'Ingredient' : 'Menu item'} saved locally.`);
            } catch (error) {
              setStatus(error instanceof Error ? error.message : 'Could not save item');
            }
          }} className="btn-staff" style={{ padding: '12px' }}>Add {isIngredient ? 'Ingredient' : 'Item'}</button>
          {status && <p style={{ color: '#00ff66' }}>{status}</p>}

          <div style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '10px' }}>Current Local Catalog</h3>
            {menuItems.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px', background: 'rgba(255,255,255,.04)', borderRadius: '8px', marginBottom: '6px' }}>
                <span>{item.name} · {item.category} · ${item.price.toFixed(2)} {item.type === 'INGREDIENT' && <span style={{color: '#ffb800'}}>[INGREDIENT]</span>}</span>
                <button onClick={() => updateMenu(removeLocalMenuItem(item.id))} className="btn-secondary">Remove</button>
              </div>
            ))}
          </div>
        </section>
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
