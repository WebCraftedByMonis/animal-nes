'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Trash2, Check, X, Loader2, Eye, EyeOff, User } from 'lucide-react'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface Testimonial {
    id: number
    content: string
    isApproved: boolean
    isActive: boolean
    userId: string
    user: {
        id: string
        name: string | null
        email: string | null
        image: string | null
    }
    createdAt: string
    updatedAt: string
}

export default function ViewTestimonialsPage() {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([])
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)
    const [total, setTotal] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const [editId, setEditId] = useState<number | null>(null)
    const [editContent, setEditContent] = useState('')
    const [editIsApproved, setEditIsApproved] = useState(false)
    const [editIsActive, setEditIsActive] = useState(true)
    const [open, setOpen] = useState(false)

    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState<number | null>(null)
    const [isTogglingApproval, setIsTogglingApproval] = useState<number | null>(null)
    const [isTogglingActive, setIsTogglingActive] = useState<number | null>(null)

    const fetchTestimonials = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data } = await axios.get('/api/testimonials', {
                params: {
                    page,
                    limit,
                    showAll: true // Show all testimonials including unapproved
                },
            })
            setTestimonials(data.data)
            setTotal(data.pagination.total)
            setHasMore(data.pagination.hasMore)
        } catch (error) {
            console.log(error)
            toast.error('Failed to fetch testimonials')
        } finally {
            setIsLoading(false)
        }
    }, [page, limit])

    useEffect(() => {
        fetchTestimonials()
    }, [fetchTestimonials])

    const handleUpdate = async () => {
        if (!editId) return

        setIsUpdating(true)
        try {
            await axios.put('/api/testimonials', {
                id: editId,
                content: editContent,
                isApproved: editIsApproved,
                isActive: editIsActive,
            })
            toast.success('Testimonial updated successfully')
            setOpen(false)
            fetchTestimonials()
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update testimonial')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this testimonial?')) return

        setIsDeleting(id)
        try {
            await axios.delete('/api/testimonials', { params: { id } })
            toast.success('Testimonial deleted successfully')
            fetchTestimonials()
        } catch (error) {
            toast.error('Failed to delete testimonial')
        } finally {
            setIsDeleting(null)
        }
    }

    const handleToggleApproval = async (testimonial: Testimonial) => {
        setIsTogglingApproval(testimonial.id)
        try {
            await axios.put('/api/testimonials', {
                id: testimonial.id,
                isApproved: !testimonial.isApproved,
            })
            toast.success(
                testimonial.isApproved
                    ? 'Testimonial unapproved'
                    : 'Testimonial approved'
            )
            fetchTestimonials()
        } catch (error) {
            toast.error('Failed to update approval status')
        } finally {
            setIsTogglingApproval(null)
        }
    }

    const handleToggleActive = async (testimonial: Testimonial) => {
        setIsTogglingActive(testimonial.id)
        try {
            await axios.put('/api/testimonials', {
                id: testimonial.id,
                isActive: !testimonial.isActive,
            })
            toast.success(
                testimonial.isActive
                    ? 'Testimonial hidden'
                    : 'Testimonial activated'
            )
            fetchTestimonials()
        } catch (error) {
            toast.error('Failed to update active status')
        } finally {
            setIsTogglingActive(null)
        }
    }

    const getStatusBadge = (testimonial: Testimonial) => {
        if (!testimonial.isActive) {
            return <Badge variant="secondary">Hidden</Badge>
        }
        if (testimonial.isApproved) {
            return <Badge className="bg-green-500">Approved</Badge>
        }
        return <Badge className="bg-yellow-500">Pending</Badge>
    }

    return (
        <Suspense fallback={<TableSkeleton />}>
            <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-green-500">Testimonials Management</h1>
                    <div className="text-sm text-gray-600">
                        Total: {total} testimonials
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex gap-2 items-center">
                        <span>Show</span>
                        <Select value={String(limit)} onValueChange={(v) => {
                            setLimit(Number(v))
                            setPage(1) // Reset to first page when changing limit
                        }}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder="Show" />
                            </SelectTrigger>
                            <SelectContent>
                                {[10, 25, 50, 100].map((n) => (
                                    <SelectItem key={n} value={String(n)}>
                                        {n}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span>entries</span>
                    </div>
                </div>

                <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded shadow border border-zinc-200 dark:border-zinc-700">
                    {isLoading ? (
                        <TableSkeleton />
                    ) : (
                        <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                            <TableHeader className="bg-gray-100 dark:bg-zinc-800">
                                <TableRow>
                                    <TableHead className="px-4 py-2">S.No</TableHead>
                                    <TableHead className="px-4 py-2">User</TableHead>
                                    <TableHead className="px-4 py-2">Name</TableHead>
                                    <TableHead className="px-4 py-2">Email</TableHead>
                                    <TableHead className="px-4 py-2 max-w-md">Content</TableHead>
                                    <TableHead className="px-4 py-2">Status</TableHead>
                                    <TableHead className="px-4 py-2">Approval</TableHead>
                                    <TableHead className="px-4 py-2">Visibility</TableHead>
                                    <TableHead className="px-4 py-2">Created</TableHead>
                                    <TableHead className="px-4 py-2">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {testimonials.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                                            No testimonials found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    testimonials.map((testimonial, idx) => (
                                        <TableRow
                                            key={testimonial.id}
                                            className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}
                                        >
                                            <TableCell className="px-4 py-2">{(page - 1) * limit + idx + 1}</TableCell>
                                            <TableCell className="px-4 py-2">
                                                {testimonial.user.image ? (
                                                    <Image
                                                        src={testimonial.user.image}
                                                        alt={testimonial.user.name || 'User'}
                                                        width={40}
                                                        height={40}
                                                        className="rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                        <User className="h-5 w-5 text-gray-500" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-4 py-2">
                                                {testimonial.user.name || 'N/A'}
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-sm">
                                                {testimonial.user.email || 'N/A'}
                                            </TableCell>
                                            <TableCell className="px-4 py-2 max-w-md">
                                                <p className="truncate text-sm" title={testimonial.content}>
                                                    {testimonial.content}
                                                </p>
                                            </TableCell>
                                            <TableCell className="px-4 py-2">
                                                {getStatusBadge(testimonial)}
                                            </TableCell>
                                            <TableCell className="px-4 py-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleToggleApproval(testimonial)}
                                                    disabled={isTogglingApproval === testimonial.id}
                                                    className={testimonial.isApproved ? "bg-green-500 hover:bg-green-600" : ""}
                                                >
                                                    {isTogglingApproval === testimonial.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : testimonial.isApproved ? (
                                                        <>
                                                            <Check className="h-4 w-4 mr-1" />
                                                            Approved
                                                        </>
                                                    ) : (
                                                        <>
                                                            <X className="h-4 w-4 mr-1" />
                                                            Pending
                                                        </>
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="px-4 py-2">
                                                <Button
                                                    size="sm"
                                                    variant={testimonial.isActive ? "outline" : "secondary"}
                                                    onClick={() => handleToggleActive(testimonial)}
                                                    disabled={isTogglingActive === testimonial.id}
                                                >
                                                    {isTogglingActive === testimonial.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : testimonial.isActive ? (
                                                        <>
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            Visible
                                                        </>
                                                    ) : (
                                                        <>
                                                            <EyeOff className="h-4 w-4 mr-1" />
                                                            Hidden
                                                        </>
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-sm text-gray-600">
                                                {formatDistanceToNow(new Date(testimonial.createdAt), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="px-4 py-2">
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditId(testimonial.id)
                                                            setEditContent(testimonial.content)
                                                            setEditIsApproved(testimonial.isApproved)
                                                            setEditIsActive(testimonial.isActive)
                                                            setOpen(true)
                                                        }}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDelete(testimonial.id)}
                                                        disabled={isDeleting === testimonial.id}
                                                    >
                                                        {isDeleting === testimonial.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}

                    {!isLoading && total > limit && (
                        <div className="mt-4 px-4 py-2 flex justify-center items-center">
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                    variant="outline"
                                >
                                    Previous
                                </Button>
                                {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
                                    <Button
                                        key={p}
                                        size="sm"
                                        variant={p === page ? 'default' : 'outline'}
                                        onClick={() => setPage(p)}
                                        className={p === page ? 'bg-green-500 text-white hover:bg-green-600' : ''}
                                    >
                                        {p}
                                    </Button>
                                ))}
                                <Button
                                    size="sm"
                                    disabled={!hasMore}
                                    onClick={() => setPage(page + 1)}
                                    variant="outline"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Testimonial</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Content *</label>
                                <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    placeholder="Testimonial content..."
                                    rows={5}
                                    className="w-full"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="approval"
                                        checked={editIsApproved}
                                        onCheckedChange={setEditIsApproved}
                                    />
                                    <Label htmlFor="approval" className="cursor-pointer">
                                        Approved
                                    </Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="active"
                                        checked={editIsActive}
                                        onCheckedChange={setEditIsActive}
                                    />
                                    <Label htmlFor="active" className="cursor-pointer">
                                        Active (Visible)
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-4">
                            <Button
                                variant="ghost"
                                onClick={() => setOpen(false)}
                                disabled={isUpdating}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="bg-green-500 hover:bg-green-600"
                                onClick={handleUpdate}
                                disabled={isUpdating || !editContent.trim()}
                            >
                                {isUpdating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update Testimonial'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Suspense>
    )
}