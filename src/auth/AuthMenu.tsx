import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from './AuthProvider';
import { LoginForm } from './LoginForm';
import { Shield, LogOut, LogIn, User } from 'lucide-react';

export function AuthMenu({ className }: { className?: string }) {
  const { mode, user, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const label = useMemo(() => {
    if (mode === 'authenticated' && user) return user.userId;
    return 'Sign in';
  }, [mode, user]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const onMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn('gap-2', mode === 'authenticated' ? 'text-foreground' : 'text-muted-foreground')}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={mode === 'authenticated' ? 'Account' : 'Sign in'}
      >
        <Shield className="h-4 w-4" />
        <span className="hidden sm:inline max-w-[180px] truncate">{label}</span>
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-[320px] max-w-[80vw] z-50">
          <Card className="border border-border shadow-lg bg-background/95 backdrop-blur">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">User access</div>
                  <div className="text-xs text-muted-foreground">
                    {mode === 'authenticated' && user ? 'Authenticated session' : 'Demo session'}
                  </div>
                </div>

                {mode === 'authenticated' && user ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-mono truncate max-w-[140px]">{user.userId}</span>
                  </div>
                ) : (
                  <div className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                    DEMO
                  </div>
                )}
              </div>

              {mode === 'authenticated' && user ? (
                <>
                  <div className="text-xs text-muted-foreground">
                    Signed in as <span className="font-mono text-foreground">{user.userId}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground">
                    Enter credentials to switch from demo to an authenticated session.
                  </div>
                  <LoginForm
                    onLogin={async (u, p) => {
                      await login(u, p);
                      setOpen(false);
                    }}
                  />
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <LogIn className="h-3.5 w-3.5" />
                    Polygons persist only for authenticated sessions.
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
