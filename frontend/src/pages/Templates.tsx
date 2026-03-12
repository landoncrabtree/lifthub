import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pencil, Trash2, FileText } from 'lucide-react';
import { post, del } from '@/api/client';
import { useFetch } from '@/hooks/useFetch';
import type { Template, Workout } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionNav } from '@/components/ui/SectionNav';
import { Modal } from '@/components/ui/Modal';
import { workoutNavItems } from '@/lib/navigation';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Templates() {
  const navigate = useNavigate();
  const { data: templates, loading, error, refetch } = useFetch<Template[]>('/templates');
  const [startingId, setStartingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleStartWorkout(templateId: number) {
    setStartingId(templateId);
    try {
      const workout = await post<Workout>(`/templates/${templateId}/start`, {});
      navigate(`/workout/${workout.id}`);
    } catch {
      setStartingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await del(`/templates/${deleteTarget.id}`);
      setDeleteTarget(null);
      refetch();
    } catch {
      // error handled by useFetch
    } finally {
      setDeleting(false);
    }
  }

  if (loading && !templates) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Templates</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Templates</h1>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionNav items={workoutNavItems} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Templates</h1>
        <Button onClick={() => navigate('/templates/new')} leftIcon={<Plus className="h-4 w-4" />}>
          New Template
        </Button>
      </div>

      {templates && templates.length === 0 && (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No templates yet"
          description="Create a template to get started with your workouts"
        />
      )}

      {templates && templates.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-[var(--color-text)]">{t.name}</h3>
                  {t.description && (
                    <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                    <span>{t.json_data.length} exercise{t.json_data.length !== 1 ? 's' : ''}</span>
                    <span>Updated {formatDate(t.updated_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStartWorkout(t.id)}
                    loading={startingId === t.id}
                    className="flex-1"
                    leftIcon={<Play className="h-3.5 w-3.5" />}
                  >
                    Start Workout
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/templates/${t.id}`)}
                    leftIcon={<Pencil className="h-3.5 w-3.5" />}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(t)}
                    className="text-red-500 hover:bg-red-500/10 border-red-500/30"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Template"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button loading={deleting} onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-text-secondary)]">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
