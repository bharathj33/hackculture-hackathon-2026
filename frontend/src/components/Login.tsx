import { useState } from 'react';
import { login, UnauthorizedError } from '../api';

/** JWT login gate for public hosting. Content-not-creator: accounts gate
 *  access to the tool, they never attach identity to verdicts. */
export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = username.trim() !== '' && password !== '' && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
      onSuccess();
    } catch (err) {
      setError(err instanceof UnauthorizedError ? 'Invalid credentials' : 'Could not reach server');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) void submit();
  };

  return (
    <div className="card center login">
      <h2>Sign in</h2>
      <p className="muted">Zero to One Generative Media Hackathon · Team AIPlayers</p>
      <input
        type="text"
        placeholder="Username"
        autoComplete="username"
        value={username}
        autoFocus
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <input
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button className="btn btn-primary" disabled={!canSubmit} onClick={() => void submit()}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
