'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
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
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Edit,
    Trash2,
    Users,
    TrendingUp,
    Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import WhatsAppLink from "@/components/WhatsAppLink";

interface BusinessPartner {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    partnerType: string;
    sharePercentage: number;
    bankDetails?: string;
    isActive: boolean;
    joinedDate: string;
    notes?: string;
    distributions: any[];
    expenses: any[];
    createdAt: string;
}

export default function BusinessPartnersPage() {
    const [partners, setPartners] = useState<BusinessPartner[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<BusinessPartner | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        partnerType: "",
        sharePercentage: 0,
        bankDetails: "",
        isActive: true,
        notes: "",
    });

    // State for selecting existing partner
    const [selectedExistingPartnerId, setSelectedExistingPartnerId] = useState("");
    const [isLoadingPartner, setIsLoadingPartner] = useState(false);
    const [isExistingPartner, setIsExistingPartner] = useState(false);

    // Common partner type suggestions
    const commonPartnerTypes = [
        "WEBSITE_OWNER",
        "INVESTOR",
        "VET_PARTNER",
        "SUPPLIER",
        "EMPLOYEE",
        "OTHER",
    ];

    // Handle existing partner selection
    const handleExistingPartnerSelect = async (partnerId: string) => {
        if (!partnerId) {
            setIsExistingPartner(false);
            setSelectedExistingPartnerId("");
            resetForm();
            return;
        }

        try {
            setIsLoadingPartner(true);
            const response = await axios.get(`/api/partner/${partnerId}`);
            const partner = response.data;

            // Auto-fill form data with partner type as-is
            const newFormData = {
                name: partner.partnerName || "",
                email: partner.partnerEmail || "",
                phone: partner.partnerMobileNumber || "",
                partnerType: partner.partnerType || "",
                sharePercentage: 0,
                bankDetails: "",
                isActive: true,
                notes: `Imported from Partner: ${partner.partnerName}`,
            };

            setFormData(newFormData);
            setIsExistingPartner(true);
            setSelectedExistingPartnerId(partnerId);

            setIsLoadingPartner(false);
            toast.success(`Partner data loaded!`);
        } catch (error) {
            toast.error("Failed to load partner data");
            setIsLoadingPartner(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                search,
                limit: limit.toString(),
                page: page.toString(),
            });

            if (statusFilter && statusFilter !== "ALL") {
                params.append("isActive", statusFilter === "ACTIVE" ? "true" : "false");
            }

            const res = await axios.get(`/api/finance/business-partners?${params}`);
            setPartners(res.data.data);
            setTotal(res.data.total);
        } catch (error) {
            toast.error("Failed to load business partners");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [search, page, limit, statusFilter]);

    const handleAdd = async () => {
        try {
            setSubmitting(true);
            await axios.post("/api/finance/business-partners", formData);
            toast.success("Partner added successfully");
            setIsAddDialogOpen(false);
            resetForm();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to add partner");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedPartner) return;
        try {
            setSubmitting(true);
            await axios.put("/api/finance/business-partners", {
                id: selectedPartner.id,
                ...formData,
            });
            toast.success("Partner updated successfully");
            setIsEditDialogOpen(false);
            resetForm();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to update partner");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPartner) return;
        try {
            setSubmitting(true);
            await axios.delete(`/api/finance/business-partners?id=${selectedPartner.id}`);
            toast.success("Partner deleted successfully");
            setIsDeleteDialogOpen(false);
            setSelectedPartner(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to delete partner");
        } finally {
            setSubmitting(false);
        }
    };

    const openEditDialog = (partner: BusinessPartner) => {
        setSelectedPartner(partner);
        setFormData({
            name: partner.name,
            email: partner.email || "",
            phone: partner.phone || "",
            partnerType: partner.partnerType,
            sharePercentage: partner.sharePercentage,
            bankDetails: partner.bankDetails || "",
            isActive: partner.isActive,
            notes: partner.notes || "",
        });
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (partner: BusinessPartner) => {
        setSelectedPartner(partner);
        setIsDeleteDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            phone: "",
            partnerType: "",
            sharePercentage: 0,
            bankDetails: "",
            isActive: true,
            notes: "",
        });
        setSelectedPartner(null);
        setSelectedExistingPartnerId("");
        setIsExistingPartner(false);
    };

    const getPartnerTypeBadge = (type: string) => {
        const colors: any = {
            WEBSITE_OWNER: "bg-purple-100 text-purple-800",
            INVESTOR: "bg-blue-100 text-blue-800",
            VET_PARTNER: "bg-green-100 text-green-800",
            SUPPLIER: "bg-orange-100 text-orange-800",
            EMPLOYEE: "bg-pink-100 text-pink-800",
            OTHER: "bg-gray-100 text-gray-800",
        };
        return colors[type] || "bg-gray-100 text-gray-800";
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-green-500">Business Partners</h1>
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Partner
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-blue-500" />
                        <div>
                            <p className="text-sm text-gray-600">Total Partners</p>
                            <p className="text-2xl font-bold">{total}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-green-500" />
                        <div>
                            <p className="text-sm text-gray-600">Active Partners</p>
                            <p className="text-2xl font-bold">
                                {partners.filter((p) => p.isActive).length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-purple-500" />
                        <div>
                            <p className="text-sm text-gray-600">Total Share %</p>
                            <p className="text-2xl font-bold">
                                {partners
                                    .filter((p) => p.isActive)
                                    .reduce((sum, p) => sum + p.sharePercentage, 0)
                                    .toFixed(1)}
                                %
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <Input
                    placeholder="Search by name, email, phone, or type..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />

                <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={limit.toString()} onValueChange={(val) => setLimit(Number(val))}>
                        <SelectTrigger className="w-28">
                            <SelectValue placeholder="Entries" />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 25, 50].map((n) => (
                                <SelectItem key={n} value={n.toString()}>
                                    {n} entries
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-xl overflow-x-auto border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-green-100">
                            <TableHead className="font-semibold">Name</TableHead>
                            <TableHead className="font-semibold">Type</TableHead>
                            <TableHead className="font-semibold">Contact</TableHead>
                            <TableHead className="font-semibold">Share %</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Joined Date</TableHead>
                            <TableHead className="font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading
                            ? Array(limit)
                                  .fill(null)
                                  .map((_, i) => (
                                      <TableRow key={i}>
                                          {[...Array(7)].map((_, j) => (
                                              <TableCell key={j}>
                                                  <Skeleton className="h-4 w-full" />
                                              </TableCell>
                                          ))}
                                      </TableRow>
                                  ))
                            : partners.map((partner) => (
                                  <TableRow key={partner.id} className="hover:bg-gray-50">
                                      <TableCell>
                                          <div>
                                              <p className="font-medium">{partner.name}</p>
                                              {partner.email && (
                                                  <p className="text-xs text-gray-500">{partner.email}</p>
                                              )}
                                          </div>
                                      </TableCell>
                                      <TableCell>
                                          <Badge className={getPartnerTypeBadge(partner.partnerType)}>
                                              {partner.partnerType.replace("_", " ")}
                                          </Badge>
                                      </TableCell>
                                      <TableCell>
                                          <WhatsAppLink phone={partner.phone || ''} className="text-sm" />
                                      </TableCell>
                                      <TableCell>
                                          <span className="font-semibold text-green-600">
                                              {partner.sharePercentage}%
                                          </span>
                                      </TableCell>
                                      <TableCell>
                                          {partner.isActive ? (
                                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                                          ) : (
                                              <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                                          )}
                                      </TableCell>
                                      <TableCell>
                                          <p className="text-sm">
                                              {new Date(partner.joinedDate).toLocaleDateString()}
                                          </p>
                                      </TableCell>
                                      <TableCell>
                                          <div className="flex gap-2">
                                              <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => openEditDialog(partner)}
                                              >
                                                  <Edit className="w-4 h-4 text-blue-500" />
                                              </Button>
                                              <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => openDeleteDialog(partner)}
                                              >
                                                  <Trash2 className="w-4 h-4 text-red-500" />
                                              </Button>
                                          </div>
                                      </TableCell>
                                  </TableRow>
                              ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-600">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{" "}
                    entries
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

            {/* Add/Edit Dialog */}
            <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsAddDialogOpen(false);
                    setIsEditDialogOpen(false);
                    resetForm();
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditDialogOpen ? "Edit Partner" : "Add New Partner"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Only show for ADD mode, not EDIT */}
                        {isAddDialogOpen && !isEditDialogOpen && (
                            <div>
                                <Label>Import from Existing Partner (Optional)</Label>
                                <SearchableCombobox
                                    apiEndpoint="/api/partner"
                                    searchKey="partnerName"
                                    value={selectedExistingPartnerId}
                                    onChange={handleExistingPartnerSelect}
                                    placeholder="Select existing partner"
                                />
                                {isExistingPartner && (
                                    <p className="text-xs text-green-600 mt-1">
                                        ✓ Partner data loaded. You can modify the details below.
                                    </p>
                                )}
                            </div>
                        )}

                        <div>
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Partner name"
                                disabled={isLoadingPartner}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@example.com"
                                    disabled={isLoadingPartner}
                                />
                            </div>

                            <div>
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+92 300 1234567"
                                    disabled={isLoadingPartner}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="partnerType">Partner Type *</Label>
                                <Input
                                    id="partnerType"
                                    list="partnerTypeOptions"
                                    value={formData.partnerType}
                                    onChange={(e) => setFormData({ ...formData, partnerType: e.target.value })}
                                    placeholder="Select or type custom partner type"
                                    disabled={isLoadingPartner}
                                />
                                <datalist id="partnerTypeOptions">
                                    {commonPartnerTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type.replace(/_/g, " ")}
                                        </option>
                                    ))}
                                </datalist>
                                {isExistingPartner && (
                                    <p className="text-xs text-blue-600 mt-1">
                                        ✓ Type imported from existing partner
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    Select from suggestions or type your own custom type
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="sharePercentage">Share Percentage *</Label>
                                <Input
                                    id="sharePercentage"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={formData.sharePercentage}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            sharePercentage: parseFloat(e.target.value),
                                        })
                                    }
                                    placeholder="30.5"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="bankDetails">Bank Details</Label>
                            <Textarea
                                id="bankDetails"
                                value={formData.bankDetails}
                                onChange={(e) =>
                                    setFormData({ ...formData, bankDetails: e.target.value })
                                }
                                placeholder="Bank name, account number, IBAN..."
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Additional notes..."
                                rows={3}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) =>
                                    setFormData({ ...formData, isActive: e.target.checked })
                                }
                                className="h-4 w-4"
                            />
                            <Label htmlFor="isActive">Active Partner</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAddDialogOpen(false);
                                setIsEditDialogOpen(false);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={isEditDialogOpen ? handleEdit : handleAdd}
                            disabled={submitting}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : isEditDialogOpen ? (
                                "Update Partner"
                            ) : (
                                "Add Partner"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                    </DialogHeader>
                    <p>
                        Are you sure you want to delete <strong>{selectedPartner?.name}</strong>? This
                        action cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
