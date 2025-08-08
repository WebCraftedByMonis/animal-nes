'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import axios from 'axios'
import { toast } from 'react-toastify'

export default function EditApplicantModal({ applicant, onClose, onUpdated }: any) {
  const [form, setForm] = useState({
    ...applicant,
    dateOfBirth: applicant.dateOfBirth ? new Date(applicant.dateOfBirth).toISOString().split('T')[0] : '',
    image: null,
    cv: null,
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSelectChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    if (files && files.length > 0) {
      setForm({ ...form, [name]: files[0] })
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('id', String(form.id))
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value as any)
        }
      })

      await axios.put('/api/jobApplicant', formData)
      toast.success('Applicant updated successfully')
      onUpdated()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update applicant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4">
        <h2 className="text-lg font-bold">Edit Applicant</h2>

        {/* Name */}
        <Input name="name" value={form.name} onChange={handleChange} placeholder="Name" />

        {/* Gender */}
        <Select value={form.gender} onValueChange={(v) => handleSelectChange('gender', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Mobile Number */}
        <Input name="mobileNumber" value={form.mobileNumber} onChange={handleChange} placeholder="Mobile Number" />

        {/* Address */}
        <Input name="address" value={form.address} onChange={handleChange} placeholder="Address" />

        {/* Date of Birth */}
        <Input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />

        {/* Optional fields */}
        <Input name="qualification" value={form.qualification || ''} onChange={handleChange} placeholder="Qualification" />
        <Input name="expectedPosition" value={form.expectedPosition || ''} onChange={handleChange} placeholder="Expected Position" />
        <Input name="expectedSalary" value={form.expectedSalary || ''} onChange={handleChange} placeholder="Expected Salary" />
        <Input name="preferredIndustry" value={form.preferredIndustry || ''} onChange={handleChange} placeholder="Preferred Industry" />
        <Input name="preferredLocation" value={form.preferredLocation || ''} onChange={handleChange} placeholder="Preferred Location" />
        <Input name="highestDegree" value={form.highestDegree || ''} onChange={handleChange} placeholder="Highest Degree" />
        <Input name="degreeInstitution" value={form.degreeInstitution || ''} onChange={handleChange} placeholder="Degree Institution" />
        <Input name="majorFieldOfStudy" value={form.majorFieldOfStudy || ''} onChange={handleChange} placeholder="Major Field of Study" />
        <Input name="workExperience" value={form.workExperience || ''} onChange={handleChange} placeholder="Work Experience" />
        <Input name="previousCompany" value={form.previousCompany || ''} onChange={handleChange} placeholder="Previous Company" />

        {/* Declaration */}
        <Select value={form.declaration} onValueChange={(v) => handleSelectChange('declaration', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Declaration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AGREED">Agreed</SelectItem>
            <SelectItem value="NOT_AGREED">Not Agreed</SelectItem>
          </SelectContent>
        </Select>

        {/* File uploads */}
        <div>
          <label className="block text-sm font-medium">Image</label>
          <input type="file" name="image" accept="image/*" onChange={handleFileChange} />
        </div>
        <div>
          <label className="block text-sm font-medium">CV</label>
          <input type="file" name="cv" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
