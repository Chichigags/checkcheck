'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'

export default function ResetLayer2Page() {
  const router = useRouter()
  const { resetLayer2, userProfile } = useUserStore()

  useEffect(() => {
    if (userProfile) {
      resetLayer2()
    }
    router.push('/today')
  }, [resetLayer2, router, userProfile])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Resetting Layer 2...</p>
    </div>
  )
}
