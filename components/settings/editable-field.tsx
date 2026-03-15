'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditableFieldProps {
  label: string
  value: string
  onSave: (value: string) => void
  type?: 'text' | 'date' | 'select'
  options?: string[]
}

export function EditableField({
  label,
  value,
  onSave,
  type = 'text',
  options,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    if (editValue.trim()) {
      onSave(editValue.trim())
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center justify-between py-3">
        <span className="text-sm text-muted-foreground min-w-[120px]">{label}</span>
        <div className="flex items-center gap-2 flex-1 justify-end">
          {type === 'select' && options ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className={cn(
                'flex h-9 w-full max-w-[200px] rounded-md border border-input bg-transparent px-3 py-1 text-sm',
                'focus:outline-none focus:ring-1 focus:ring-ring'
              )}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <Input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="max-w-[200px]"
              autoFocus
            />
          )}
          <Button size="icon" variant="ghost" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-muted-foreground min-w-[120px]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{value || '—'}</span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
