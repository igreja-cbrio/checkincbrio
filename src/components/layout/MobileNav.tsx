import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Home, QrCode, UserCheck, Calendar, BarChart3, Settings, LogOut, History, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
export function MobileNav() {
  const {
    isLeader,
    isAdmin,
    signOut
  } = useAuth();
  const location = useLocation();
  const navigation = [{
    name: 'Início',
    href: '/dashboard',
    icon: Home,
    show: true
  }, {
    name: 'QR Code',
    href: '/my-qrcode',
    icon: QrCode,
    show: true
  }, {
    name: 'Check-in',
    href: '/checkin',
    icon: UserCheck,
    show: isLeader
  }, {
    name: 'Histórico',
    href: '/history',
    icon: History,
    show: true
  }, {
    name: 'Relatórios',
    href: '/reports',
    icon: BarChart3,
    show: isLeader
  }, {
    name: 'Escalas',
    href: '/schedules',
    icon: Calendar,
    show: true
  }, {
    name: 'Crachás',
    href: '/qr-codes',
    icon: Users,
    show: isLeader
  }, {
    name: 'Admin',
    href: '/admin',
    icon: Settings,
    show: isAdmin
  }].filter(item => item.show);

  // Limit to 5 items for mobile nav
  const visibleNav = navigation.slice(0, 5);
  return <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {visibleNav.map(item => {
        const isActive = location.pathname === item.href;
        const Icon = item.icon;
        return <Link key={item.name} to={item.href} className={cn('flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-[60px]', isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">{item.name}</span>
            </Link>;
      })}
      </div>
    </nav>;
}
export function MobileHeader() {
  const {
    profile,
    signOut
  } = useAuth();
  return <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-xl text-center font-extrabold">Check-in CBRio </span>
        </Link>
        
        <div className="flex items-center gap-2">
          <Link to="/profile">
            <Button variant="ghost" size="sm" className="gap-2">
              <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                {profile?.full_name?.split(' ')[0]}
              </span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>;
}