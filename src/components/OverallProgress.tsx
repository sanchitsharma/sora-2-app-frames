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
    <div className="mt-6 mb-6">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span className="font-medium">{status}</span>
        {currentSegment && totalSegments && (
          <span>
            Segment {currentSegment}/{totalSegments}
          </span>
        )}
        <span className="font-semibold">{progress}%</span>
      </div>
      <div className="h-6 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 transition-all duration-300 ease-out flex items-center justify-center text-white text-sm font-semibold relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          {progress > 10 && `${progress}%`}
        </div>
      </div>
    </div>
  );
}
