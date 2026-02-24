'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import { useCountry } from "@/contexts/CountryContext";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calculator, DollarSign, TrendingUp, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Distribution {
    id: number;
    partner: { id: number; name: string; partnerType: string; sharePercentage: number };
    periodStart: string;
    periodEnd: string;
    totalRevenue: number;
    shareAmount: number;
    status: string;
    paymentDate?: string;
    paymentMethod?: string;
    notes?: string;
    createdAt: string;
}

interface BusinessPartner {
    id: number;
    name: string;
    partnerType: string;
    sharePercentage: number;
}

interface Calculation {
    partnerId: number;
    partnerName: string;
    sharePercentage: number;
    totalRevenue: number;
    shareAmount: number;
    periodStart: Date;
    periodEnd: Date;
}

export default function DistributionsPage() {
    const { country, currencySymbol } = useCountry();
    const [distributions, setDistributions] = useState<Distribution[]>([]);
    const [partners, setPartners] = useState<BusinessPartner[]>([]);
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    const [isCalculateDialogOpen, setIsCalculateDialogOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [calculations, setCalculations] = useState<Calculation[]>([]);
    const [calculating, setCalculating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedDistribution, setSelectedDistribution] = useState<Distribution | null>(null);

    const [calcFormData, setCalcFormData] = useState({
        periodStart: "",
        periodEnd: "",
        partnerId: "",
    });

    const [paymentFormData, setPaymentFormData] = useState({
        status: "COMPLETED",
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: "",
        notes: "",
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ limit: limit.toString(), page: page.toString() });
            if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);

            const [distRes, partRes] = await Promise.all([
                axios.get(`/api/finance/distributions?${params}`),
                axios.get(`/api/finance/business-partners?limit=1000&isActive=true`),
            ]);

            setDistributions(distRes.data.data);
            setTotal(distRes.data.total);
            setPartners(partRes.data.data);
        } catch (error) {
            toast.error("Failed to load distributions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, limit, statusFilter]);

    const handleCalculate = async () => {
        if (!calcFormData.periodStart || !calcFormData.periodEnd) {
            toast.error("Please select period dates");
            return;
        }

        try {
            setCalculating(true);
            const res = await axios.post("/api/finance/distributions", {
                action: "calculate",
                periodStart: calcFormData.periodStart,
                periodEnd: calcFormData.periodEnd,
                partnerId: calcFormData.partnerId ? parseInt(calcFormData.partnerId) : undefined,
                country,
            });

            setCalculations(res.data.calculations);
            toast.success("Calculations complete!");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to calculate distributions");
        } finally {
            setCalculating(false);
        }
    };

    const handleCreateDistributions = async () => {
        if (calculations.length === 0) {
            toast.error("No calculations to create");
            return;
        }

        try {
            setSubmitting(true);
            const promises = calculations.map((calc) =>
                axios.post("/api/finance/distributions", {
                    partnerId: calc.partnerId,
                    periodStart: calc.periodStart,
                    periodEnd: calc.periodEnd,
                    totalRevenue: calc.totalRevenue,
                    shareAmount: calc.shareAmount,
                    status: "PENDING",
                })
            );

            await Promise.all(promises);
            toast.success("Distributions created successfully!");
            setIsCalculateDialogOpen(false);
            setCalculations([]);
            setCalcFormData({ periodStart: "", periodEnd: "", partnerId: "" });
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to create distributions");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdatePayment = async () => {
        if (!selectedDistribution) return;

        try {
            setSubmitting(true);
            await axios.put("/api/finance/distributions", {
                id: selectedDistribution.id,
                ...paymentFormData,
            });

            toast.success("Payment status updated!");
            setIsPaymentDialogOpen(false);
            setSelectedDistribution(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to update payment");
        } finally {
            setSubmitting(false);
        }
    };

    const openPaymentDialog = (dist: Distribution) => {
        setSelectedDistribution(dist);
        setPaymentFormData({
            status: dist.status,
            paymentDate: dist.paymentDate ? new Date(dist.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            paymentMethod: dist.paymentMethod || "",
            notes: dist.notes || "",
        });
        setIsPaymentDialogOpen(true);
    };

    const getStatusBadge = (status: string) => {
        const config: any = {
            PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
            COMPLETED: { color: "bg-green-100 text-green-800", icon: CheckCircle },
            CANCELLED: { color: "bg-red-100 text-red-800", icon: XCircle },
        };
        const { color, icon: Icon } = config[status] || config.PENDING;
        return (
            <Badge className={color}>
                <Icon className="w-3 h-3 mr-1" />
                {status}
            </Badge>
        );
    };

    const totalPages = Math.ceil(total / limit);
    const pendingAmount = distributions.filter(d => d.status === "PENDING").reduce((sum, d) => sum + d.shareAmount, 0);
    const completedAmount = distributions.filter(d => d.status === "COMPLETED").reduce((sum, d) => sum + d.shareAmount, 0);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-green-500">Partner Distributions</h1>
                <Button onClick={() => setIsCalculateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Distributions
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Pending Distributions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3">
                            <Clock className="h-8 w-8 text-yellow-500" />
                            <div>
                                <p className="text-2xl font-bold text-yellow-600">{currencySymbol}{pendingAmount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{distributions.filter(d => d.status === "PENDING").length} pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Completed Distributions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold text-green-600">{currencySymbol}{completedAmount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{distributions.filter(d => d.status === "COMPLETED").length} completed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Active Partners</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-blue-500" />
                            <div>
                                <p className="text-2xl font-bold">{partners.length}</p>
                                <p className="text-xs text-gray-500">Total share: {partners.reduce((sum, p) => sum + p.sharePercentage, 0).toFixed(1)}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end gap-2 mb-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={limit.toString()} onValueChange={(val) => setLimit(Number(val))}>
                    <SelectTrigger className="w-28">
                        <SelectValue />
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
                        <TableRow className="bg-blue-100">
                            <TableHead className="font-semibold">Partner</TableHead>
                            <TableHead className="font-semibold">Period</TableHead>
                            <TableHead className="font-semibold">Total Revenue</TableHead>
                            <TableHead className="font-semibold">Share %</TableHead>
                            <TableHead className="font-semibold">Share Amount</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Payment Date</TableHead>
                            <TableHead className="font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? Array(limit).fill(null).map((_, i) => (
                            <TableRow key={i}>
                                {[...Array(8)].map((_, j) => (
                                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                ))}
                            </TableRow>
                        )) : distributions.map((dist) => (
                            <TableRow key={dist.id} className="hover:bg-gray-50">
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{dist.partner.name}</p>
                                        <p className="text-xs text-gray-500">{dist.partner.partnerType}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div>
                                        <p className="text-sm">{new Date(dist.periodStart).toLocaleDateString()}</p>
                                        <p className="text-xs text-gray-500">to {new Date(dist.periodEnd).toLocaleDateString()}</p>
                                    </div>
                                </TableCell>
                                <TableCell><span className="font-semibold">{currencySymbol}{dist.totalRevenue.toLocaleString()}</span></TableCell>
                                <TableCell><span className="text-blue-600 font-semibold">{dist.partner.sharePercentage}%</span></TableCell>
                                <TableCell><span className="font-semibold text-green-600">{currencySymbol}{dist.shareAmount.toLocaleString()}</span></TableCell>
                                <TableCell>{getStatusBadge(dist.status)}</TableCell>
                                <TableCell><p className="text-sm">{dist.paymentDate ? new Date(dist.paymentDate).toLocaleDateString() : "-"}</p></TableCell>
                                <TableCell>
                                    {dist.status === "PENDING" && (
                                        <Button variant="outline" size="sm" onClick={() => openPaymentDialog(dist)} className="text-green-600">
                                            Mark Paid
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-600">Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries</div>
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

            {/* Calculate Dialog */}
            <Dialog open={isCalculateDialogOpen} onOpenChange={setIsCalculateDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Calculate Partner Distributions</DialogTitle></DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Period Start *</Label>
                                <Input type="date" value={calcFormData.periodStart} onChange={(e) => setCalcFormData({ ...calcFormData, periodStart: e.target.value })} />
                            </div>
                            <div>
                                <Label>Period End *</Label>
                                <Input type="date" value={calcFormData.periodEnd} onChange={(e) => setCalcFormData({ ...calcFormData, periodEnd: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <Label>Specific Partner (Optional)</Label>
                            <Select value={calcFormData.partnerId || "all"} onValueChange={(value) => setCalcFormData({ ...calcFormData, partnerId: value === "all" ? "" : value })}>
                                <SelectTrigger><SelectValue placeholder="All partners" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Active Partners</SelectItem>
                                    {partners.map((p) => (
                                        <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.sharePercentage}%)</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={handleCalculate} disabled={calculating} className="w-full">
                            {calculating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Calculating...</> : <><Calculator className="w-4 h-4 mr-2" />Calculate</>}
                        </Button>

                        {calculations.length > 0 && (
                            <div className="border rounded-lg p-4 space-y-3">
                                <h3 className="font-semibold">Calculation Results</h3>
                                {calculations.map((calc, idx) => (
                                    <div key={idx} className="flex justify-between items-center border-b pb-2">
                                        <div>
                                            <p className="font-medium">{calc.partnerName}</p>
                                            <p className="text-xs text-gray-500">Share: {calc.sharePercentage}% of {currencySymbol}{calc.totalRevenue.toLocaleString()}</p>
                                        </div>
                                        <p className="font-bold text-green-600">{currencySymbol}{calc.shareAmount.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsCalculateDialogOpen(false); setCalculations([]); }}>Close</Button>
                        {calculations.length > 0 && (
                            <Button onClick={handleCreateDistributions} disabled={submitting} className="bg-green-600">
                                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Distributions"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Update Payment Status</DialogTitle></DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Status *</Label>
                            <Select value={paymentFormData.status} onValueChange={(value) => setPaymentFormData({ ...paymentFormData, status: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Payment Date</Label>
                            <Input type="date" value={paymentFormData.paymentDate} onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })} />
                        </div>

                        <div>
                            <Label>Payment Method</Label>
                            <Input value={paymentFormData.paymentMethod} onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })} placeholder="Bank Transfer, Cash, etc." />
                        </div>

                        <div>
                            <Label>Notes</Label>
                            <Textarea value={paymentFormData.notes} onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })} rows={3} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdatePayment} disabled={submitting} className="bg-green-600">
                            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : "Update Status"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
