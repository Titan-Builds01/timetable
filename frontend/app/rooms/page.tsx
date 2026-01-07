'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Room, Session } from '@/lib/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Upload, Eye, Building2 } from 'lucide-react';
import Link from 'next/link';

function RoomsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('');

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchRooms(sessionId);
    }
  }, [sessionId, roomTypeFilter]);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/sessions');
      setSessions(response.data.data || []);
      if (!sessionId && response.data.data?.length > 0) {
        const activeSession = response.data.data.find((s: Session) => s.is_active);
        if (activeSession) {
          window.location.href = `/rooms?session_id=${activeSession.id}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchRooms = async (sid: string) => {
    try {
      setLoading(true);
      let url = `/rooms?session_id=${sid}`;
      if (roomTypeFilter) {
        url += `&room_type=${roomTypeFilter}`;
      }
      const response = await apiClient.get(url);
      setRooms(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
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
      const response = await apiClient.post('/rooms/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert(`Successfully imported ${response.data.data.count} rooms`);
      setShowImportModal(false);
      fetchRooms(sessionId);
    } catch (error: any) {
      console.error('Failed to import rooms:', error);
      alert(error.response?.data?.error || 'Failed to import rooms');
    }
  };

  const columns: Column<Room>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
    },
    {
      key: 'room_type',
      label: 'Type',
      sortable: true,
    },
    {
      key: 'capacity',
      label: 'Capacity',
      sortable: true,
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      render: (value) => value || '-',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Link href={`/rooms/${row.id}?session_id=${sessionId}`}>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Rooms</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Please select a session to view rooms.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Rooms</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage rooms and their availability
          </p>
        </div>
        <Button onClick={() => setShowImportModal(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import Rooms
        </Button>
      </div>

      <div className="mb-4">
        <Select
          label="Filter by Room Type"
          value={roomTypeFilter}
          onChange={(e) => setRoomTypeFilter(e.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'lecture_room', label: 'Lecture Room' },
            { value: 'lab', label: 'Lab' },
            { value: 'ict_room', label: 'ICT Room' },
            { value: 'hall', label: 'Hall' },
          ]}
        />
      </div>

      <DataTable
        data={rooms}
        columns={columns}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No rooms found. Import rooms to get started."
      />

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Rooms"
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
              Required columns: name, room_type, capacity
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function RoomsPage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <RoomsContent />
      </Suspense>
    </DashboardWrapper>
  );
}
