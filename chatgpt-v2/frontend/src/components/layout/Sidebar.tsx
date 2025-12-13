import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const linkStyle = (path: string) => ({
    display: 'block',
    padding: '8px 12px',
    textDecoration: 'none',
    color: location.pathname.startsWith(path) ? '#fff' : '#ddd',
    background: location.pathname.startsWith(path) ? '#333' : 'transparent'
  });

  return (
    <aside
      style={{
        width: '220px',
        background: '#222',
        color: '#eee',
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>AI Console</h2>
      <nav>
        <Link to="/" style={linkStyle('/')}>
          Dashboard
        </Link>
        <Link to="/projects" style={linkStyle('/projects')}>
          Projects
        </Link>
        {user && (user.role === 'admin' || user.role === 'superadmin') && (
          <>
            <div style={{ marginTop: '16px', fontSize: '12px', opacity: 0.7 }}>Admin</div>
            <Link to="/admin/providers" style={linkStyle('/admin/providers')}>
              Providers
            </Link>
            <Link to="/admin/models" style={linkStyle('/admin/models')}>
              Models
            </Link>
            <Link to="/admin/keys" style={linkStyle('/admin/keys')}>
              Keys
            </Link>
          </>
        )}
        {user && user.role === 'superadmin' && (
          <Link to="/admin/users" style={linkStyle('/admin/users')}>
            Users
          </Link>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
