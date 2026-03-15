'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore, type UserProfile } from '@/lib/store'
import { EditableField } from '@/components/settings/editable-field'
import { FieldGroup } from '@/components/settings/field-group'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, RotateCcw, Sparkles } from 'lucide-react'
import Link from 'next/link'

const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const deliveryTimeOptions = ['Morning', 'Afternoon', 'Evening']
const languageOptions = ['German', 'Mandarin', 'Japanese', 'Spanish', 'French', 'None']
const relationshipOptions = ['Single', 'In a relationship', "It's complicated", 'Prefer not to say']
const lifeFocusOptions = ['Career', 'Relationships', 'Health', 'Wealth', 'Personal Growth']
const birthTimeOptions = ['Morning', 'Afternoon', 'Evening', 'Unknown']

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
]

export default function SettingsPage() {
  const router = useRouter()
  const { userProfile, updateProfileField, resetOnboarding, onboarding } = useUserStore()

  useEffect(() => {
    // If no profile, redirect to onboarding
    if (!onboarding.isComplete && !userProfile) {
      router.push('/')
    }
  }, [onboarding.isComplete, userProfile, router])

  const handleUpdate = (field: keyof UserProfile, value: string) => {
    updateProfileField(field, value)
  }

  const handleReset = () => {
    resetOnboarding()
    router.push('/')
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const isBirthTimeUnknown = userProfile.birthTime === 'Unknown'

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Link href="/today">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Profile & Settings</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/today">
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Today's Reading
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {isBirthTimeUnknown && (
          <Alert className="mb-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Approximate readings — birth time unknown
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-8">
          <FieldGroup title="Identity">
            <div className="group">
              <EditableField
                label="Legal Name"
                value={userProfile.legalName}
                onSave={(value) => handleUpdate('legalName', value)}
              />
            </div>
            <div className="group">
              <EditableField
                label="Nickname"
                value={userProfile.nickname}
                onSave={(value) => handleUpdate('nickname', value)}
              />
            </div>
          </FieldGroup>

          <FieldGroup title="Birth Data">
            <div className="group">
              <EditableField
                label="Date of Birth"
                value={userProfile.dateOfBirth}
                onSave={(value) => handleUpdate('dateOfBirth', value)}
                type="date"
              />
            </div>
            <div className="group">
              <EditableField
                label="Birth Time"
                value={userProfile.birthTime}
                onSave={(value) => handleUpdate('birthTime', value)}
                type="select"
                options={birthTimeOptions}
              />
            </div>
            <div className="group">
              <EditableField
                label="Birth City"
                value={userProfile.birthCity}
                onSave={(value) => handleUpdate('birthCity', value)}
              />
            </div>
            <div className="group">
              <EditableField
                label="Gender"
                value={userProfile.gender}
                onSave={(value) => handleUpdate('gender', value)}
                type="select"
                options={genderOptions}
              />
            </div>
          </FieldGroup>

          <FieldGroup title="Preferences">
            <div className="group">
              <EditableField
                label="Delivery Time"
                value={userProfile.deliveryTime}
                onSave={(value) => handleUpdate('deliveryTime', value)}
                type="select"
                options={deliveryTimeOptions}
              />
            </div>
            <div className="group">
              <EditableField
                label="Timezone"
                value={userProfile.timezone}
                onSave={(value) => handleUpdate('timezone', value)}
                type="select"
                options={timezones}
              />
            </div>
            <div className="group">
              <EditableField
                label="Language"
                value={userProfile.languagePreference}
                onSave={(value) => handleUpdate('languagePreference', value)}
                type="select"
                options={languageOptions}
              />
            </div>
            <div className="group">
              <EditableField
                label="Life Focus"
                value={userProfile.lifeFocus || 'Not set'}
                onSave={(value) => handleUpdate('lifeFocus', value)}
                type="select"
                options={lifeFocusOptions}
              />
            </div>
            <div className="group">
              <EditableField
                label="Relationship"
                value={userProfile.relationshipStatus || 'Not set'}
                onSave={(value) => handleUpdate('relationshipStatus', value)}
                type="select"
                options={relationshipOptions}
              />
            </div>
            <div className="group">
              <EditableField
                label="Current City"
                value={userProfile.currentCity || 'Not set'}
                onSave={(value) => handleUpdate('currentCity', value)}
              />
            </div>
          </FieldGroup>
        </div>
      </main>
    </div>
  )
}
