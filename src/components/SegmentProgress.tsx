import type { VideoSegment } from '../types';

interface SegmentProgressProps {
  segment: VideoSegment;
  index: number;
}

export function SegmentProgress({ segment, index }: SegmentProgressProps) {
  const getStatusIcon = () => {
    switch (segment.status) {
      case 'completed':
        return '✓';
      case 'generating':
        return '⏳';
      case 'failed':
        return '✗';
      default:
        return '○';
    }
  };

  const getStatusColor = () => {
    switch (segment.status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'generating':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()} transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
          <span>{getStatusIcon()}</span>
          Segment {index + 1}
        </span>
        <span className="text-xs font-medium bg-white/60 px-2 py-1 rounded" style={{ fontFamily: 'Inter, sans-serif' }}>
          {segment.progress}%
        </span>
      </div>
      {segment.status === 'generating' && (
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 transition-all duration-500"
            style={{ width: `${segment.progress}%` }}
          />
        </div>
      )}
      {segment.error && (
        <p className="text-xs text-red-600 mt-2 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
          ⚠ {segment.error}
        </p>
      )}
    </div>
  );
}
