'use client'

import { useState } from 'react'

export default function JobFormUpload() {
  const [image, setImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    if (image) {
      formData.append('image', image)
    }

    try {
      const res = await fetch('/api/vacancyForm', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Something went wrong')
      } else {
        setSuccess('Job form submitted successfully!')
        e.currentTarget.reset()
        setImage(null)
      }
    } catch (err) {
      setError('Failed to submit job form')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-white shadow rounded-xl space-y-4">
      <h2 className="text-xl font-semibold">Post a Job</h2>

      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}

      <input name="name" placeholder="Your Name" className="input" required />
      <input name="company" placeholder="Company Name" className="input" required />
      <input name="mobileNumber" placeholder="Mobile Number" className="input" required />
      <input name="email" type="email" placeholder="Email (optional)" className="input" />
      <input name="position" placeholder="Position" className="input" required />
      <input name="eligibility" placeholder="Eligibility" className="input" required />
      <input name="benefits" placeholder="Benefits" className="input" required />
      <input name="location" placeholder="Location" className="input" required />
      <input name="deadline" placeholder="deadline" className="input" required />
      <input name="noofpositions" placeholder="noofpostions" className="input" required />
      <input name="companyAddress" placeholder="Company Address" className="input" required />
      <textarea name="howToApply" placeholder="How to Apply" className="input" required />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] || null)}
        className="block"
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Job Form'}
      </button>
    </form>
  )
}
