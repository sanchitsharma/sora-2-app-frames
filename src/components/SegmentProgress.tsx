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
        return 'text-green-600 bg-green-50';
      case 'generating':
        return 'text-blue-600 bg-blue-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-400 bg-gray-50';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getStatusColor()} transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {getStatusIcon()} Segment {index + 1}
        </span>
        <span className="text-xs font-semibold">{segment.progress}%</span>
      </div>
      {segment.status === 'generating' && (
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${segment.progress}%` }}
          />
        </div>
      )}
      {segment.error && (
        <p className="text-xs text-red-600 mt-1">{segment.error}</p>
      )}
    </div>
  );
}
