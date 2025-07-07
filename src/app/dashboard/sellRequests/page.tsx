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
import { ChevronLeft, ChevronRight, ArrowUpDown, X } from "lucide-react";
import toast from "react-hot-toast";
import { Switch } from "@/components/ui/switch";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
interface SellAnimalRequest {
  id: string;
  specie: string;
  breed: string;
  quantity: number;
  ageType: 'DAYS' | 'MONTHS' | 'YEARS'; // depending on your enum
  ageNumber: number;
  weightType: 'KG' | 'LB';              // depending on your enum
  weightValue: number;
  gender: 'MALE' | 'FEMALE';
  location: string;
  healthCertificate: boolean;
  totalPrice: number;
  purchasePrice: number;
  referredBy?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  images: { url: string; alt: string }[];
  videos: { url: string; alt: string }[];
}

export default function AnimalRequestsDashboard() {
  const [requests, setRequests] = useState<SellAnimalRequest[]>([]);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sell-animal?q=${search}&limit=${limit}&page=${page}&sort=${sortField}&order=${sortOrder}`);
      const data = await res.json();
      setRequests(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      toast.error("Failed to load requests");
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, page, limit, sortField, sortOrder]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleStatusChange = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    const res = await fetch(`/api/sell-animal`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      toast.success("Status updated");
      fetchData();
    } else {
      toast.error("Failed to update status");
    }
  };

  const totalPages = Math.ceil(total / limit);

  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const label = date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const count = (requests ?? []).filter(r => new Date(r.createdAt).toDateString() === date.toDateString()).length;
    return { name: label, requests: count };
  }).reverse();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-green-600 mb-6">Sell Animal Requests</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <Input
          placeholder="Search by title, specie, breed..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <Select value={limit.toString()} onValueChange={(val) => setLimit(Number(val))}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Entries" />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50].map(n => <SelectItem key={n} value={n.toString()}>{n} entries</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full overflow-x-auto border rounded-xl bg-white">

        <Table>
          <TableHeader>
            <TableRow className="bg-green-100 text-green-800">
              <TableHead>Specie</TableHead>
              <TableHead>Breed</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Video</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Certificate</TableHead>
              <TableHead>Total Price</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead>Referred By</TableHead>

              <TableHead className="cursor-pointer" onClick={() => toggleSort("createdAt")}>
                Created At <ArrowUpDown className="inline w-4 h-4" />
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array(limit).fill(null).map((_, i) => (
              <TableRow key={i}>
                {Array(11).fill(null).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            )) : requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.specie}</TableCell>
                <TableCell>{r.breed}</TableCell>
                <TableCell>
                  {r.images.length > 0 ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <img
                          src={r.images[0].url}
                          alt={r.images[0].alt || "animal"}
                          className="h-16 w-16 object-cover rounded border cursor-pointer hover:scale-105 transition-transform"
                        />
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogTitle className="sr-only">Zoomed Image</DialogTitle> {/* Visually hidden */}
                        <img
                          src={r.images[0].url}
                          alt={r.images[0].alt || "Zoomed animal"}
                          className="w-full object-contain max-h-[80vh] rounded"
                        />
                      </DialogContent>
                    </Dialog>

                  ) : (
                    <span className="text-xs text-muted-foreground">No Image</span>
                  )}
                </TableCell>
                <TableCell>
                  {r.videos.length > 0 ? (
                    <video
                      src={r.videos[0].url}
                      className="h-16 w-24 rounded border"
                      controls
                      muted
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">No Video</span>
                  )}
                </TableCell>
                <TableCell>{r.location}</TableCell>
                <TableCell>{r.gender}</TableCell>
                <TableCell>{r.quantity}</TableCell>
                <TableCell>{r.user?.name}</TableCell>
                <TableCell>{r.user?.email}</TableCell>
                <TableCell>{r.ageNumber} {r.ageType}</TableCell>
                <TableCell>{r.weightValue} {r.weightType}</TableCell>
                <TableCell>{r.healthCertificate ? 'Yes' : 'No'}</TableCell>
                <TableCell>PKR {r.totalPrice.toFixed(2)}</TableCell>
                <TableCell>PKR {r.purchasePrice.toFixed(2)}</TableCell>
                <TableCell>{r.referredBy || "N/A"}</TableCell>

                <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.status === 'ACCEPTED'}
                      onCheckedChange={(checked) => handleStatusChange(r.id, checked ? 'ACCEPTED' : 'REJECTED')}
                    />
                    <span className={`text-sm ${r.status === 'ACCEPTED' ? 'text-green-600' : 'text-red-500'}`}>
                      {r.status}
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
        <h2 className="text-lg font-medium mb-2 text-green-600">Sell Requests in the Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="requests" stroke="#22c55e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
