'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { CourseOffering, Session } from '../../../shared/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { Upload, Eye, BookOpen } from 'lucide-react';

function CoursesContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseOffering | null>(null);
  const [matchStatusFilter, setMatchStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchCourses(sessionId);
    }
  }, [sessionId, matchStatusFilter]);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/sessions');
      setSessions(response.data.data || []);
      if (!sessionId && response.data.data?.length > 0) {
        const activeSession = response.data.data.find((s: Session) => s.is_active);
        if (activeSession) {
          window.location.href = `/courses?session_id=${activeSession.id}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchCourses = async (sid: string) => {
    try {
      setLoading(true);
      let url = `/course-offerings?session_id=${sid}`;
      if (matchStatusFilter) {
        url += `&match_status=${matchStatusFilter}`;
      }
      const response = await apiClient.get(url);
      setCourses(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sessionId) return;

    const formData = new FormData(e.currentTarget);
    formData.append('session_id', sessionId);

    try {
      const response = await apiClient.post('/course-offerings/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert(`Successfully imported ${response.data.data.count} courses`);
      setShowImportModal(false);
      fetchCourses(sessionId);
    } catch (error: any) {
      console.error('Failed to import courses:', error);
      alert(error.response?.data?.error || 'Failed to import courses');
    }
  };

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'auto_matched':
        return 'success';
      case 'needs_review':
        return 'warning';
      case 'manual_matched':
        return 'info';
      case 'unresolved':
        return 'default';
      default:
        return 'default';
    }
  };

  const columns: Column<CourseOffering>[] = [
    {
      key: 'course_code',
      label: 'Code',
      sortable: true,
    },
    {
      key: 'original_title',
      label: 'Title',
      sortable: true,
    },
    {
      key: 'level',
      label: 'Level',
      sortable: true,
    },
    {
      key: 'credit_units',
      label: 'Units',
      sortable: true,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
    },
    {
      key: 'match_status',
      label: 'Match Status',
      sortable: true,
      render: (value) => (
        <Badge variant={getStatusVariant(value)}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCourse(row);
            setShowModal(true);
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  if (!sessionId) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Course Offerings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Please select a session to view course offerings.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Course Offerings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and import course offerings for the selected session
          </p>
        </div>
        <Button onClick={() => setShowImportModal(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import Courses
        </Button>
      </div>

      <div className="mb-4">
        <Select
          label="Filter by Match Status"
          value={matchStatusFilter}
          onChange={(e) => setMatchStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'unresolved', label: 'Unresolved' },
            { value: 'auto_matched', label: 'Auto Matched' },
            { value: 'needs_review', label: 'Needs Review' },
            { value: 'manual_matched', label: 'Manual Matched' },
          ]}
        />
      </div>

      <DataTable
        data={courses}
        columns={columns}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No course offerings found. Import courses to get started."
      />

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Course Offerings"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="import-form">
              Import
            </Button>
          </div>
        }
      >
        <form id="import-form" onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              CSV/Excel File
            </label>
            <input
              type="file"
              name="file"
              accept=".csv,.xlsx,.xls"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Required columns: course_code, title, level, credit_units, type
            </p>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedCourse(null);
        }}
        title="Course Details"
        size="lg"
      >
        {selectedCourse && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Code</p>
                <p className="text-base text-gray-900 dark:text-gray-100">{selectedCourse.course_code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Level</p>
                <p className="text-base text-gray-900 dark:text-gray-100">{selectedCourse.level}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Title</p>
                <p className="text-base text-gray-900 dark:text-gray-100">{selectedCourse.original_title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Credit Units</p>
                <p className="text-base text-gray-900 dark:text-gray-100">{selectedCourse.credit_units}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
                <p className="text-base text-gray-900 dark:text-gray-100">{selectedCourse.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</p>
                <p className="text-base text-gray-900 dark:text-gray-100">{selectedCourse.department || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Match Status</p>
                <Badge variant={getStatusVariant(selectedCourse.match_status)}>
                  {selectedCourse.match_status}
                </Badge>
              </div>
              {selectedCourse.canonical_course_id && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Canonical Course ID</p>
                  <p className="text-base text-gray-900 dark:text-gray-100">{selectedCourse.canonical_course_id}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <CoursesContent />
      </Suspense>
    </DashboardWrapper>
  );
}
