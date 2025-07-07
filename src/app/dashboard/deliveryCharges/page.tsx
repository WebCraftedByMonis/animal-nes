"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { formatDistanceToNow } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Pencil, Trash2, ArrowUpDown } from "lucide-react"
import TableSkeleton from "@/components/skeletons/TableSkeleton"

interface DeliveryCharge {
  id: number
  amount: number
  cityId: number
  city: {
    id: number
    name: string
  }
  createdAt: string
}

interface City {
  id: number
  name: string
}

export default function DeliveryChargesPage() {
  const [charges, setCharges] = useState<DeliveryCharge[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"id" | "amount" | "cityId">("id")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null)

  const [selectedCityId, setSelectedCityId] = useState<string>("")
  const [amount, setAmount] = useState("")
  const [editId, setEditId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  const fetchCharges = useCallback(async () => {
    const res = await axios.get("/api/delivery-charges", {
      params: { search, sortBy, sortOrder, page, limit },
    })
    setCharges(res.data.data)
    setTotal(res.data.total)
    setLastCreatedAt(res.data.lastSubmittedAt)
  }, [search, sortBy, sortOrder, page, limit])

  const fetchCities = useCallback(async () => {
    const res = await axios.get("/api/cities", {
      params: { limit: 100 },
    })
    setCities(res.data.data)
  }, [])

  useEffect(() => {
    fetchCharges()
    fetchCities()
  }, [fetchCharges, fetchCities])

  const handleCreate = async () => {
    if (!selectedCityId || !amount) return
    try {
      await axios.post("/api/delivery-charges", {
        cityId: parseInt(selectedCityId),
        amount: parseFloat(amount),
      })
      toast.success("Charge added")
      resetForm()
      fetchCharges()
    } catch (error) {
      console.log(error)

      toast.error("Error adding charge")
    }
  }

  const handleUpdate = async () => {
    if (editId === null || !selectedCityId || !amount) return
    try {
      await axios.put("/api/delivery-charges", {
        id: editId,
        cityId: parseInt(selectedCityId),
        amount: parseFloat(amount),
      })
      toast.success("Charge updated")
      resetForm()
      fetchCharges()
    } catch (error) {
      console.log(error)
      toast.error("Error updating charge")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await axios.delete("/api/delivery-charges", {
        params: { id },
      })
      toast.error("Charge deleted")
      fetchCharges()
    } catch (error) {
      console.log(error)

      toast.error("Error deleting charge")
    }
  }

  const resetForm = () => {
    setSelectedCityId("")
    setAmount("")
    setEditId(null)
    setOpen(false)
  }

  const toggleSort = (key: "id" | "amount" | "cityId") => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(key)
      setSortOrder("asc")
    }
  }

  return (
    <Suspense fallback={<TableSkeleton />}>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center text-green-500">Delivery Charges</h1>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="focus:ring-green-500"
            />
            <span>Show</span>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full overflow-visible">
          <div className="md:col-span-2 overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => toggleSort("id")} className="cursor-pointer">
                    ID <ArrowUpDown className="inline h-4 w-4" />
                  </TableHead>
                  <TableHead onClick={() => toggleSort("cityId")} className="cursor-pointer">
                    City Name <ArrowUpDown className="inline h-4 w-4" />
                  </TableHead>
                  <TableHead onClick={() => toggleSort("amount")} className="cursor-pointer">
                    Delivery Charge <ArrowUpDown className="inline h-4 w-4" />
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>{(page - 1) * limit + idx + 1}</TableCell>
                    <TableCell>{item.city.name}</TableCell>
                    <TableCell>{item.amount.toFixed(2)}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditId(item.id)
                          setSelectedCityId(String(item.cityId))
                          setAmount(String(item.amount))
                          setOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-between items-center text-sm">
              <p className="text-muted-foreground">Total entries: {total}</p>
              <span>
                {lastCreatedAt
                  ? `Last entry submitted ${formatDistanceToNow(new Date(lastCreatedAt))} ago`
                  : "No entries yet"}
              </span>
              <div className="flex gap-2">
                <Button size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Prev
                </Button>
                {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === page ? "default" : "outline"}
                    onClick={() => setPage(p)}
                    className={p === page ? "bg-green-500 text-white" : ""}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  size="sm"
                  disabled={page * limit >= total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-muted w-60 h-52 p-4 rounded-xl space-y-4">
            <h2 className="text-lg font-semibold">Add City Charge</h2>
            <Select value={selectedCityId} onValueChange={(val) => setSelectedCityId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={String(city.id)}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              className="w-full bg-green-500 hover:bg-green-600"
              onClick={handleCreate}
            >
              Add
            </Button>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Delivery Charge</DialogTitle>
            </DialogHeader>
            <Select value={selectedCityId} onValueChange={(val) => setSelectedCityId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={String(city.id)}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2"
            />
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button className="bg-green-500 hover:bg-green-600" onClick={handleUpdate}>
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}
