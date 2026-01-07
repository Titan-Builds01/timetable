'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Calendar, BookOpen, Users, Building2, Sparkles, Clock, Settings, Link as LinkIcon } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (isAuthenticated()) {
    router.push('/sessions');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-600 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Timetable Allocator
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/sessions">
                <Button variant="ghost">Browse Timetables</Button>
              </Link>
              <Link href="/login">
                <Button variant="primary">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Intelligent Timetable Allocation
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
            Automatically generate optimal course schedules with intelligent matching,
            constraint handling, and conflict resolution.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/sessions">
              <Button size="lg">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Course Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Import and manage course offerings with intelligent matching to canonical courses
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Lecturer Assignment
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage lecturer availability and course assignments with conflict detection
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Room Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track room availability, capacity, and type requirements for optimal allocation
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Smart Scheduling
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI-powered scheduling engine that respects all constraints and optimizes for quality
            </p>
          </Card>
        </div>

        {/* How It Works */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-teal-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Import Data
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Upload course offerings, lecturers, and rooms via CSV or Excel files
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-teal-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Configure Constraints
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Set up time slots, blocked times, and scheduling preferences
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-teal-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Generate Timetable
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Let the system create an optimal schedule automatically
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Timetable Allocator
              </span>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex gap-6">
                <Link href="/sessions" className="hover:text-teal-600 dark:hover:text-teal-400">
                  Browse
                </Link>
                <Link href="/login" className="hover:text-teal-600 dark:hover:text-teal-400">
                  Sign In
                </Link>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                © {year} Sulva Solutions. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
