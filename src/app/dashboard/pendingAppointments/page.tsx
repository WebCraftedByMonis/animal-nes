'use client';

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import toast from "react-hot-toast";
import { Switch } from "@/components/ui/switch";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";


// ✅ Define the TypeScript interface
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

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(
                `/api/appointments/list?q=${search}&limit=${limit}&page=${page}&sort=${sortField}&order=${sortOrder}`
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
        <div className="p-6 ">
            <h1 className="text-3xl font-bold text-green-500 mb-6">Your Appointment Requests</h1>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <Input
                    placeholder="Search doctor, species, city..."
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

            <div className="rounded-xl overflow-hidden border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-green-100 text-green-800">
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>

                            <TableHead>Doctor</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>Species</TableHead>
                            <TableHead>State</TableHead>
                            <TableHead>Address</TableHead>

                            <TableHead className="cursor-pointer" onClick={() => toggleSort("isEmergency")}>
                                Emergency <ArrowUpDown className="inline h-4 w-4" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleSort("appointmentAt")}>
                                Time <ArrowUpDown className="inline h-4 w-4" />
                            </TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading
                            ? Array(limit).fill(null).map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(6)].map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                            : appointments.map((a) => (
                                <TableRow key={a.id}>
                                    <TableCell>{a.customer?.name || "N/A"}</TableCell>
                                    <TableCell>{a.customer?.email || "N/A"}</TableCell>

                                    <TableCell>{a.doctor}</TableCell>
                                    <TableCell>{a.city}</TableCell>
                                    <TableCell>{a.species}</TableCell>
                                    <TableCell>{a.state || "N/A"}</TableCell>
                                    <TableCell>{a.fullAddress || "N/A"}</TableCell>

                                    <TableCell>{a.isEmergency ? "Yes" : "No"}</TableCell>
                                    <TableCell>{new Date(a.appointmentAt).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={a.status === "APPROVED"}
                                                onCheckedChange={(checked) =>
                                                    handleStatusChange(a.id, checked ? "APPROVED" : "REJECTED")
                                                }
                                            />
                                            <span className={`text-sm ${a.status === "APPROVED" ? "text-green-600" : "text-red-500"}`}>
                                                {a.status}
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-600">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-sm font-medium">{page}</div>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
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
