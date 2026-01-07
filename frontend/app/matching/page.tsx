'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { CourseOffering, Session, CanonicalCourse } from '../../../shared/types';
import DashboardWrapper from '@/components/layout/DashboardWrapper';

interface MatchingSuggestion {
  id: string;
  offering_id: string;
  canonical_course_id: string;
  score: number;
  token_overlap: string | null;
  method: string;
  created_at: string;
}

interface ReviewItem extends CourseOffering {
  suggestions: MatchingSuggestion[];
}

function MatchingContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [selectedOffering, setSelectedOffering] = useState<ReviewItem | null>(null);
  const [canonicals, setCanonicals] = useState<CanonicalCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCanonicalTitle, setNewCanonicalTitle] = useState('');
  const [newCanonicalDept, setNewCanonicalDept] = useState('');

  useEffect(() => {
    fetchSessions();
    fetchCanonicals();
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchReviewItems();
    }
  }, [sessionId]);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/sessions');
      setSessions(response.data.data || []);
      if (!sessionId && response.data.data?.length > 0) {
        const activeSession = response.data.data.find((s: Session) => s.is_active);
        if (activeSession) {
          window.location.href = `/matching?session_id=${activeSession.id}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchCanonicals = async () => {
    try {
      const response = await apiClient.get('/canonical-courses');
      setCanonicals(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch canonical courses:', error);
    }
  };

  const fetchReviewItems = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const response = await apiClient.get(`/matching/review-items?session_id=${sessionId}`);
      setReviewItems(response.data.data || []);
      if (response.data.data?.length > 0 && !selectedOffering) {
        setSelectedOffering(response.data.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch review items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMatching = async () => {
    if (!sessionId) return;
    try {
      const response = await apiClient.post('/matching/run', { session_id: sessionId });
      alert(response.data.message);
      fetchReviewItems();
    } catch (error: any) {
      console.error('Failed to run matching:', error);
      alert(error.response?.data?.error || 'Failed to run matching');
    }
  };

  const handleApprove = async (canonicalId: string, score?: number) => {
    if (!selectedOffering) return;

    try {
      await apiClient.post('/matching/approve', {
        offering_id: selectedOffering.id,
        canonical_course_id: canonicalId,
        method: 'manual_review',
        score: score || selectedOffering.suggestions[0]?.score || null,
      });

      alert('Offering matched successfully!');
      fetchReviewItems();
      setSelectedOffering(null);
    } catch (error: any) {
      console.error('Failed to approve matching:', error);
      alert(error.response?.data?.error || 'Failed to approve matching');
    }
  };

  const handleCreateCanonical = async () => {
    if (!newCanonicalTitle.trim()) {
      alert('Canonical title is required');
      return;
    }

    try {
      const response = await apiClient.post('/canonical-courses', {
        canonical_title: newCanonicalTitle,
        department: newCanonicalDept || null,
      });

      await fetchCanonicals();

      // Auto-approve with new canonical
      if (selectedOffering) {
        await handleApprove(response.data.data.id);
      }

      setShowCreateModal(false);
      setNewCanonicalTitle('');
      setNewCanonicalDept('');
    } catch (error: any) {
      console.error('Failed to create canonical course:', error);
      alert(error.response?.data?.error || 'Failed to create canonical course');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.92) return 'text-green-600';
    if (score >= 0.80) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!sessionId) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Matching Review</h1>
        <p>Please select a session to review matches.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Matching Review</h1>
        <button
          onClick={handleRunMatching}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Run Matching
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-2 gap-6" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Left Pane: Queue */}
          <div className="border border-gray-200 rounded p-4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Review Queue ({reviewItems.length})</h2>
            {reviewItems.length === 0 ? (
              <p className="text-gray-500">No items needing review</p>
            ) : (
              <div className="space-y-2">
                {reviewItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedOffering(item)}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                      selectedOffering?.id === item.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className="font-medium">{item.course_code}</div>
                    <div className="text-sm text-gray-600">{item.original_title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.suggestions.length} suggestion(s)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Pane: Suggestions */}
          <div className="border border-gray-200 rounded p-4 overflow-y-auto">
            {selectedOffering ? (
              <div>
                <h2 className="text-xl font-bold mb-4">Suggestions</h2>
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <div className="font-medium">{selectedOffering.course_code}</div>
                  <div className="text-sm text-gray-600">{selectedOffering.original_title}</div>
                  <div className="text-xs text-gray-500 mt-1">Level: {selectedOffering.level}</div>
                </div>

                {selectedOffering.suggestions.length > 0 ? (
                  <div className="space-y-3">
                    {selectedOffering.suggestions.map((suggestion, index) => {
                      const canonical = canonicals.find((c) => c.id === suggestion.canonical_course_id);
                      return (
                        <div
                          key={suggestion.id}
                          className="p-4 border rounded hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-medium">
                                {canonical?.canonical_title || 'Unknown'}
                              </div>
                              {canonical?.department && (
                                <div className="text-sm text-gray-600">{canonical.department}</div>
                              )}
                            </div>
                            <div className={`font-bold ${getScoreColor(suggestion.score)}`}>
                              {(suggestion.score * 100).toFixed(1)}%
                            </div>
                          </div>
                          {suggestion.token_overlap && (
                            <div className="text-xs text-gray-500 mb-2">
                              Token overlap: {suggestion.token_overlap}
                            </div>
                          )}
                          <button
                            onClick={() => handleApprove(suggestion.canonical_course_id, suggestion.score)}
                            className="w-full bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Approve Match
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500">No suggestions available</p>
                )}

                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Create New Canonical Course
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Select an offering from the queue to view suggestions</div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create Canonical Course</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Canonical Title</label>
              <input
                type="text"
                value={newCanonicalTitle}
                onChange={(e) => setNewCanonicalTitle(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Enter canonical course title"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Department (optional)</label>
              <input
                type="text"
                value={newCanonicalDept}
                onChange={(e) => setNewCanonicalDept(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Enter department"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCanonicalTitle('');
                  setNewCanonicalDept('');
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCanonical}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatchingPage() {
  return (
    <DashboardWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <MatchingContent />
      </Suspense>
    </DashboardWrapper>
  );
}

