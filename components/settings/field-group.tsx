'use client'

import { cn } from '@/lib/utils'

interface FieldGroupProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function FieldGroup({ title, children, className }: FieldGroupProps) {
  return (
    <div className={cn('', className)}>
      <h2 className="text-sm font-semibold text-foreground mb-1">{title}</h2>
      <div className="divide-y">{children}</div>
    </div>
  )
}
