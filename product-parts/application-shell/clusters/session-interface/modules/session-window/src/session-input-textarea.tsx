import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collectPathsFromDataTransfer,
  formatPathsForInsertion,
  normalizePathCandidate,
} from "./session-input-paths.js";

const DEFAULT_DRAG_OVERLAY_LABEL = "Drop files here while holding Shift";
const MAX_TEXTAREA_HEIGHT = 200;

interface SessionInputTextareaProps {
  disabled: boolean;
  onSubmit: () => void;
  onValueChange: (nextValue: string) => void;
  placeholder: string;
  value: string;
}

export function SessionInputTextarea({
  disabled,
  onSubmit,
  onValueChange,
  placeholder,
  value,
}: SessionInputTextareaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      MAX_TEXTAREA_HEIGHT
    )}px`;
  }, []);

  useEffect(() => {
    requestAnimationFrame(adjustHeight);
  });

  const insertTextAtSelection = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? textarea.value.length;
      const nextValue = `${textarea.value.slice(0, start)}${text}${textarea.value.slice(end)}`;
      onValueChange(nextValue);
      requestAnimationFrame(() => {
        const position = start + text.length;
        textarea.selectionStart = position;
        textarea.selectionEnd = position;
        textarea.focus();
        adjustHeight();
      });
    },
    [adjustHeight, onValueChange]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const paths = collectPathsFromDataTransfer(event.clipboardData);
      if (paths.length > 0) {
        event.preventDefault();
        insertTextAtSelection(formatPathsForInsertion(paths));
        return;
      }

      const plainText = event.clipboardData.getData("text/plain");
      if (!plainText) {
        return;
      }

      event.preventDefault();
      const normalized = normalizePathCandidate(plainText);
      insertTextAtSelection(
        normalized ? formatPathsForInsertion([normalized]) : plainText
      );
    },
    [insertTextAtSelection]
  );

  const handleCopy = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      const selection = textarea.value.slice(
        textarea.selectionStart ?? 0,
        textarea.selectionEnd ?? 0
      );
      if (!selection) {
        return;
      }
      event.preventDefault();
      event.clipboardData.setData("text/plain", selection);
    },
    []
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLTextAreaElement>) => {
      if (!event.shiftKey) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      const paths = collectPathsFromDataTransfer(event.dataTransfer);
      if (paths.length > 0) {
        insertTextAtSelection(formatPathsForInsertion(paths));
      }
    },
    [insertTextAtSelection]
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLTextAreaElement>) => {
      const relatedTarget = event.relatedTarget as Node | null;
      if (relatedTarget && containerRef.current?.contains(relatedTarget)) {
        return;
      }
      setIsDragging(false);
    },
    []
  );

  const containerClassName = useMemo(
    () =>
      [
        "session-input__container",
        isDragging ? "session-input__container--dragging" : "",
      ]
        .filter(Boolean)
        .join(" "),
    [isDragging]
  );

  const textareaClassName = useMemo(
    () =>
      [
        "session-input__textarea",
        isFocused ? "session-input__textarea--focused" : "",
      ]
        .filter(Boolean)
        .join(" "),
    [isFocused]
  );

  return (
    <div className={containerClassName} ref={containerRef}>
      <textarea
        aria-label="Message"
        aria-multiline="true"
        className={textareaClassName}
        disabled={disabled}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onValueChange(event.target.value)}
        onCopy={handleCopy}
        onDragEnter={(event) => {
          if (!event.shiftKey) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={handleDragLeave}
        onDragOver={(event) => {
          if (!event.shiftKey) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
        }}
        onDrop={handleDrop}
        onFocus={() => setIsFocused(true)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") {
            return;
          }
          if (
            event.shiftKey ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
          ) {
            return;
          }
          if ((event.nativeEvent as KeyboardEvent).isComposing) {
            return;
          }
          event.preventDefault();
          onSubmit();
        }}
        onPaste={handlePaste}
        placeholder={placeholder}
        ref={textareaRef}
        rows={1}
        value={value}
      />
      {isDragging ? (
        <output className="session-input__overlay">
          {DEFAULT_DRAG_OVERLAY_LABEL}
        </output>
      ) : null}
    </div>
  );
}
