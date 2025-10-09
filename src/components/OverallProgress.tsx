interface OverallProgressProps {
  progress: number;
  status: string;
  currentSegment?: number;
  totalSegments?: number;
}

export function OverallProgress({
  progress,
  status,
  currentSegment,
  totalSegments,
}: OverallProgressProps) {
  return (
    <div className="mt-8 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
      <div className="flex justify-between text-sm text-gray-700 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        <span className="font-medium flex items-center gap-2">
          <span>⚡</span>
          {status}
        </span>
        {currentSegment && totalSegments && (
          <span className="bg-gray-900 text-white px-3 py-1 rounded-md text-xs font-medium">
            Segment {currentSegment}/{totalSegments}
          </span>
        )}
        <span className="font-medium text-gray-900">{progress}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-900 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
