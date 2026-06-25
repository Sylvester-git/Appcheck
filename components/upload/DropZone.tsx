'use client';

import { useRef, useState, useCallback } from 'react';
import type { DragEvent, ChangeEvent } from 'react';

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith('.apk')) {
        alert('Please select an APK file (.apk)');
        return;
      }
      onFile(file);
    },
    [onFile],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload APK file"
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={e => e.key === 'Enter' && !disabled && inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={[
        'relative border-2 border-dashed rounded-2xl p-20 text-center cursor-pointer select-none',
        'transition-all duration-200 outline-none',
        isDragging
          ? 'border-gray-900 bg-gray-50'
          : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/60',
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".apk"
        className="hidden"
        onChange={onChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-5">
        <div
          className={[
            'w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            isDragging
              ? 'border-gray-900 bg-gray-900 text-white scale-110'
              : 'border-gray-200 text-gray-400',
          ].join(' ')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div className="space-y-1">
          <p className="text-gray-900 font-medium">Drop your APK here</p>
          <p className="text-sm text-gray-500">or click to browse</p>
        </div>

        <p className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">.apk files only</p>
      </div>
    </div>
  );
}
