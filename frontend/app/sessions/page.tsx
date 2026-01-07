'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Session } from '@/lib/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { Plus, Edit, CheckCircle } from 'lucide-react';

function SessionsContent() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    starts_at: '',
    ends_at: '',
    is_active: false,
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/sessions');
      setSessions(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSession) {
        await apiClient.patch(`/sessions/${editingSession.id}`, formData);
      } else {
        await apiClient.post('/sessions', formData);
      }
      setShowModal(false);
      setEditingSession(null);
      setFormData({ name: '', starts_at: '', ends_at: '', is_active: false });
      fetchSessions();
    } catch (error: any) {
      console.error('Failed to save session:', error);
      if (error.response?.status === 401) {
        alert('Please sign in to create or edit sessions');
      } else {
        alert(error.response?.data?.error || 'Failed to save session');
      }
    }
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setFormData({
      name: session.name,
      starts_at: session.starts_at || '',
      ends_at: session.ends_at || '',
      is_active: session.is_active,
    });
    setShowModal(true);
  };

  const handleSetActive = async (id: string) => {
    try {
      await apiClient.post(`/sessions/${id}/set-active`);
      fetchSessions();
    } catch (error: any) {
      console.error('Failed to set active session:', error);
      if (error.response?.status === 401) {
        alert('Please sign in to set active session');
      } else {
        alert(error.response?.data?.error || 'Failed to set active session');
      }
    }
  };

  const columns: Column<Session>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
    },
    {
      key: 'starts_at',
      label: 'Start Date',
      sortable: true,
      render: (value) => value || '-',
    },
    {
      key: 'ends_at',
      label: 'End Date',
      sortable: true,
      render: (value) => value || '-',
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={value ? 'success' : 'default'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {!row.is_active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSetActive(row.id);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Set Active
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Sessions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage academic sessions and set the active session
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingSession(null);
            setFormData({ name: '', starts_at: '', ends_at: '', is_active: false });
            setShowModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Session
        </Button>
      </div>

      <DataTable
        data={sessions}
        columns={columns}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No sessions found. Create your first session to get started."
      />

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSession(null);
        }}
        title={editingSession ? 'Edit Session' : 'Create Session'}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingSession(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="session-form">
              Save
            </Button>
          </div>
        }
      >
        <form id="session-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Fall 2024"
          />
          <Input
            label="Start Date"
            type="date"
            value={formData.starts_at}
            onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
          />
          <Input
            label="End Date"
            type="date"
            value={formData.ends_at}
            onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
          />
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function SessionsPage() {
  return (
    <DashboardWrapper>
      <SessionsContent />
    </DashboardWrapper>
  );
}

