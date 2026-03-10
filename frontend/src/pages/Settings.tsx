import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Monitor, Sun, Moon, LogOut } from 'lucide-react';

const themeOptions = [
  { value: 'system' as const, label: 'System', icon: Monitor },
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Settings</h1>

      {/* Theme */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Appearance
        </h2>
        <div className="flex gap-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-1 flex-col items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                theme === opt.value
                  ? 'border-brand-500 bg-brand-600/10 text-brand-600 dark:text-brand-400'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              <opt.icon className="h-5 w-5" />
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Account */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Account
        </h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-[var(--color-text-secondary)]">Email</p>
            <p className="text-sm font-medium text-[var(--color-text)]">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-secondary)]">Username</p>
            <p className="text-sm font-medium text-[var(--color-text)]">{user?.username}</p>
          </div>
        </div>
      </Card>

      {/* Logout */}
      <Button variant="danger" onClick={logout} className="w-full sm:w-auto">
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </Button>
    </div>
  );
}
