'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isAuthenticated, removeAuthToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  BookOpen,
  Users,
  Building2,
  Clock,
  Ban,
  Link as LinkIcon,
  Settings,
  CalendarDays,
  Sparkles,
  LogOut,
} from 'lucide-react';
import Button from '@/components/ui/Button';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    removeAuthToken();
    router.push('/login');
  };

  // Show sidebar for both authenticated and unauthenticated users

  const navItems = [
    { href: '/sessions', label: 'Sessions', icon: Calendar },
    { href: '/courses', label: 'Courses', icon: BookOpen },
    { href: '/lecturers', label: 'Lecturers', icon: Users },
    { href: '/rooms', label: 'Rooms', icon: Building2 },
    { href: '/timeslots', label: 'Time Slots', icon: Clock },
    { href: '/blocked-times', label: 'Blocked Times', icon: Ban },
    { href: '/matching', label: 'Matching', icon: LinkIcon },
    { href: '/constraints', label: 'Constraints', icon: Settings },
    { href: '/events', label: 'Events', icon: CalendarDays },
    { href: '/generate', label: 'Generate', icon: Sparkles },
  ];

  return (
    <div className="w-60 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen flex flex-col">
      {/* Logo/Brand */}
      <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Timetable Allocator
        </h1>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-l-4 border-teal-600'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-teal-600 dark:text-teal-400' : ''}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Auth Section */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
        {isAuthenticated() ? (
          <Button
            variant="ghost"
            size="md"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        ) : (
          <Link href="/login" className="block">
            <Button
              variant="primary"
              size="md"
              className="w-full justify-start gap-3"
            >
              <span>Sign In</span>
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

