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
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          🎬 AI-Generated Prompt Plan
        </h2>
        <span className="text-sm text-gray-500">
          {plannedSegments.length} segment{plannedSegments.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <p className="text-sm text-blue-800">
          ✨ Review and edit the AI-planned prompts below. Each segment is designed for continuity.
          Click on any segment to expand and edit.
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
        {plannedSegments.map((segment, index) => {
          const isExpanded = expandedIndex === index;
          const isEditing = editingIndex === index;

          return (
            <div
              key={index}
              className={`border rounded-lg transition-all ${
                isExpanded ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div
                className="p-4 cursor-pointer flex items-center justify-between"
                onClick={() => !isEditing && setExpandedIndex(isExpanded ? null : index)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-800">{segment.title}</h3>
                      <p className="text-xs text-gray-500">{segment.seconds}s</p>
                    </div>
                  </div>
                </div>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-transform"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▼
                </button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-blue-200">
                  {isEditing ? (
                    <div className="space-y-3 pt-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        placeholder="Edit the prompt..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(index)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                        >
                          ✓ Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-3">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-gray-200 max-h-64 overflow-y-auto">
                        {segment.prompt}
                      </pre>
                      <button
                        onClick={() => handleStartEdit(index, segment.prompt)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
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

      <div className="flex gap-3">
        <button
          onClick={onApprove}
          disabled={isGenerating}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : '✓ Approve & Generate Videos'}
        </button>
        <button
          onClick={onCancel}
          disabled={isGenerating}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
