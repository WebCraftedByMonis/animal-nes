"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, Copy, Check, X, Loader2, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

interface UploadedImage {
  filename: string
  url: string
}

interface FailedImage {
  filename: string
  error: string
}

interface PendingFile {
  file: File
  preview: string
}

export default function MediaUploadPage() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [uploaded, setUploaded] = useState<UploadedImage[]>([])
  const [failed, setFailed] = useState<FailedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setPendingFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"] },
    multiple: true,
  })

  const removePending = (index: number) => {
    setPendingFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return

    setIsUploading(true)
    const formData = new FormData()
    pendingFiles.forEach(({ file }) => formData.append("images", file))

    try {
      const res = await fetch("/api/admin/media", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Upload failed")
        return
      }

      if (data.uploaded?.length > 0) {
        setUploaded((prev: UploadedImage[]) => [...data.uploaded, ...prev])
        toast.success(`${data.uploaded.length} image(s) uploaded successfully`)
      }
      if (data.failed?.length > 0) {
        setFailed((prev) => [...data.failed, ...prev])
        toast.error(`${data.failed.length} image(s) failed to upload`)
      }

      // Clear pending previews
      pendingFiles.forEach(({ preview }) => URL.revokeObjectURL(preview))
      setPendingFiles([])
    } catch (err) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsUploading(false)
    }
  }

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <h1 className="text-3xl font-bold text-green-500">Media Upload</h1>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-gray-300 hover:border-green-400 dark:border-zinc-600"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-14 w-14 text-green-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          {isDragActive ? "Drop images here..." : "Drag & drop images here, or click to select"}
        </p>
        <p className="text-sm text-gray-400 mt-1">Supports: JPEG, JPG, PNG, WEBP, GIF — multiple files allowed</p>
      </div>

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              Ready to upload ({pendingFiles.length})
            </h2>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg font-medium transition disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Upload All
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {pendingFiles.map(({ file, preview }, idx) => (
              <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800">
                <div className="relative aspect-square">
                  <Image src={preview} alt={file.name} fill className="object-cover" />
                </div>
                <p className="text-xs text-center text-gray-500 truncate px-1 py-1">{file.name}</p>
                <button
                  onClick={() => removePending(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded images gallery */}
      {uploaded.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Uploaded Images ({uploaded.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploaded.map((img, idx) => (
              <div key={idx} className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm">
                <div className="relative aspect-video bg-gray-100 dark:bg-zinc-900">
                  <Image src={img.url} alt={img.filename} fill className="object-cover" />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs text-gray-500 truncate" title={img.filename}>{img.filename}</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={img.url}
                      className="flex-1 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-2 py-1 truncate text-gray-600 dark:text-gray-300"
                    />
                    <button
                      onClick={() => copyUrl(img.url)}
                      className="shrink-0 p-1.5 rounded bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/50 text-green-600 dark:text-green-400 transition"
                      title="Copy URL"
                    >
                      {copiedUrl === img.url ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed uploads */}
      {failed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-red-500">Failed Uploads</h2>
          <ul className="space-y-1">
            {failed.map((f, idx) => (
              <li key={idx} className="text-sm text-red-500 flex items-center gap-2">
                <X className="h-4 w-4 shrink-0" />
                <span><strong>{f.filename}</strong>: {f.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {pendingFiles.length === 0 && uploaded.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-zinc-500">
          <ImageIcon className="h-16 w-16 mb-3" />
          <p className="text-lg">No images yet</p>
          <p className="text-sm">Drop files above to get started</p>
        </div>
      )}
    </div>
  )
}
