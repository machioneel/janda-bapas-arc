import { useAuth } from '@/hooks/useAuth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export function AppTopbar() {
  const { employee, logout } = useAuth();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <span className="text-sm font-semibold text-foreground hidden sm:inline">JANDA BAPAS</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">{employee?.name || 'Pengguna'}</span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded">{employee?.role || ''}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} title="Keluar">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
