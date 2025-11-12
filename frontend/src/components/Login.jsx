import { useState } from 'react';

const Login = ({ onLogin, isLoading }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim()) {
      setError('Enter your private username');
      return;
    }
    setError('');
    try {
      await onLogin(username.trim());
    } catch (err) {
      setError(err.message || 'Unable to log in');
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Meal Planning</h1>
        <p className="muted">Enter your private username to continue.</p>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Checking...' : 'Enter'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
};

export default Login;
