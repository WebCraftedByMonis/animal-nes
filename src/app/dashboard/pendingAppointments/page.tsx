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
    ImageIcon,
    Link,
    CreditCard,
    CheckCircle,
    XCircle,
    Clock
} from "lucide-react";
import toast from "react-hot-toast";
import { Switch } from "@/components/ui/switch";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Updated TypeScript interface to include payment info
interface PaymentInfo {
    id: number;
    consultationType: "needy" | "virtual" | "physical";
    consultationFee: number;
    paymentMethod: "jazzcash" | "easypaisa" | "bank" | "cod";
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

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(
                `/api/appointments/list?q=${search}&limit=${limit}&page=${page}&sortBy=${sortField}&sortOrder=${sortOrder}`
            );
            const json = await res.json();
            setAppointments(json.data);
            setTotal(json.total);
        } catch {
            toast.error("Failed to load appointments");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: number, status: "APPROVED" | "REJECTED") => {
        const res = await fetch(`/api/appointments/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        });
        if (res.ok) {
            toast.success("Status updated");
            fetchData();
        } else {
            toast.error("Failed to update status");
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

    useEffect(() => {
        fetchData();
    }, [search, page, limit, sortField, sortOrder]);

    const totalPages = Math.ceil(total / limit);

    // Group appointments by date for the last 30 days
    const appointmentChartData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const label = date.toLocaleDateString("en-US", { day: "numeric", month: "short" });

        const count = appointments.filter(
            (a) => new Date(a.appointmentAt).toDateString() === date.toDateString()
        ).length;

        return { name: label, appointments: count };
    }).reverse();

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-green-500 mb-6">Appointment & Payment Dashboard</h1>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <Input
                    placeholder="Search name, phone, city, species..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />

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

            <div className="rounded-xl overflow-x-auto border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-green-100">
                            <TableHead className="font-semibold">Customer</TableHead>
                            <TableHead className="font-semibold">Contact</TableHead>
                            <TableHead className="font-semibold">Location</TableHead>
                            <TableHead className="font-semibold">Animal</TableHead>
                            <TableHead className="font-semibold">Consultation</TableHead>
                            <TableHead className="font-semibold">Payment</TableHead>
                            <TableHead className="font-semibold">Screenshot</TableHead>
                            <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort("isEmergency")}>
                                Emergency <ArrowUpDown className="inline h-3 w-3" />
                            </TableHead>
                            <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort("appointmentAt")}>
                                Date/Time <ArrowUpDown className="inline h-3 w-3" />
                            </TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
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
                            : appointments.map((a) => (
                                <TableRow key={a.id} className="hover:bg-gray-50">
                                    {/* Customer Info */}
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{a.customer?.name || "N/A"}</p>
                                            <p className="text-xs text-gray-500">{a.customer?.email || "N/A"}</p>
                                        </div>
                                    </TableCell>

                                    {/* Contact */}
                                    <TableCell>
                                        <p className="text-sm">{a.doctor}</p>
                                    </TableCell>

                                    {/* Location */}
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{a.city}</p>
                                            <p className="text-xs text-gray-500">{a.state || "Pakistan"}</p>
                                        </div>
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
                                        {a.paymentInfo ? (
                                            <Badge className={getPaymentBadgeColor(a.paymentInfo.paymentMethod)}>
                                                <CreditCard className="h-3 w-3 mr-1" />
                                                {a.paymentInfo.paymentMethod.toUpperCase()}
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

                                    {/* Date/Time */}
                                    <TableCell>
                                        <div>
                                            <p className="text-sm">{new Date(a.appointmentAt).toLocaleDateString()}</p>
                                            <p className="text-xs text-gray-500">{new Date(a.appointmentAt).toLocaleTimeString()}</p>
                                        </div>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={a.status === "APPROVED"}
                                                onCheckedChange={(checked) =>
                                                    handleStatusChange(a.id, checked ? "APPROVED" : "REJECTED")
                                                }
                                            />
                                            <div className="flex items-center gap-1">
                                                {getStatusIcon(a.status)}
                                                <span className={`text-sm font-medium ${a.status === "APPROVED" ? "text-green-600" :
                                                        a.status === "REJECTED" ? "text-red-600" :
                                                            "text-yellow-600"
                                                    }`}>
                                                    {a.status}
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
                                        </div>
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