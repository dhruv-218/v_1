import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function PDFUpload({ onUpload, isUploading }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleStart = () => {
    if (selectedFile && onUpload) {
      onUpload(selectedFile);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        id="pdf-dropzone"
        className={`
          card p-10 text-center cursor-pointer transition-all duration-200
          border-2 border-dashed
          ${isDragActive
            ? 'border-accent bg-navy-50 shadow-glow'
            : selectedFile
              ? 'border-success/40 bg-emerald-50/30'
              : 'border-border hover:border-accent/40 hover:bg-navy-50/30'
          }
          ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} id="pdf-file-input" />

        {!selectedFile ? (
          <div className="space-y-3">
            <div className="w-14 h-14 mx-auto bg-navy-50 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-navy font-medium">
                {isDragActive ? 'Drop your PDF here' : 'Drop your PDF chapter here'}
              </p>
              <p className="text-muted text-sm mt-1">or click to browse · PDF only · max 50 MB</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-navy font-medium text-sm">{selectedFile.name}</p>
              <p className="text-muted text-xs">{formatSize(selectedFile.size)}</p>
            </div>
            {!isUploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="ml-2 text-muted hover:text-error transition-colors"
                aria-label="Remove file"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Start button */}
      {selectedFile && (
        <button
          id="start-learning-btn"
          onClick={handleStart}
          disabled={isUploading}
          className="btn-primary w-full text-base animate-fade-in"
        >
          {isUploading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </>
          ) : (
            <>
              Start Learning
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}
