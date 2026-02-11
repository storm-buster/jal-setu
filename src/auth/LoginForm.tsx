import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LoginForm({
  onLogin,
  disabled,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await onLogin(username.trim(), password);
      setPassword('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        className={cn(
          'w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none',
          'focus:ring-2 focus:ring-ring'
        )}
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={disabled || loading}
      />
      <input
        className={cn(
          'w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none',
          'focus:ring-2 focus:ring-ring'
        )}
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={disabled || loading}
      />
      {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}
      <Button className="w-full" onClick={submit} disabled={disabled || loading || !username.trim() || !password}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </div>
  );
}
