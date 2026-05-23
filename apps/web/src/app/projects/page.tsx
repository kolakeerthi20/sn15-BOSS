'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Grid3X3, List, FolderOpen } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { projectsApi } from '@/lib/api';
import { ProjectCard } from '@/components/projects/project-card';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { cn, statusConfig } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Planning', value: 'planning' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Completed', value: 'completed' },
];

export default function ProjectsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, status: statusFilter }],
    queryFn: () => projectsApi.list({ search, status: statusFilter, limit: 50 }),
  });

  const projects = data?.data?.data || [];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {data?.data?.total || 0} projects total
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition',
                  statusFilter === f.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setView('grid')}
              className={cn('p-1.5 rounded-md transition',
                view === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
            >
              <Grid3X3 size={15} />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('p-1.5 rounded-md transition',
                view === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Projects */}
        {isLoading ? (
          <div className={cn('gap-4', view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3')}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 skeleton rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No projects found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {search ? 'Try adjusting your search' : 'Create your first project to get started'}
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className={cn(
            view === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
              : 'space-y-2',
          )}>
            {projects.map((project: any, i: number) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <ProjectCard project={project} view={view} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppLayout>
  );
}
