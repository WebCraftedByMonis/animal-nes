"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, Copy, Check, X, Loader2, Image as ImageIcon, Trash2, CheckSquare, Square } from "lucide-react"
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
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Load existing images from server on mount
  useEffect(() => {
    fetch("/api/admin/media")
      .then((r) => r.json())
      .then((data) => {
        if (data.images) setUploaded(data.images)
      })
      .catch(() => toast.error("Failed to load existing images"))
      .finally(() => setIsLoading(false))
  }, [])

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
        toast.success(`${data.uploaded.length} image(s) uploaded`)
      }
      if (data.failed?.length > 0) {
        setFailed((prev) => [...data.failed, ...prev])
        toast.error(`${data.failed.length} image(s) failed`)
      }

      pendingFiles.forEach(({ preview }) => URL.revokeObjectURL(preview))
      setPendingFiles([])
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setIsUploading(false)
    }
  }

  const toggleSelect = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === uploaded.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(uploaded.map((img) => img.url)))
    }
  }

  const handleDelete = async (urls: string[]) => {
    if (urls.length === 0) return
    setIsDeleting(true)
    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Delete failed")
        return
      }

      const deletedSet = new Set(data.deleted as string[])
      setUploaded((prev) => prev.filter((img) => !deletedSet.has(img.url)))
      setSelected((prev) => {
        const next = new Set(prev)
        deletedSet.forEach((url) => next.delete(url))
        return next
      })

      if (data.deleted?.length > 0) toast.success(`${data.deleted.length} image(s) deleted`)
      if (data.failed?.length > 0) toast.error(`${data.failed.length} image(s) could not be deleted`)
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setIsDeleting(false)
    }
  }

  const copyUrl = async (url: string) => {
    const fullUrl = `${window.location.origin}${url}`
    await navigator.clipboard.writeText(fullUrl)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
    toast.success("URL copied!")
  }

  const allSelected = uploaded.length > 0 && selected.size === uploaded.length

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <h1 className="text-3xl font-bold text-green-500">Media Upload</h1>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-green-500 bg-green-50 dark:bg-green-900/10"
            : "border-gray-300 hover:border-green-400 dark:border-zinc-600"
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
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
              ) : (
                <><UploadCloud className="h-4 w-4" /> Upload All</>
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
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : uploaded.length > 0 ? (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                Uploaded Images ({uploaded.length})
              </h2>
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-green-500 transition"
              >
                {allSelected
                  ? <CheckSquare className="h-4 w-4 text-green-500" />
                  : <Square className="h-4 w-4" />}
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            {selected.size > 0 && (
              <button
                onClick={() => handleDelete(Array.from(selected))}
                disabled={isDeleting}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
              >
                {isDeleting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="h-4 w-4" /> Delete selected ({selected.size})</>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploaded.map((img, idx) => {
              const isSelected = selected.has(img.url)
              const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${img.url}` : img.url
              return (
                <div
                  key={idx}
                  className={`rounded-xl overflow-hidden border-2 transition-all bg-white dark:bg-zinc-800 shadow-sm ${
                    isSelected ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-zinc-700"
                  }`}
                >
                  {/* Image with select overlay */}
                  <div
                    className="relative aspect-video bg-gray-100 dark:bg-zinc-900 cursor-pointer"
                    onClick={() => toggleSelect(img.url)}
                  >
                    <Image src={img.url} alt={img.filename} fill className="object-cover" />
                    <div className={`absolute inset-0 transition-colors ${isSelected ? "bg-red-500/20" : "bg-transparent hover:bg-black/10"}`} />
                    <div className="absolute top-2 left-2">
                      {isSelected
                        ? <CheckSquare className="h-5 w-5 text-red-500 drop-shadow" />
                        : <Square className="h-5 w-5 text-white drop-shadow opacity-60" />}
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <p className="text-xs text-gray-500 truncate" title={img.filename}>{img.filename}</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={fullUrl}
                        className="flex-1 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-2 py-1 truncate text-gray-600 dark:text-gray-300 cursor-text"
                        onFocus={(e) => e.target.select()}
                      />
                      <button
                        onClick={() => copyUrl(img.url)}
                        className="shrink-0 p-1.5 rounded bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/50 text-green-600 dark:text-green-400 transition"
                        title="Copy URL"
                      >
                        {copiedUrl === img.url ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete([img.url])}
                        disabled={isDeleting}
                        className="shrink-0 p-1.5 rounded bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-500 transition disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-zinc-500">
          <ImageIcon className="h-16 w-16 mb-3" />
          <p className="text-lg">No images yet</p>
          <p className="text-sm">Drop files above to get started</p>
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
    </div>
  )
}
