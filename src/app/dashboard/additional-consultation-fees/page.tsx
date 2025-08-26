'use client';

import { useEffect, useState } from "react";
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
    CreditCard,
    CheckCircle,
    XCircle,
    Clock,
    DollarSign
} from "lucide-react";
import toast from "react-hot-toast";
import { Switch } from "@/components/ui/switch";

// TypeScript interfaces
interface AdditionalConsultationFee {
    id: number;
    consultationFee: number;
    feeDescription: string;
    paymentMethod: "jazzcash" | "easypaisa" | "bank" | "cod";
    screenshotUrl?: string;
    screenshotPublicId?: string;
    status: "PENDING" | "PAID" | "CANCELLED";
    createdAt: string;
    prescription: {
        id: number;
        doctorName: string;
        ownerName: string;
        ownerContact: string;
        animalSpecies: string;
        historyForm: {
            appointment: {
                customer: {
                    name: string;
                    email: string;
                };
            };
        };
    };
}

export default function AdditionalConsultationFeesPage() {
    const [fees, setFees] = useState<AdditionalConsultationFee[]>([]);
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageDialogOpen, setImageDialogOpen] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                q: search,
                limit: limit.toString(),
                page: page.toString()
            });
            
            if (statusFilter && statusFilter !== 'ALL') {
                params.append('status', statusFilter);
            }
            
            const res = await fetch(`/api/additional-consultation-fee?${params}`);
            const json = await res.json();
            setFees(json.data);
            setTotal(json.total);
        } catch {
            toast.error("Failed to load additional consultation fees");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: number, status: "PAID" | "CANCELLED") => {
        try {
            const res = await fetch(`/api/additional-consultation-fee/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            
            if (res.ok) {
                toast.success("Status updated");
                fetchData();
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleImageClick = (imageUrl: string) => {
        setSelectedImage(imageUrl);
        setImageDialogOpen(true);
    };

    const getPaymentBadgeColor = (method: string) => {
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
            case 'CANCELLED':
                return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
            default:
                return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PAID':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'CANCELLED':
                return <XCircle className="h-4 w-4 text-red-600" />;
            default:
                return <Clock className="h-4 w-4 text-yellow-600" />;
        }
    };

    useEffect(() => {
        fetchData();
    }, [search, page, limit, statusFilter]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-green-500 mb-6">Additional Consultation Fees Dashboard</h1>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <Input
                    placeholder="Search patient name, doctor, description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />

                <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={limit.toString()} onValueChange={(val) => setLimit(Number(val))}>
                        <SelectTrigger className="w-28">
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
                <Table>
                    <TableHeader>
                        <TableRow className="bg-green-100">
                            <TableHead className="font-semibold">Patient</TableHead>
                            <TableHead className="font-semibold">Doctor</TableHead>
                            <TableHead className="font-semibold">Contact</TableHead>
                            <TableHead className="font-semibold">Animal</TableHead>
                            <TableHead className="font-semibold">Fee Amount</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="font-semibold">Payment Method</TableHead>
                            <TableHead className="font-semibold">Screenshot</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading
                            ? Array(limit).fill(null).map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(11)].map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                            : fees.map((fee) => (
                                <TableRow key={fee.id} className="hover:bg-gray-50">
                                    {/* Patient Info */}
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{fee.prescription.ownerName}</p>
                                            <p className="text-xs text-gray-500">{fee.prescription.historyForm?.appointment?.customer?.email || 'N/A'}</p>
                                        </div>
                                    </TableCell>

                                    {/* Doctor */}
                                    <TableCell>
                                        <p className="text-sm">{fee.prescription.doctorName}</p>
                                    </TableCell>

                                    {/* Contact */}
                                    <TableCell>
                                        <p className="text-sm">{fee.prescription.ownerContact}</p>
                                    </TableCell>

                                    {/* Animal */}
                                    <TableCell>
                                        <p className="text-sm">{fee.prescription.animalSpecies}</p>
                                    </TableCell>

                                    {/* Fee Amount */}
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="h-4 w-4 text-green-600" />
                                            <span className="font-semibold text-green-600">₨{fee.consultationFee}</span>
                                        </div>
                                    </TableCell>

                                    {/* Description */}
                                    <TableCell>
                                        <p className="text-sm max-w-xs truncate" title={fee.feeDescription}>
                                            {fee.feeDescription}
                                        </p>
                                    </TableCell>

                                    {/* Payment Method */}
                                    <TableCell>
                                        <Badge className={getPaymentBadgeColor(fee.paymentMethod)}>
                                            <CreditCard className="h-3 w-3 mr-1" />
                                            {fee.paymentMethod.toUpperCase()}
                                        </Badge>
                                    </TableCell>

                                    {/* Screenshot */}
                                    <TableCell>
                                        {fee.screenshotUrl ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleImageClick(fee.screenshotUrl!)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                        ) : fee.paymentMethod === 'cod' ? (
                                            <span className="text-xs text-gray-500">COD</span>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(fee.status)}
                                            {getStatusBadge(fee.status)}
                                        </div>
                                    </TableCell>

                                    {/* Date */}
                                    <TableCell>
                                        <p className="text-sm">{new Date(fee.createdAt).toLocaleDateString()}</p>
                                        <p className="text-xs text-gray-500">{new Date(fee.createdAt).toLocaleTimeString()}</p>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell>
                                        {fee.status === 'PENDING' && (
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleStatusChange(fee.id, 'PAID')}
                                                    className="text-green-600 hover:text-green-700"
                                                >
                                                    Mark Paid
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleStatusChange(fee.id, 'CANCELLED')}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
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
            <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-600">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-sm font-medium">{page}</div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-yellow-500" />
                        <div>
                            <p className="text-sm text-gray-600">Pending Fees</p>
                            <p className="text-2xl font-bold">{fees.filter(f => f.status === 'PENDING').length}</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                        <div>
                            <p className="text-sm text-gray-600">Paid Fees</p>
                            <p className="text-2xl font-bold">{fees.filter(f => f.status === 'PAID').length}</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <DollarSign className="h-8 w-8 text-blue-500" />
                        <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold">
                                ₨{fees.filter(f => f.status === 'PAID').reduce((sum, f) => sum + f.consultationFee, 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}