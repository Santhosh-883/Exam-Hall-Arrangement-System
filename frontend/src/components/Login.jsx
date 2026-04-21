import React, { useState } from 'react';
import api from '../lib/api';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
  const res = await api.post('/api/admin/login', { username, password });
      if (res.data && res.data.success) {
        // store token and set axios default header
        const token = res.data.token;
        if (token) {
          localStorage.setItem('adminToken', token);
          localStorage.setItem('adminUser', res.data.username || username);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        onLogin(true);
      } else {
        alert('Login failed');
      }
    } catch (err) {
      alert('Login failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-hero">
      <div className="login-card">
        <h1>Exam Hall Arrangement</h1>
        <p className="lead">Admin Portal — sign in to continue</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <div className="login-foot">Only authorized admins can access this dashboard.</div>
      </div>
    </div>
  );
};

export default Login;
