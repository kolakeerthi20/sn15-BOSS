'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, Edit2, Check, X, Plus, Clock, MessageSquare,
  Video, Image, TrendingUp, Loader2, Calendar, User, Flag, Layers,
  PlayCircle, ExternalLink, AlertCircle, ChevronDown,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { tasksApi } from '@/lib/api';
import {
  cn, statusConfig, priorityConfig, formatDate, formatRelative, getAvatarColor, getInitials, formatPercent,
} from '@/lib/utils';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────
// Video URL Parsing
// ─────────────────────────────────────────────────────────────
function parseVideoUrl(url: string): { type: 'youtube' | 'drive' | 'loom' | 'other'; embedUrl: string; thumbUrl?: string } {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
  if (ytMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
      thumbUrl: `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`,
    };
  }

  const loomMatch = url.match(/loom\.com\/share\/([A-Za-z0-9]+)/);
  if (loomMatch) {
    return { type: 'loom', embedUrl: `https://www.loom.com/embed/${loomMatch[1]}` };
  }

  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  if (driveMatch) {
    return {
      type: 'drive',
      embedUrl: url,
      thumbUrl: `https://drive.google.com/thumbnail?id=${driveMatch[1]}`,
    };
  }

  return { type: 'other', embedUrl: url };
}

