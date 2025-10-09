import { useState } from 'react';
import type { PlannedSegment } from '../types';

interface PromptPlannerProps {
  plannedSegments: PlannedSegment[];
  onEdit: (index: number, newPrompt: string) => void;
  onApprove: () => void;
  onCancel: () => void;
  isGenerating?: boolean;
}

export function PromptPlanner({
  plannedSegments,
  onEdit,
  onApprove,
  onCancel,
  isGenerating = false,
}: PromptPlannerProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleStartEdit = (index: number, currentPrompt: string) => {
    setEditingIndex(index);
    setEditText(currentPrompt);
  };

  const handleSaveEdit = (index: number) => {
    onEdit(index, editText);
    setEditingIndex(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 mb-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-serif text-gray-900" style={{ fontFamily: 'Lora, Georgia, serif' }}>
          AI-Generated Prompt Plan
        </h2>
        <span className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
          {plannedSegments.length} segment{plannedSegments.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-5 mb-8 rounded-lg">
        <p className="text-sm text-blue-900 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
          ✨ Review and edit the AI-planned prompts below. Each segment is designed for continuity.
          Click on any segment to expand and edit.
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto mb-8">
        {plannedSegments.map((segment, index) => {
          const isExpanded = expandedIndex === index;
          const isEditing = editingIndex === index;

          return (
            <div
              key={index}
              className={`border rounded-lg transition-all ${
                isExpanded ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400 bg-white'
              }`}
            >
              <div
                className="p-5 cursor-pointer flex items-center justify-between"
                onClick={() => !isEditing && setExpandedIndex(isExpanded ? null : index)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-medium text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-gray-900 text-base" style={{ fontFamily: 'Inter, sans-serif' }}>{segment.title}</h3>
                      <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                        ⏱️ {segment.seconds}s
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  className="text-gray-400 hover:text-gray-900 transition-all text-sm"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▼
                </button>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-200">
                  {isEditing ? (
                    <div className="space-y-4 pt-4">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 font-mono text-sm bg-white"
                        placeholder="Edit the prompt..."
                        style={{ fontFamily: 'monospace' }}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSaveEdit(index)}
                          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-medium"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          ✓ Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-4">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-64 overflow-y-auto" style={{ fontFamily: 'monospace' }}>
                        {segment.prompt}
                      </pre>
                      <button
                        onClick={() => handleStartEdit(index, segment.prompt)}
                        className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium border border-gray-300"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        ✏️ Edit Prompt
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onApprove}
          disabled={isGenerating}
          className="flex-1 px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⚙️</span> Generating...
            </span>
          ) : (
            '✓ Approve & Generate Videos'
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isGenerating}
          className="px-8 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
