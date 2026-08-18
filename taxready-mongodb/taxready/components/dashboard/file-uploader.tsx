"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import clsx from "clsx";

export function FileUploader({
  accept,
  label,
  hint,
  onFile
}: {
  accept: string;
  label: string;
  hint: string;
  onFile: (file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files && files[0]) onFile(files[0]);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      className={clsx(
        "focus-ring flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border-2 border-dashed p-10 text-center transition-colors",
        dragging ? "border-brand-500 bg-brand-50" : "border-line bg-sand/40 hover:border-ink/30"
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-600 shadow-card">
        <UploadCloud size={20} />
      </span>
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="text-xs text-ink/45">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
