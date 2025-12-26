'use client';

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChevronLeft,
    ChevronRight,
    Eye,
    CreditCard,
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    Loader2,
    ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { format } from "date-fns";

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

interface Partner {
    id: number;
    partnerName: string;
    partnerEmail: string;
}

export default function PartnerAdditionalConsultationFeesPage() {
    const router = useRouter();
    const [partner, setPartner] = useState<Partner | null>(null);
    const [fees, setFees] = useState<AdditionalConsultationFee[]>([]);
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageDialogOpen, setImageDialogOpen] = useState(false);

    // Check partner authentication
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/partner/check-auth');
                const data = await response.json();

                if (response.ok && data.authenticated) {
                    setPartner(data.partner);
                } else {
                    router.push('/partner/login');
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                router.push('/partner/login');
            } finally {
                setAuthLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    const fetchData = async () => {
        if (!partner) return;

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

            // Filter by partner's name
            const filtered = (json.data || []).filter(
                (fee: AdditionalConsultationFee) => fee.prescription.doctorName === partner.partnerName
            );

            setFees(filtered);
            setTotal(filtered.length);
        } catch {
            toast.error("Failed to load additional consultation fees");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (partner) {
            fetchData();
        }
    }, [partner, page, limit, statusFilter, search]);

    const handleViewImage = (url: string) => {
        setSelectedImage(url);
        setImageDialogOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
            case 'PAID':
                return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>;
            case 'CANCELLED':
                return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getPaymentMethodBadge = (method: string) => {
        const colors: Record<string, string> = {
            jazzcash: 'bg-purple-100 text-purple-800',
            easypaisa: 'bg-blue-100 text-blue-800',
            bank: 'bg-gray-100 text-gray-800',
            cod: 'bg-orange-100 text-orange-800'
        };
        return (
            <Badge variant="secondary" className={colors[method] || ''}>
                <CreditCard className="h-3 w-3 mr-1" />
                {method.toUpperCase()}
            </Badge>
        );
    };

    // Stats calculations
    const totalRevenue = fees.reduce((sum, fee) => sum + fee.consultationFee, 0);
    const pendingFees = fees.filter(f => f.status === 'PENDING');
    const paidFees = fees.filter(f => f.status === 'PAID');

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    if (!partner) {
        return null;
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Link href="/partner/dashboard">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold text-green-600">My Consultation Fees</h1>
                    </div>
                    <p className="text-gray-600 mt-1">Track and manage your additional consultation fees</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <DollarSign className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold">Rs. {totalRevenue.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <CreditCard className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Fees</p>
                                <p className="text-2xl font-bold">{fees.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-100 rounded-lg">
                                <Clock className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Pending</p>
                                <p className="text-2xl font-bold">{pendingFees.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Paid</p>
                                <p className="text-2xl font-bold">{paidFees.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Search & Filter</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by patient name, description..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(value) => {
                            setStatusFilter(value);
                            setPage(1);
                        }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="PAID">Paid</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={limit.toString()} onValueChange={(value) => setLimit(Number(value))}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 rows</SelectItem>
                                <SelectItem value="25">25 rows</SelectItem>
                                <SelectItem value="50">50 rows</SelectItem>
                                <SelectItem value="100">100 rows</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Consultation Fee Records</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : fees.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No consultation fees found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Patient</TableHead>
                                            <TableHead>Animal</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Payment</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Screenshot</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fees.map((fee) => (
                                            <TableRow key={fee.id}>
                                                <TableCell>#{fee.id}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {format(new Date(fee.createdAt), 'PP')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{fee.prescription.ownerName}</div>
                                                    <div className="text-xs text-gray-500">{fee.prescription.ownerContact}</div>
                                                </TableCell>
                                                <TableCell>{fee.prescription.animalSpecies}</TableCell>
                                                <TableCell>
                                                    <div className="max-w-xs truncate" title={fee.feeDescription}>
                                                        {fee.feeDescription}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-semibold text-green-600">
                                                    Rs. {fee.consultationFee.toLocaleString()}
                                                </TableCell>
                                                <TableCell>{getPaymentMethodBadge(fee.paymentMethod)}</TableCell>
                                                <TableCell>{getStatusBadge(fee.status)}</TableCell>
                                                <TableCell>
                                                    {fee.screenshotUrl ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewImage(fee.screenshotUrl!)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">No screenshot</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-gray-600">
                                    Showing {fees.length} of {total} consultation fees
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={fees.length < limit}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Image Dialog */}
            <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Payment Screenshot</DialogTitle>
                    </DialogHeader>
                    {selectedImage && (
                        <div className="relative w-full h-[500px]">
                            <Image
                                src={selectedImage}
                                alt="Payment screenshot"
                                fill
                                className="object-contain"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
