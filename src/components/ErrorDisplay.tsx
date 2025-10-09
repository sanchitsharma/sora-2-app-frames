interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  return (
    <div className="bg-red-50 border border-red-200 p-5 rounded-lg mb-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <span className="text-red-600 text-xl">⚠</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-900 mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Error Occurred
          </h3>
          <p className="text-sm text-red-700 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>{error}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-600 hover:text-red-900 transition-colors text-lg"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
