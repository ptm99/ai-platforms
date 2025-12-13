import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        display: 'flex',
        padding: '8px 16px',
        borderBottom: '1px solid #ddd',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div />
      <div>
        {user && (
          <>
            <span style={{ marginRight: '12px' }}>
              {user.display_name || user.email} ({user.role})
            </span>
            <button onClick={() => logout()}>Logout</button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
