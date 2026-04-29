/**
 * ProjectNameInput Component
 * 
 * Editable project name with inline editing support.
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Edit3, Check, X } from 'lucide-react';

interface ProjectNameInputProps {
  name: string;
  onRename: (newName: string) => Promise<boolean>;
  className?: string;
}

export default function ProjectNameInput({ 
  name, 
  onRename,
  className = '',
}: ProjectNameInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(name);
  }, [name]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === name) {
      setEditValue(name);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const success = await onRename(trimmed);
    setIsSaving(false);

    if (success) {
      setIsEditing(false);
    } else {
      setEditValue(name);
    }
  };

  const handleCancel = () => {
    setEditValue(name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className="
            px-2 py-1 text-sm font-medium
            bg-zinc-800 border border-zinc-600
            rounded focus:outline-none focus:border-blue-500
            text-zinc-100 min-w-[120px]
          "
          maxLength={100}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 rounded hover:bg-zinc-700 text-green-400"
          title="Save"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 group ${className}`}>
      <span className="text-sm font-medium text-zinc-200 truncate max-w-[200px]">
        {name}
      </span>
      <button
        onClick={() => setIsEditing(true)}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-400 transition-opacity"
        title="Rename project"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

