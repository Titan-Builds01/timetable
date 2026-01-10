'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { User } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { User as UserIcon } from 'lucide-react';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error: any) {
      // Silently handle 401 errors (expected for unauthenticated users)
      // Only log other errors
      if (error.response?.status !== 401) {
        console.error('Failed to fetch user:', error);
      }
    }
  };

  const getRoleVariant = (role?: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'error';
      case 'COORDINATOR':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Dashboard
          </h2>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </span>
              </div>
            </div>
            <Badge variant={getRoleVariant(user.role)} size="sm">
              {user.role}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

