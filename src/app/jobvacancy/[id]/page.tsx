'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Briefcase, Building2, Phone, Mail, MapPin, Clock, User } from 'lucide-react'

interface JobFormImage {
  id: number
  url: string
  alt: string
  publicId: string
}

interface JobForm {
  id: number
  name: string
  company: string
  mobileNumber: string
  email?: string
  position: string
  eligibility: string
  benefits: string
  location: string
  deadline: string
  noofpositions: string
  companyAddress: string
  howToApply: string
  createdAt: string
  updatedAt: string
  jobFormImage?: JobFormImage | null
}

export default function JobFormDetailPage() {
  const { id } = useParams()
  const [jobForm, setJobForm] = useState<JobForm | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchJob() {
      try {
        const { data } = await axios.get<JobForm>(`/api/vacancyForm/${id}`)
        setJobForm(data)
      } catch (err) {
        console.error('Failed to load job:', err)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchJob()
  }, [id])

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

  if (!jobForm) {
    return (
      <div className="max-w-6xl mx-auto p-10 text-center bg-white dark:bg-gray-900">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 inline-block">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Job not found</h2>
          <p className="text-red-500 dark:text-red-400">
            The job you're looking for doesn't exist or may have been removed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Image and Basic Info */}
        <div className="space-y-6">
          <div className="relative w-full h-96 rounded-xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800">
            {jobForm.jobFormImage?.url ? (
              <Image
                src={jobForm.jobFormImage.url}
                alt={jobForm.jobFormImage.alt}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <Briefcase className="w-16 h-16" />
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold">Quick Details</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>
                  <span className="font-medium">Company:</span> {jobForm.company}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>
                  <span className="font-medium">Posted By:</span> {jobForm.name}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>{jobForm.mobileNumber}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>{jobForm.email || 'N/A'}</span>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                <span>{jobForm.location}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>
                  <span className="font-medium">Deadline:</span> {jobForm.deadline}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Detailed Information */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-green-600 dark:text-green-500">{jobForm.position}</h1>
            <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
              {jobForm.noofpositions} positions available
            </Badge>
          </div>

          {/* Job Details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-green-600 dark:text-green-500" />
              Job Details
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailCard 
                label="Eligibility" 
                value={jobForm.eligibility || 'Not specified'} 
              />
              <DetailCard 
                label="Benefits" 
                value={jobForm.benefits || 'Not specified'} 
              />
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600 dark:text-green-500" />
              Company Information
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailCard 
                label="Company Address" 
                value={jobForm.companyAddress || 'Not specified'} 
              />
              <DetailCard 
                label="How to Apply" 
                value={jobForm.howToApply || 'Not specified'} 
              />
            </div>
          </div>

          {/* Meta Information */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-500" />
              Meta Information
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailCard 
                label="Created At" 
                value={new Date(jobForm.createdAt).toLocaleString()} 
              />
              <DetailCard 
                label="Updated At" 
                value={new Date(jobForm.updatedAt).toLocaleString()} 
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