// ─────────────────────────────────────────────────────────────
// Activity Comment Component
// ─────────────────────────────────────────────────────────────
function ActivityItem({ comment }: { comment: any }) {
  let parsed: any = null;
  let isJson = false;

  try {
    parsed = JSON.parse(comment.content);
    isJson = true;
  } catch {
    // plain text
  }

  const updateType = isJson ? (parsed.updateType || 'comment') : 'comment';
  const text = isJson ? parsed.text : comment.content;

  const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
    comment: { label: 'Comment', color: 'text-blue-700', bg: 'bg-blue-100' },
    progress_update: { label: 'Progress Update', color: 'text-green-700', bg: 'bg-green-100' },
    screenshot: { label: 'Screenshot', color: 'text-purple-700', bg: 'bg-purple-100' },
    video_update: { label: 'Video Update', color: 'text-orange-700', bg: 'bg-orange-100' },
  };

  const typeMeta = typeConfig[updateType] || typeConfig.comment;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5',
        getAvatarColor(comment.author_name),
      )}>
        {getInitials(comment.author_name)}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-sm font-medium text-foreground">{comment.author_name}</span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeMeta.bg, typeMeta.color)}>
            {typeMeta.label}
          </span>
          {isJson && parsed.progressPct !== undefined && (
            <span className="text-xs text-muted-foreground">
              → {parsed.progressPct}% progress
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{formatRelative(comment.created_at)}</span>
        </div>

        {/* Text */}
        {text && (
          <p className="text-sm text-foreground whitespace-pre-wrap mb-3 leading-relaxed">{text}</p>
        )}

        {/* Video */}
        {isJson && parsed.videoUrl && (() => {
          const info = parseVideoUrl(parsed.videoUrl);
          if (info.type === 'youtube' || info.type === 'loom') {
            return (
              <div className="rounded-xl overflow-hidden border border-border mb-3 bg-black aspect-video max-w-xl">
                <iframe
                  src={info.embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            );
          }
          if (info.type === 'drive') {
            return (
              <a href={parsed.videoUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted text-sm hover:bg-accent transition mb-3">
                <PlayCircle size={16} className="text-blue-600" />
                Open in Google Drive
                <ExternalLink size={12} className="text-muted-foreground" />
              </a>
            );
          }
          return (
            <a href={parsed.videoUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline mb-3">
              <ExternalLink size={14} />
              {parsed.videoUrl}
            </a>
          );
        })()}

        {/* Images */}
        {isJson && parsed.imageUrls && parsed.imageUrls.length > 0 && (
          <div className={cn(
            'grid gap-2 mb-3',
            parsed.imageUrls.length === 1 ? 'grid-cols-1' :
            parsed.imageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
          )}>
            {parsed.imageUrls.map((url: string, i: number) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`Screenshot ${i + 1}`}
                  className="rounded-lg border border-border object-cover w-full max-h-48 hover:opacity-90 transition"
                />
              </a>
            ))}
          </div>
        )}

        {/* Progress bar for progress updates */}
        {isJson && parsed.progressPct !== undefined && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 max-w-xs">
            <TrendingUp size={14} className="text-green-600" />
            <div className="flex-1">
              <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${parsed.progressPct}%` }} />
              </div>
            </div>
            <span className="text-xs font-semibold text-green-700">{parsed.progressPct}%</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Add Update Form
// ─────────────────────────────────────────────────────────────
function AddUpdateForm({ taskId, onSuccess }: { taskId: string; onSuccess: () => void }) {
  const [text, setText] = useState('');
  const [updateType, setUpdateType] = useState('comment');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [progressPct, setProgressPct] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => tasksApi.addUpdate(taskId, data),
    onSuccess: () => {
      setText(''); setVideoUrl(''); setImageUrls(['']); setProgressPct(0);
      setUpdateType('comment'); setExpanded(false);
      toast.success('Update posted!');
      onSuccess();
    },
    onError: () => toast.error('Failed to post update'),
  });

  const handleSubmit = () => {
    if (!text && !videoUrl && imageUrls.every(u => !u)) {
      toast.error('Please add some content');
      return;
    }
    const validImages = imageUrls.filter(u => u.trim());
    mutate({
      content: text,
      updateType,
      videoUrl: videoUrl || undefined,
      imageUrls: validImages.length > 0 ? validImages : undefined,
      progressPct: updateType === 'progress_update' ? progressPct : undefined,
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
          U
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); if (!expanded) setExpanded(true); }}
            onFocus={() => setExpanded(true)}
            placeholder="Write an update, progress note, or comment..."
            rows={expanded ? 3 : 1}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3">
                  {/* Update type */}
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: 'comment', label: 'Comment', icon: MessageSquare },
                      { key: 'progress_update', label: 'Progress Update', icon: TrendingUp },
                      { key: 'screenshot', label: 'Screenshot', icon: Image },
                      { key: 'video_update', label: 'Video Update', icon: Video },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setUpdateType(key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition',
                          updateType === key
                            ? 'bg-brand-50 border-brand-300 text-brand-700'
                            : 'border-border text-muted-foreground hover:bg-accent',
                        )}
                      >
                        <Icon size={12} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Progress slider */}
                  {updateType === 'progress_update' && (
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 flex items-center justify-between">
                        Progress
                        <span className="text-brand-600 font-semibold">{progressPct}%</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={progressPct}
                        onChange={(e) => setProgressPct(Number(e.target.value))}
                        className="w-full accent-brand-500"
                      />
                    </div>
                  )}

                  {/* Video URL */}
                  {(updateType === 'video_update' || updateType === 'progress_update') && (
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">
                        Video URL (YouTube, Loom, Google Drive)
                      </label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  )}

                  {/* Image URLs */}
                  {(updateType === 'screenshot' || updateType === 'video_update') && (
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Image URLs</label>
                      <div className="space-y-2">
                        {imageUrls.map((url, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              type="url"
                              value={url}
                              onChange={(e) => {
                                const next = [...imageUrls];
                                next[i] = e.target.value;
                                setImageUrls(next);
                              }}
                              placeholder="https://..."
                              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                            {imageUrls.length > 1 && (
                              <button onClick={() => setImageUrls(imageUrls.filter((_, j) => j !== i))}
                                className="p-2 text-muted-foreground hover:text-red-500 transition">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        {imageUrls.length < 5 && (
                          <button onClick={() => setImageUrls([...imageUrls, ''])}
                            className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                            <Plus size={12} />
                            Add image URL
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => { setExpanded(false); setText(''); }}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isPending}
                      className="flex items-center gap-2 px-4 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition disabled:opacity-60"
                    >
                      {isPending && <Loader2 size={13} className="animate-spin" />}
                      Post Update
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [logHours, setLogHours] = useState('');
  const [logDesc, setLogDesc] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getDetail(id as string),
    enabled: !!id,
  });

  const task = data?.data;

  const { mutate: updateTask } = useMutation({
    mutationFn: (updates: any) => tasksApi.update(id as string, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast.success('Task updated');
    },
    onError: () => toast.error('Failed to update task'),
  });

  const { mutate: submitLogTime, isPending: loggingTime } = useMutation({
    mutationFn: (data: { hours: number; description?: string }) =>
      tasksApi.logTime(id as string, data),
    onSuccess: () => {
      setLogTimeOpen(false);
      setLogHours('');
      setLogDesc('');
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast.success('Time logged!');
    },
    onError: () => toast.error('Failed to log time'),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-6xl mx-auto space-y-4">
          <div className="h-8 skeleton rounded-xl w-64" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="h-12 skeleton rounded-xl" />
              <div className="h-32 skeleton rounded-xl" />
              <div className="h-64 skeleton rounded-xl" />
            </div>
            <div className="space-y-4">
              <div className="h-48 skeleton rounded-xl" />
              <div className="h-32 skeleton rounded-xl" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !task) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle size={40} className="text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Task not found</p>
          <button onClick={() => router.back()} className="text-sm text-brand-600 hover:underline">
            Go back
          </button>
        </div>
      </AppLayout>
    );
  }

  const status = statusConfig[task.status] || statusConfig.not_started;
  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-5">
          <Link href="/projects" className="hover:text-foreground transition">Projects</Link>
          <ChevronRight size={14} />
          {task.project_name && (
            <>
              <span className="text-foreground font-medium">{task.project_name}</span>
              <ChevronRight size={14} />
            </>
          )}
          <span className="truncate max-w-xs text-foreground font-medium">{task.title}</span>
        </nav>

        <div className="grid grid-cols-3 gap-6">
          {/* ── LEFT PANEL ── */}
          <div className="col-span-2 space-y-5">
            {/* Title */}
            <div>
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    className="flex-1 text-2xl font-bold bg-background border border-brand-400 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateTask({ title: titleValue });
                        setEditingTitle(false);
                      } else if (e.key === 'Escape') {
                        setEditingTitle(false);
                      }
                    }}
                    autoFocus
                  />
                  <button onClick={() => { updateTask({ title: titleValue }); setEditingTitle(false); }}
                    className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingTitle(false)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2 group">
                  <h1 className="text-2xl font-bold text-foreground leading-tight flex-1">{task.title}</h1>
                  <button
                    onClick={() => { setTitleValue(task.title); setEditingTitle(true); }}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-accent rounded-lg transition mt-0.5"
                  >
                    <Edit2 size={14} className="text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>

            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {task.labels.map((label: string) => (
                  <span key={label} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">Description</h3>
                {!editingDesc && (
                  <button onClick={() => { setDescValue(task.description || ''); setEditingDesc(true); }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition">
                    <Edit2 size={12} />
                    Edit
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div>
                  <textarea
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { updateTask({ description: descValue }); setEditingDesc(false); }}
                      className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingDesc(false)}
                      className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-accent transition">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {task.description || 'No description. Click Edit to add one.'}
                </p>
              )}
            </div>

            {/* Subtasks */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Layers size={15} />
                  Subtasks
                  {task.subtasks && task.subtasks.length > 0 && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {task.subtasks.filter((s: any) => s.status === 'completed').length}/{task.subtasks.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => toast.info('Create subtask coming soon')}
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                >
                  <Plus size={12} />
                  Add subtask
                </button>
              </div>

              {task.subtasks && task.subtasks.length > 0 ? (
                <div className="space-y-2">
                  {task.subtasks.map((sub: any) => {
                    const subStatus = statusConfig[sub.status];
                    return (
                      <Link
                        key={sub.id}
                        href={`/tasks/${sub.id}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition group"
                      >
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', subStatus?.dot)} />
                        <span className={cn(
                          'text-sm flex-1',
                          sub.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground',
                        )}>
                          {sub.title}
                        </span>
                        {sub.assignee_name && (
                          <span className="text-xs text-muted-foreground">{sub.assignee_name.split(' ')[0]}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No subtasks yet</p>
              )}
            </div>

            {/* Time Log section */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock size={15} />
                  Time Log
                </h3>
                <button
                  onClick={() => setLogTimeOpen(!logTimeOpen)}
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                >
                  <Plus size={12} />
                  Log time
                </button>
              </div>

              <div className="flex items-center gap-6 mb-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Logged: </span>
                  <span className="font-semibold text-foreground">{task.logged_hours || 0}h</span>
                </div>
                {task.estimated_hours && (
                  <div>
                    <span className="text-muted-foreground">Estimated: </span>
                    <span className="font-semibold text-foreground">{task.estimated_hours}h</span>
                  </div>
                )}
              </div>

              {/* Time entries */}
              {task.timeEntries && task.timeEntries.length > 0 && (
                <div className="space-y-1 mb-3">
                  {task.timeEntries.slice(0, 5).map((entry: any) => (
                    <div key={entry.id} className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{entry.hours}h</span>
                      <span>{entry.description || '—'}</span>
                      <span className="ml-auto">{formatDate(entry.date)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Log time form */}
              <AnimatePresence>
                {logTimeOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-border pt-3 mt-2"
                  >
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Hours *</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={logHours}
                          onChange={(e) => setLogHours(e.target.value)}
                          placeholder="e.g., 2.5"
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Description</label>
                        <input
                          type="text"
                          value={logDesc}
                          onChange={(e) => setLogDesc(e.target.value)}
                          placeholder="What did you work on?"
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!logHours || isNaN(Number(logHours))) {
                            toast.error('Enter valid hours');
                            return;
                          }
                          submitLogTime({ hours: Number(logHours), description: logDesc || undefined });
                        }}
                        disabled={loggingTime}
                        className="flex items-center gap-2 px-4 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition disabled:opacity-60"
                      >
                        {loggingTime && <Loader2 size={13} className="animate-spin" />}
                        Log Time
                      </button>
                      <button onClick={() => setLogTimeOpen(false)}
                        className="px-3 py-1.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition">
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Activity Feed */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <MessageSquare size={15} />
                Activity & Updates
                {task.comments && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {task.comments.length}
                  </span>
                )}
              </h3>

              <div className="space-y-5 mb-5">
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map((comment: any) => (
                    <ActivityItem key={comment.id} comment={comment} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No updates yet. Post the first one!</p>
                  </div>
                )}
              </div>

              <AddUpdateForm
                taskId={id as string}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['task', id] })}
              />
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
                <select
                  value={task.status}
                  onChange={(e) => updateTask({ status: e.target.value })}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm font-medium border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500',
                    status.color,
                  )}
                >
                  {Object.entries(statusConfig).slice(0, 7).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => updateTask({ priority: e.target.value })}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm font-medium border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500',
                    priority.color,
                  )}
                >
                  {Object.entries(priorityConfig).map(([key, val]) => (
                    <option key={key} value={key}>{val.icon} {val.label}</option>
                  ))}
                </select>
              </div>

              {/* Progress */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  Progress
                  <span className="text-brand-600 font-bold text-sm">{task.progress_pct || 0}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  defaultValue={task.progress_pct || 0}
                  onMouseUp={(e) => updateTask({ progressPct: Number((e.target as HTMLInputElement).value) })}
                  className="w-full accent-brand-500"
                />
                <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${task.progress_pct || 0}%` }} />
                </div>
              </div>
            </div>

            {/* People */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              {task.assignee_name && (
                <div className="flex items-center gap-3">
                  <User size={14} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">Assignee</div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0',
                        getAvatarColor(task.assignee_name),
                      )}>
                        {getInitials(task.assignee_name)}
                      </div>
                      <span className="text-sm font-medium text-foreground">{task.assignee_name}</span>
                    </div>
                  </div>
                </div>
              )}

              {task.reporter_name && (
                <div className="flex items-center gap-3">
                  <User size={14} className="text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Reporter</div>
                    <span className="text-sm text-foreground">{task.reporter_name}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              {task.start_date && (
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">Start Date</div>
                    <div className="text-sm font-medium text-foreground">{formatDate(task.start_date)}</div>
                  </div>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">Due Date</div>
                    <div className="text-sm font-medium text-foreground">{formatDate(task.due_date)}</div>
                  </div>
                </div>
              )}
              {task.sprint_name && (
                <div className="flex items-center gap-3">
                  <Flag size={14} className="text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">Sprint</div>
                    <div className="text-sm font-medium text-foreground">{task.sprint_name}</div>
                  </div>
                </div>
              )}
              {task.project_name && (
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: task.project_color || '#6366f1' }} />
                  <div>
                    <div className="text-xs text-muted-foreground">Project</div>
                    <div className="text-sm font-medium text-foreground">{task.project_name}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Watchers */}
            {task.watchers && task.watchers.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Watchers</div>
                <div className="flex flex-wrap gap-2">
                  {task.watchers.map((w: any) => (
                    <div
                      key={w.id}
                      title={`${w.first_name} ${w.last_name}`}
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium',
                        getAvatarColor(`${w.first_name} ${w.last_name}`),
                      )}
                    >
                      {getInitials(`${w.first_name} ${w.last_name}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
