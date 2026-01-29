'use client'

import React from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { MapPin, Mail, Calendar, Briefcase, GraduationCap, Building2, User2, Download, Phone } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/whatsapp-utils'

interface Applicant {
  id: number
  name: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  mobileNumber: string
  address: string
  qualification?: string
  dateOfBirth: string
  expectedPosition?: string
  expectedSalary?: string
  preferredIndustry?: string
  preferredLocation?: string
  highestDegree?: string
  degreeInstitution?: string
  majorFieldOfStudy?: string
  workExperience?: string
  previousCompany?: string
  declaration: 'AGREED' | 'NOT_AGREED'
  image?: { url: string; alt: string } | null
  cv?: { url: string; alt: string } | null
}

interface ApplicantDetailClientProps {
  applicant: Applicant | null
}

export default function ApplicantDetailClient({ applicant }: ApplicantDetailClientProps) {
  const loading = false

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-8 bg-white dark:bg-gray-900">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="w-full h-[400px] rounded-xl bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4 bg-gray-200 dark:bg-gray-700" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
                  <Skeleton className="h-6 w-full bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!applicant) {
    return (
      <div className="max-w-6xl mx-auto p-10 text-center bg-white dark:bg-gray-900">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 inline-block">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Applicant not found</h2>
          <p className="text-red-500 dark:text-red-400">
            The applicant you're looking for doesn't exist or may have been removed.
          </p>
        </div>
      </div>
    )
  }

  const genderBadgeColor = {
    'MALE': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    'FEMALE': 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200',
    'OTHER': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
  }

  const declarationBadgeColor = {
    'AGREED': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    'NOT_AGREED': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Image and Basic Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg overflow-hidden">
            {applicant.image?.url ? (
              <Image
                src={applicant.image.url}
                alt={applicant.image.alt || applicant.name}
                width={600}
                height={600}
                className="w-full h-auto object-contain"
                priority
              />
            ) : (
              <div className="bg-gray-100 dark:bg-zinc-800 aspect-square flex items-center justify-center">
                <div className="text-center text-gray-400 dark:text-gray-500">
                  <User2 className="w-16 h-16 mx-auto mb-2" />
                  <span className="text-sm">No Image Available</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold">Contact Information</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className={genderBadgeColor[applicant.gender]}>
                  {applicant.gender}
                </Badge>
                <Badge className={declarationBadgeColor[applicant.declaration]}>
                  {applicant.declaration}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>
                  DOB: {new Date(applicant.dateOfBirth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <a
                href={getWhatsAppUrl(applicant.mobileNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm hover:underline text-green-600 dark:text-green-400"
              >
                <Phone className="w-4 h-4" />
                <span>{applicant.mobileNumber}</span>
              </a>


              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                <span>{applicant.address}</span>
              </div>
            </div>
          </div>

          {applicant.cv && (
            <a
              href={applicant.cv.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block"
            >
              <Button className="w-full gap-2">
                <Download className="w-4 h-4" />
                Download CV
              </Button>
            </a>
          )}
        </div>

        {/* Right Column - Detailed Information */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{applicant.name}</h1>
            {applicant.expectedPosition && (
              <p className="text-lg text-gray-600 dark:text-gray-400">{applicant.expectedPosition}</p>
            )}
          </div>

          {/* Career Preferences */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-green-600 dark:text-green-500" />
              Career Preferences
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailCard
                label="Expected Position"
                value={applicant.expectedPosition || 'Not specified'}
              />
              <DetailCard
                label="Expected Salary"
                value={applicant.expectedSalary || 'Not specified'}
              />
              <DetailCard
                label="Preferred Industry"
                value={applicant.preferredIndustry || 'Not specified'}
              />
              <DetailCard
                label="Preferred Location"
                value={applicant.preferredLocation || 'Not specified'}
              />
            </div>
          </div>

          {/* Education */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-green-600 dark:text-green-500" />
              Education
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailCard
                label="Highest Degree"
                value={applicant.highestDegree || 'Not specified'}
              />
              <DetailCard
                label="Institution"
                value={applicant.degreeInstitution || 'Not specified'}
              />
              <DetailCard
                label="Field of Study"
                value={applicant.majorFieldOfStudy || 'Not specified'}
              />
              <DetailCard
                label="Qualification"
                value={applicant.qualification || 'Not specified'}
              />
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600 dark:text-green-500" />
              Work Experience
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailCard
                label="Experience"
                value={applicant.workExperience || 'Not specified'}
              />
              <DetailCard
                label="Previous Company"
                value={applicant.previousCompany || 'Not specified'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reusable Detail Card Component
function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-medium text-gray-700 dark:text-gray-200">{value}</p>
    </div>
  )
}