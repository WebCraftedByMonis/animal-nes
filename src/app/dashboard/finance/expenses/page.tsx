'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
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
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, Receipt, TrendingDown, Loader2, Eye, Upload } from "lucide-react";
import toast from "react-hot-toast";

interface Expense {
    id: number;
    category: string;
    amount: number;
    description: string;
    expenseDate: string;
    paymentMethod?: string;
    status: string;
    partnerId?: number;
    paidToPartner?: { id: number; name: string; partnerType: string };
    receiptUrl?: string;
    receiptPublicId?: string;
    notes?: string;
    createdAt: string;
}

interface BusinessPartner {
    id: number;
    name: string;
    partnerType: string;
}

export default function ExpensesPage() {
    const { currencySymbol } = useCountry();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [partners, setPartners] = useState<BusinessPartner[]>([]);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [loading, setLoading] = useState(true);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        category: "OPERATING_EXPENSE",
        amount: 0,
        description: "",
        expenseDate: new Date().toISOString().split('T')[0],
        paymentMethod: "",
        status: "PENDING",
        partnerId: "",
        notes: "",
    });

    const expenseCategories = [
        "PARTNER_DISTRIBUTION",
        "PURCHASE_COST",
        "OPERATING_EXPENSE",
        "MARKETING",
        "DELIVERY_COSTS",
        "VET_FEES",
        "OTHER",
    ];

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                search,
                limit: limit.toString(),
                page: page.toString(),
            });

            if (categoryFilter && categoryFilter !== "ALL") {
                params.append("category", categoryFilter);
            }
            if (statusFilter && statusFilter !== "ALL") {
                params.append("status", statusFilter);
            }

            const [expensesRes, partnersRes] = await Promise.all([
                axios.get(`/api/finance/expenses?${params}`),
                axios.get(`/api/finance/business-partners?limit=1000`),
            ]);

            setExpenses(expensesRes.data.data);
            setTotal(expensesRes.data.total);
            setTotalExpenses(expensesRes.data.totalExpenses || 0);
            setPartners(partnersRes.data.data);
        } catch (error) {
            toast.error("Failed to load expenses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [search, page, limit, categoryFilter, statusFilter]);

    const handleAdd = async () => {
        try {
            setSubmitting(true);
            const formDataToSend = new FormData();
            formDataToSend.append("category", formData.category);
            formDataToSend.append("amount", formData.amount.toString());
            formDataToSend.append("description", formData.description);
            formDataToSend.append("expenseDate", formData.expenseDate);
            formDataToSend.append("paymentMethod", formData.paymentMethod);
            formDataToSend.append("status", formData.status);
            if (formData.partnerId) formDataToSend.append("partnerId", formData.partnerId);
            if (formData.notes) formDataToSend.append("notes", formData.notes);
            if (receiptFile) formDataToSend.append("receipt", receiptFile);

            await axios.post("/api/finance/expenses", formDataToSend);
            toast.success("Expense added successfully");
            setIsAddDialogOpen(false);
            resetForm();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to add expense");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedExpense) return;
        try {
            setSubmitting(true);
            const formDataToSend = new FormData();
            formDataToSend.append("id", selectedExpense.id.toString());
            formDataToSend.append("category", formData.category);
            formDataToSend.append("amount", formData.amount.toString());
            formDataToSend.append("description", formData.description);
            formDataToSend.append("expenseDate", formData.expenseDate);
            formDataToSend.append("paymentMethod", formData.paymentMethod);
            formDataToSend.append("status", formData.status);
            if (formData.partnerId) formDataToSend.append("partnerId", formData.partnerId);
            if (formData.notes) formDataToSend.append("notes", formData.notes);
            if (receiptFile) formDataToSend.append("receipt", receiptFile);

            await axios.put("/api/finance/expenses", formDataToSend);
            toast.success("Expense updated successfully");
            setIsEditDialogOpen(false);
            resetForm();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to update expense");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedExpense) return;
        try {
            setSubmitting(true);
            await axios.delete(`/api/finance/expenses?id=${selectedExpense.id}`);
            toast.success("Expense deleted successfully");
            setIsDeleteDialogOpen(false);
            setSelectedExpense(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to delete expense");
        } finally {
            setSubmitting(false);
        }
    };

    const openEditDialog = (expense: Expense) => {
        setSelectedExpense(expense);
        setFormData({
            category: expense.category,
            amount: expense.amount,
            description: expense.description,
            expenseDate: new Date(expense.expenseDate).toISOString().split('T')[0],
            paymentMethod: expense.paymentMethod || "",
            status: expense.status,
            partnerId: expense.partnerId?.toString() || "",
            notes: expense.notes || "",
        });
        setIsEditDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({
            category: "OPERATING_EXPENSE",
            amount: 0,
            description: "",
            expenseDate: new Date().toISOString().split('T')[0],
            paymentMethod: "",
            status: "PENDING",
            partnerId: "",
            notes: "",
        });
        setReceiptFile(null);
        setSelectedExpense(null);
    };

    const getCategoryBadge = (category: string) => {
        const colors: any = {
            PARTNER_DISTRIBUTION: "bg-purple-100 text-purple-800",
            PURCHASE_COST: "bg-blue-100 text-blue-800",
            OPERATING_EXPENSE: "bg-orange-100 text-orange-800",
            MARKETING: "bg-pink-100 text-pink-800",
            DELIVERY_COSTS: "bg-green-100 text-green-800",
            VET_FEES: "bg-indigo-100 text-indigo-800",
            OTHER: "bg-gray-100 text-gray-800",
        };
        return colors[category] || "bg-gray-100 text-gray-800";
    };

    const getStatusBadge = (status: string) => {
        const colors: any = {
            COMPLETED: "bg-green-100 text-green-800",
            PENDING: "bg-yellow-100 text-yellow-800",
            CANCELLED: "bg-red-100 text-red-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-green-500">Expenses</h1>
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-red-600 hover:bg-red-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <TrendingDown className="h-8 w-8 text-red-500" />
                        <div>
                            <p className="text-sm text-gray-600">Total Expenses</p>
                            <p className="text-2xl font-bold text-red-600">{currencySymbol}{totalExpenses.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <Receipt className="h-8 w-8 text-blue-500" />
                        <div>
                            <p className="text-sm text-gray-600">Total Entries</p>
                            <p className="text-2xl font-bold">{total}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <TrendingDown className="h-8 w-8 text-purple-500" />
                        <div>
                            <p className="text-sm text-gray-600">Average Expense</p>
                            <p className="text-2xl font-bold">
                                {currencySymbol}{total > 0 ? (totalExpenses / total).toFixed(0) : 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <Input placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

                <div className="flex gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-52">
                            <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Categories</SelectItem>
                            {expenseCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat.replace(/_/g, " ")}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={limit.toString()} onValueChange={(val) => setLimit(Number(val))}>
                        <SelectTrigger className="w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 25, 50, 100].map((n) => (
                                <SelectItem key={n} value={n.toString()}>{n} entries</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-xl overflow-x-auto border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-red-100">
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="font-semibold">Category</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="font-semibold">Amount</TableHead>
                            <TableHead className="font-semibold">Paid To</TableHead>
                            <TableHead className="font-semibold">Payment</TableHead>
                            <TableHead className="font-semibold">Receipt</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? Array(limit).fill(null).map((_, i) => (
                            <TableRow key={i}>
                                {[...Array(9)].map((_, j) => (
                                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                ))}
                            </TableRow>
                        )) : expenses.map((expense) => (
                            <TableRow key={expense.id} className="hover:bg-gray-50">
                                <TableCell>
                                    <p className="text-sm">{new Date(expense.expenseDate).toLocaleDateString()}</p>
                                </TableCell>
                                <TableCell>
                                    <Badge className={getCategoryBadge(expense.category)}>
                                        {expense.category.replace(/_/g, " ")}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm max-w-xs truncate" title={expense.description}>{expense.description}</p>
                                </TableCell>
                                <TableCell>
                                    <span className="font-semibold text-red-600">{currencySymbol}{expense.amount.toLocaleString()}</span>
                                </TableCell>
                                <TableCell>
                                    {expense.paidToPartner ? (
                                        <div>
                                            <p className="text-sm font-medium">{expense.paidToPartner.name}</p>
                                            <p className="text-xs text-gray-500">{expense.paidToPartner.partnerType}</p>
                                        </div>
                                    ) : "-"}
                                </TableCell>
                                <TableCell><p className="text-sm">{expense.paymentMethod || "-"}</p></TableCell>
                                <TableCell>
                                    {expense.receiptUrl ? (
                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedExpense(expense); setIsReceiptDialogOpen(true); }}>
                                            <Eye className="w-4 h-4 text-blue-500" />
                                        </Button>
                                    ) : "-"}
                                </TableCell>
                                <TableCell>
                                    <Badge className={getStatusBadge(expense.status)}>{expense.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(expense)}>
                                            <Edit className="w-4 h-4 text-blue-500" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedExpense(expense); setIsDeleteDialogOpen(true); }}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
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

            {/* Add/Edit Dialog */}
            <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => { if (!open) { setIsAddDialogOpen(false); setIsEditDialogOpen(false); resetForm(); } }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditDialogOpen ? "Edit Expense" : "Add New Expense"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Category *</Label>
                                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {expenseCategories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>{cat.replace(/_/g, " ")}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Amount ({currencySymbol}) *</Label>
                                <Input type="number" min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} />
                            </div>
                        </div>

                        <div>
                            <Label>Description *</Label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Expense Date *</Label>
                                <Input type="date" value={formData.expenseDate} onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })} />
                            </div>
                            <div>
                                <Label>Status *</Label>
                                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Paid To Partner</Label>
                                <Select value={formData.partnerId || "none"} onValueChange={(value) => setFormData({ ...formData, partnerId: value === "none" ? "" : value })}>
                                    <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {partners.map((p) => (
                                            <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.partnerType})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Payment Method</Label>
                                <Input value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })} placeholder="Cash, Bank, etc." />
                            </div>
                        </div>

                        <div>
                            <Label>Receipt/Proof</Label>
                            <Input type="file" accept="image/*,application/pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                            {receiptFile && <p className="text-xs text-gray-500 mt-1">Selected: {receiptFile.name}</p>}
                        </div>

                        <div>
                            <Label>Notes</Label>
                            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setIsEditDialogOpen(false); resetForm(); }}>Cancel</Button>
                        <Button onClick={isEditDialogOpen ? handleEdit : handleAdd} disabled={submitting} className="bg-red-600 hover:bg-red-700">
                            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : isEditDialogOpen ? "Update Expense" : "Add Expense"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Dialog */}
            <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
                    {selectedExpense?.receiptUrl && (
                        <div className="relative w-full h-[600px]">
                            <Image src={selectedExpense.receiptUrl} alt="Receipt" fill className="object-contain" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle></DialogHeader>
                    <p>Are you sure you want to delete this expense? This action cannot be undone.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
