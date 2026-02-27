'use client';

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Eye,
    ImageIcon,
    Link,
    CreditCard,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    Search
} from "lucide-react";
import toast from "react-hot-toast";
import { Switch } from "@/components/ui/switch";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import WhatsAppLink from "@/components/WhatsAppLink";

// Updated TypeScript interface to include payment info
interface PaymentInfo {
    id: number;
    consultationType: "needy" | "virtual" | "physical";
    consultationFee: number;
    paymentMethod: "jazzcash" | "easypaisa" | "bank" | "cod" | null;
    screenshotUrl?: string;
    screenshotPublicId?: string;
    createdAt: string;
}

interface AppointmentRequest {
    id: number;
    doctor: string;
    city: string;
    species: string;
    state?: string;
    fullAddress?: string;
    gender: "MALE" | "FEMALE";
    appointmentAt: string;
    isEmergency: boolean;
    description: string;
    status: "APPROVED" | "REJECTED" | "PENDING";
    country?: string;
    customer: {
        name: string;
        email: string;
    };
    paymentInfo?: PaymentInfo;
    historyForm?: { id: number };
}

export default function DashboardPage() {
    const [appointments, setAppointments] = useState<AppointmentRequest[]>([]);
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState("appointmentAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [deleting, setDeleting] = useState(false);

    const fetchData = useCallback(async (searchTerm = '', pageNum = page, limitNum = limit, sortF = sortField, sortO = sortOrder) => {
        try {
            setLoading(true);
            const res = await fetch(
                `/api/appointments/list?q=${searchTerm}&limit=${limitNum}&page=${pageNum}&sortBy=${sortF}&sortOrder=${sortO}`
            );
            
            if (!res.ok) {
                console.error('API Error:', res.status, res.statusText);
                const errorData = await res.json().catch(() => ({}));
                console.error('Error details:', errorData);
                toast.error(`Failed to load appointments: ${res.status} ${res.statusText}`);
                return;
            }
            
            const json = await res.json();
            console.log('API Response:', json);
            
            if (json.data) {
                setAppointments(json.data);
                setTotal(json.total || 0);
            } else {
                console.error('Invalid API response structure:', json);
                toast.error("Invalid response from server");
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error("Failed to load appointments");
        } finally {
            setLoading(false);
        }
    }, [page, limit, sortField, sortOrder]);

    const handleStatusChange = async (id: number, status: "APPROVED" | "REJECTED") => {
        setUpdatingStatus(id);
        const toastId = toast.loading(`Updating status to ${status.toLowerCase()}...`);
        
        try {
            const res = await fetch(`/api/appointments/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status }),
            });
            
            if (res.ok) {
                const result = await res.json();
                toast.success(result.message || "Status updated successfully", { id: toastId });
                fetchData();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to update status", { id: toastId });
            }
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error("Network error - failed to update status", { id: toastId });
        } finally {
            setUpdatingStatus(null);
        }
    };

    const toggleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
    };

    const handleImageClick = (imageUrl: string) => {
        setSelectedImage(imageUrl);
        setImageDialogOpen(true);
    };

    const getPaymentBadgeColor = (method: string | null) => {
        if (!method) return 'bg-gray-100 text-gray-800';
        switch (method) {
            case 'jazzcash':
                return 'bg-blue-100 text-blue-800';
            case 'easypaisa':
                return 'bg-green-100 text-green-800';
            case 'bank':
                return 'bg-purple-100 text-purple-800';
            case 'cod':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getConsultationTypeBadge = (type: string, fee: number) => {
        switch (type) {
            case 'needy':
                return <Badge className="bg-gray-100 text-gray-800">Free</Badge>;
            case 'virtual':
                return <Badge className="bg-blue-100 text-blue-800">Virtual (₨{fee})</Badge>;
            case 'physical':
                return <Badge className="bg-green-100 text-green-800">Physical (₨{fee})</Badge>;
            default:
                return <Badge>N/A</Badge>;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'REJECTED':
                return <XCircle className="h-4 w-4 text-red-600" />;
            default:
                return <Clock className="h-4 w-4 text-yellow-600" />;
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchData(search, 1, limit, sortField, sortOrder);
    };

    const resetFilters = () => {
        setSearch("");
        setPage(1);
        fetchData('', 1, limit, sortField, sortOrder);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(appointments.map(a => a.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) {
            toast.error('Please select at least one appointment to delete');
            return;
        }

        const confirmMessage = `Are you sure you want to delete ${selectedIds.length} appointment(s)? This will also delete related payment info, history forms, and transactions. This action cannot be undone.`;
        if (!confirm(confirmMessage)) {
            return;
        }

        setDeleting(true);
        const toastId = toast.loading(`Deleting ${selectedIds.length} appointment(s)...`);

        try {
            const response = await fetch('/api/appointments', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: selectedIds }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || 'Appointments deleted successfully', { id: toastId });
                setSelectedIds([]);
                fetchData();
            } else {
                toast.error(data.error || 'Failed to delete appointments', { id: toastId });
            }
        } catch (error) {
            console.error('Error deleting appointments:', error);
            toast.error('An error occurred while deleting appointments', { id: toastId });
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteSingle = async (id: number) => {
        const confirmMessage = 'Are you sure you want to delete this appointment? This will also delete related payment info, history form, and transactions. This action cannot be undone.';
        if (!confirm(confirmMessage)) {
            return;
        }

        setDeleting(true);
        const toastId = toast.loading('Deleting appointment...');

        try {
            const response = await fetch(`/api/appointments/${id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || 'Appointment deleted successfully', { id: toastId });
                setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
                fetchData();
            } else {
                toast.error(data.error || 'Failed to delete appointment', { id: toastId });
            }
        } catch (error) {
            console.error('Error deleting appointment:', error);
            toast.error('An error occurred while deleting the appointment', { id: toastId });
        } finally {
            setDeleting(false);
        }
    };

    // Load initial data on component mount
    useEffect(() => {
        fetchData('', 1, limit, sortField, sortOrder);
    }, [limit, sortField, sortOrder]);

    // Handle page changes - maintain current search
    useEffect(() => {
        if (page > 1) {
            fetchData(search, page, limit, sortField, sortOrder);
        }
    }, [page]);

    const totalPages = Math.ceil(total / limit);

    // Group appointments by date for the last 30 days
    const appointmentChartData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const label = date.toLocaleDateString("en-US", { day: "numeric", month: "short" });

        const count = appointments?.filter(
            (a) => new Date(a.appointmentAt).toDateString() === date.toDateString()
        ).length || 0;

        return { name: label, appointments: count };
    }).reverse();

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-green-500 mb-6">Appointment & Payment Dashboard</h1>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 flex-1 max-w-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search by name, email, phone, city, species, description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 focus:border-green-500 focus:ring-green-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <Button
                        onClick={handleSearch}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={loading}
                    >
                        <Search className="w-4 h-4" />
                    </Button>
                    <Button
                        onClick={resetFilters}
                        variant="outline"
                        className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        disabled={loading}
                    >
                        Clear
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                        <Button
                            onClick={handleDeleteSelected}
                            disabled={deleting}
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Delete Selected ({selectedIds.length})
                        </Button>
                    )}
                    <Select value={limit.toString()} onValueChange={(val) => {
                        const newLimit = Number(val);
                        setLimit(newLimit);
                        setPage(1);
                        fetchData(search, 1, newLimit, sortField, sortOrder);
                    }}>
                        <SelectTrigger className="w-32 focus:border-green-500 focus:ring-green-500">
                            <SelectValue placeholder="Entries" />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 25, 50].map((n) => (
                                <SelectItem key={n} value={n.toString()}>{n} entries</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-xl overflow-x-auto border bg-white">
                {loading && (
                    <div className="text-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin inline-block text-green-600" />
                        <span className="ml-2 text-gray-600">Loading appointments...</span>
                    </div>
                )}
                
                {!loading && appointments?.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No appointments found. Try adjusting your search criteria.
                    </div>
                )}
                
                {!loading && appointments?.length > 0 && (
                <Table>
                    <TableHeader>
                        <TableRow className="bg-green-100">
                            <TableHead className="font-semibold w-12">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === appointments.length && appointments.length > 0}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                            </TableHead>
                            <TableHead className="font-semibold">Customer</TableHead>
                            <TableHead className="font-semibold">Contact</TableHead>
                            <TableHead className="font-semibold">Location</TableHead>
                            <TableHead className="font-semibold">Country</TableHead>
                            <TableHead className="font-semibold">Animal</TableHead>
                            <TableHead className="font-semibold">Consultation</TableHead>
                            <TableHead className="font-semibold">Payment</TableHead>
                            <TableHead className="font-semibold">Screenshot</TableHead>
                            <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort("isEmergency")}>
                                Emergency <ArrowUpDown className="inline h-3 w-3" />
                            </TableHead>
                            <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort("appointmentAt")}>
                                Requested Date <ArrowUpDown className="inline h-3 w-3" />
                            </TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading
                            ? Array(limit).fill(null).map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(12)].map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                            : appointments?.map((a) => (
                                <TableRow key={a.id} className="hover:bg-gray-50">
                                    {/* Checkbox */}
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(a.id)}
                                            onChange={(e) => handleSelectOne(a.id, e.target.checked)}
                                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                        />
                                    </TableCell>

                                    {/* Customer Info */}
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{a.customer?.name || "N/A"}</p>
                                            <p className="text-xs text-gray-500">{a.customer?.email || "N/A"}</p>
                                        </div>
                                    </TableCell>

                                    {/* Contact */}
                                    <TableCell>
                                        <WhatsAppLink phone={a.doctor || ''} className="text-sm" />
                                    </TableCell>

                                    {/* Location */}
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{a.city}</p>
                                            <p className="text-xs text-gray-500">{a.state || "-"}</p>
                                        </div>
                                    </TableCell>

                                    {/* Country */}
                                    <TableCell>
                                        <Badge variant="outline" className={a.country === 'UAE' ? 'border-blue-500 text-blue-600' : 'border-green-500 text-green-600'}>
                                            {a.country || 'Pakistan'}
                                        </Badge>
                                    </TableCell>

                                    {/* Animal */}
                                    <TableCell>
                                        <div>
                                            <p className="text-sm">{a.species}</p>
                                            <p className="text-xs text-gray-500">{a.gender}</p>
                                        </div>
                                    </TableCell>

                                    {/* Consultation Type */}
                                    <TableCell>
                                        {a.paymentInfo ? (
                                            getConsultationTypeBadge(
                                                a.paymentInfo.consultationType,
                                                a.paymentInfo.consultationFee
                                            )
                                        ) : (
                                            <Badge variant="outline">No Payment</Badge>
                                        )}
                                    </TableCell>

                                    {/* Payment Method */}
                                    <TableCell>
                                        {a.paymentInfo && a.paymentInfo.paymentMethod ? (
                                            <Badge className={getPaymentBadgeColor(a.paymentInfo.paymentMethod)}>
                                                <CreditCard className="h-3 w-3 mr-1" />
                                                {a.paymentInfo.paymentMethod.toUpperCase()}
                                            </Badge>
                                        ) : a.paymentInfo && a.paymentInfo.consultationType === 'needy' ? (
                                            <Badge className="bg-green-100 text-green-800">
                                                <span className="text-xs">FREE</span>
                                            </Badge>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </TableCell>

                                    {/* Screenshot */}
                                    <TableCell>
                                        {a.paymentInfo?.screenshotUrl ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleImageClick(a.paymentInfo!.screenshotUrl!)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                        ) : a.paymentInfo?.paymentMethod === 'cod' ? (
                                            <span className="text-xs text-gray-500">COD</span>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </TableCell>

                                    {/* Emergency */}
                                    <TableCell>
                                        {a.isEmergency ? (
                                            <Badge variant="destructive">Yes</Badge>
                                        ) : (
                                            <span className="text-sm text-gray-500">No</span>
                                        )}
                                    </TableCell>

                                    {/* Requested Appointment Date */}
                                    <TableCell>
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md px-2 py-1 inline-block">
                                            <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                                {new Date(a.appointmentAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            <p className="text-xs text-green-600 dark:text-green-400">
                                                {new Date(a.appointmentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Switch
                                                    checked={a.status === "APPROVED"}
                                                    disabled={updatingStatus === a.id}
                                                    onCheckedChange={(checked) =>
                                                        handleStatusChange(a.id, checked ? "APPROVED" : "REJECTED")
                                                    }
                                                />
                                                {updatingStatus === a.id && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {updatingStatus === a.id ? (
                                                    <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
                                                ) : (
                                                    getStatusIcon(a.status)
                                                )}
                                                <span className={`text-sm font-medium ${
                                                    updatingStatus === a.id ? "text-blue-600" :
                                                    a.status === "APPROVED" ? "text-green-600" :
                                                    a.status === "REJECTED" ? "text-red-600" :
                                                    "text-yellow-600"
                                                }`}>
                                                    {updatingStatus === a.id ? "Updating..." : a.status}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(`/historyform?appointmentId=${a.id}`, '_blank')}
                                                title="History Form"
                                            >
                                                <Link className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    if (a.historyForm?.id) {
                                                        window.open(`/prescriptionform?historyFormId=${a.historyForm.id}`, '_blank');
                                                    } else {
                                                        toast.error('Please fill history form first');
                                                    }
                                                }}
                                                title="Prescription"
                                                disabled={!a.historyForm}
                                            >
                                                <Link className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteSingle(a.id)}
                                                disabled={deleting}
                                                title="Delete Appointment"
                                            >
                                                {deleting ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <XCircle className="h-3 w-3" />
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
                )}
            </div>

            {/* Image Preview Dialog */}
            <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Payment Screenshot</DialogTitle>
                    </DialogHeader>
                    {selectedImage && (
                        <div className="relative w-full h-[600px]">
                            <Image
                                src={selectedImage}
                                alt="Payment Screenshot"
                                fill
                                className="object-contain"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Pagination */}
            {!loading && appointments?.length > 0 && (
                <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-600">
                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} appointments
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="text-sm font-medium px-2">
                            Page {page} of {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                            className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Chart */}
            <div className="mt-8">
                <h2 className="text-lg font-medium mb-2 text-green-600">
                    Appointments in the Last 30 Days
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={appointmentChartData}>
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line
                            type="monotone"
                            dataKey="appointments"
                            stroke="#22c55e"
                            strokeWidth={2}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}