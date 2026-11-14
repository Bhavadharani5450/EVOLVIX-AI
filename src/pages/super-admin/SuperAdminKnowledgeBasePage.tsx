import React, { useState } from 'react';
import { Database, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Card, Modal, PageHeader, StatusLabel } from '../../components/UiPrimitives';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import type { KnowledgeSourceRecord } from '../../types/evolvix';

export const SuperAdminKnowledgeBasePage: React.FC = () => {
  const { state, updateState } = useAppData();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'Skill Ontology' as KnowledgeSourceRecord['category'],
    format: 'Markdown' as KnowledgeSourceRecord['format'],
    chunkCount: 180,
  });

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const created: KnowledgeSourceRecord = {
      id: `kb-${Date.now()}`,
      title: form.title.trim(),
      category: form.category,
      format: form.format,
      chunkCount: form.chunkCount,
      status: 'indexed',
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    updateState((prev) => ({
      ...prev,
      knowledgeSources: [created, ...prev.knowledgeSources],
    }));
    setForm({ title: '', category: 'Skill Ontology', format: 'Markdown', chunkCount: 180 });
    setModalOpen(false);
    showToast('Knowledge source indexed', `${created.title} (${created.chunkCount} chunks)`);
  };

  const handleReindex = (id: string) => {
    updateState((prev) => ({
      ...prev,
      knowledgeSources: prev.knowledgeSources.map((kb) =>
        kb.id === id
          ? {
              ...kb,
              status: 'indexed',
              chunkCount: kb.chunkCount || 140,
              errorMessage: undefined,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : kb
      ),
    }));
    showToast('Source re-indexed', 'Ingestion completed cleanly.');
  };

  const handleRemove = (id: string, title: string) => {
    updateState((prev) => ({
      ...prev,
      knowledgeSources: prev.knowledgeSources.filter((kb) => kb.id !== id),
    }));
    showToast('Source removed', `${title} deleted from knowledge index.`, 'info');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        subtitle="Manage indexed taxonomies, rubrics, curriculum guides, and monitor ingestion errors."
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Document</span>
          </button>
        }
      />

      <div className="space-y-3">
        {state.knowledgeSources.map((kb) => (
          <Card key={kb.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A]">{kb.title}</h2>
                <p className="text-xs text-[#64748B] mt-0.5 font-mono tabular-nums">
                  {kb.category} · {kb.format} · {kb.chunkCount} chunks · Updated {kb.updatedAt}
                </p>
                {kb.errorMessage && (
                  <p className="text-xs text-[#DC2626] mt-1">Ingestion Error: {kb.errorMessage}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <StatusLabel
                tone={kb.status === 'indexed' ? 'success' : kb.status === 'indexing' ? 'info' : 'error'}
                text={kb.status}
              />
              {kb.status === 'error' && (
                <button
                  type="button"
                  onClick={() => handleReindex(kb.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#4F46E5] hover:bg-indigo-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Index</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(kb.id, kb.title)}
                aria-label={`Remove ${kb.title}`}
                className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626] hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Knowledge Document">
        <form onSubmit={handleAddSource} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Document Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Cloud Security Engineering Competency Matrix"
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as KnowledgeSourceRecord['category'] }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              >
                <option value="Skill Ontology">Skill Ontology</option>
                <option value="Career Taxonomy">Career Taxonomy</option>
                <option value="Curriculum Guide">Curriculum Guide</option>
                <option value="Assessment Rubric">Assessment Rubric</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Format</label>
              <select
                value={form.format}
                onChange={(e) => setForm((p) => ({ ...p, format: e.target.value as KnowledgeSourceRecord['format'] }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              >
                <option value="Markdown">Markdown</option>
                <option value="JSON">JSON</option>
                <option value="PDF">PDF</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B]">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium">
              Add & Index
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
