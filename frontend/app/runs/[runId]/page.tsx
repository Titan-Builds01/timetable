'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ScheduleRun, UnscheduledEvent } from '../../../../../shared/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';

function RunDetailsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const runId = params.runId as string;
  const sessionId = searchParams.get('session_id');

  const [run, setRun] = useState<ScheduleRun | null>(null);
  const [unscheduled, setUnscheduled] = useState<UnscheduledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  useEffect(() => {
    if (runId) {
      fetchRun();
      fetchUnscheduled();
    }
  }, [runId]);

  const fetchRun = async () => {
    try {
      const response = await apiClient.get(`/runs/${runId}`);
      setRun(response.data.data);
    } catch (error) {
      console.error('Failed to fetch run:', error);
    }
  };

  const fetchUnscheduled = async () => {
    try {
      const response = await apiClient.get(`/runs/${runId}/unscheduled`);
      setUnscheduled(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch unscheduled:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      setExporting(format);
      const response = await apiClient.post(
        `/exports/${format}`,
        { run_id: runId },
        { responseType: 'blob' }
      );

      // Check if response is actually an error (JSON error in blob)
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || `Failed to export ${format}`);
      }

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timetable_${runId}_${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(`Failed to export ${format}:`, error);
      
      // Try to parse error if it's a blob
      if (error.response?.data) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          alert(errorData.error || `Failed to export ${format}`);
        } catch {
          alert(error.message || `Failed to export ${format}`);
        }
      } else {
        alert(error.message || `Failed to export ${format}`);
      }
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!run) {
    return <div className="container mx-auto p-6">Run not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Schedule Run Details</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/runs/${runId}/timetable?session_id=${sessionId}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            View Timetable
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting === 'pdf'}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting === 'csv'}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <div className="text-2xl font-bold text-green-600">{run.scheduled_count}</div>
          <div className="text-sm text-gray-600">Scheduled</div>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <div className="text-2xl font-bold text-red-600">{run.unscheduled_count}</div>
          <div className="text-sm text-gray-600">Unscheduled</div>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="text-2xl font-bold text-blue-600">{run.soft_score}</div>
          <div className="text-sm text-gray-600">Soft Score</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-600">
          <strong>Status:</strong> {run.status}
        </div>
        <div className="text-sm text-gray-600">
          <strong>Created:</strong> {new Date(run.created_at).toLocaleString()}
        </div>
        {run.seed && (
          <div className="text-sm text-gray-600">
            <strong>Seed:</strong> {run.seed}
          </div>
        )}
        {run.error_message && (
          <div className="text-sm text-red-600 mt-2">
            <strong>Error:</strong> {run.error_message}
          </div>
        )}
      </div>

      {unscheduled.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Unscheduled Events</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Event ID</th>
                  <th className="px-4 py-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {unscheduled.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-2">{item.event_id}</td>
                    <td className="px-4 py-2">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RunDetailsPage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <RunDetailsContent />
      </Suspense>
    </DashboardWrapper>
  );
}
