'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Lecturer, Session } from '@/lib/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Upload, Eye, Users } from 'lucide-react';
import Link from 'next/link';

function LecturersContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchLecturers(sessionId);
    }
  }, [sessionId]);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/sessions');
      setSessions(response.data.data || []);
      if (!sessionId && response.data.data?.length > 0) {
        const activeSession = response.data.data.find((s: Session) => s.is_active);
        if (activeSession) {
          window.location.href = `/lecturers?session_id=${activeSession.id}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchLecturers = async (sid: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/lecturers?session_id=${sid}`);
      setLecturers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch lecturers:', error);
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
      const response = await apiClient.post('/lecturers/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert(`Successfully imported ${response.data.data.count} lecturers`);
      setShowImportModal(false);
      fetchLecturers(sessionId);
    } catch (error: any) {
      console.error('Failed to import lecturers:', error);
      alert(error.response?.data?.error || 'Failed to import lecturers');
    }
  };

  const columns: Column<Lecturer>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (value) => value || '-',
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (value) => value || '-',
    },
    {
      key: 'assigned_offerings_count',
      label: 'Assigned Offerings',
      sortable: true,
      render: (value) => value || 0,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Link href={`/lecturers/${row.id}?session_id=${sessionId}`}>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </Link>
      ),
    },
  ];

  if (!sessionId) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Lecturers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Please select a session to view lecturers.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Lecturers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage lecturers and their course assignments
          </p>
        </div>
        <Button onClick={() => setShowImportModal(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import Lecturers
        </Button>
      </div>

      <DataTable
        data={lecturers}
        columns={columns}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No lecturers found. Import lecturers to get started."
      />

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Lecturers"
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
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Required columns: name</p>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function LecturersPage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <LecturersContent />
      </Suspense>
    </DashboardWrapper>
  );
}
