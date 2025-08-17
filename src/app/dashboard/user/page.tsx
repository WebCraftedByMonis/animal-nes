"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import Image from "next/image";

interface Session {
  id: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  PhoneNumber: string | null;
  sessions: Session[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      range
    }).toString();

    fetch(`/api/users?${query}`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
        console.log("Fetched users:", data.users);
      });
  }, [page, search, range, pageSize]);

  const pages = Math.ceil(total / pageSize);

  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const count = users.filter((u) =>
      u.sessions.some(
        (s) => new Date(s.createdAt).toDateString() === d.toDateString()
      )
    ).length;
    return { name: label, logins: count };
  }).reverse();

  return (
    <div className="p-6 w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-green-600">User Logins</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Entries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="bg-green-100 dark:bg-black">
            <TableHead>Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone Number</TableHead>
            
            <TableHead>Last Login</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "User"}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-green-200 rounded-full" />
                )}
              </TableCell>
              <TableCell className="text-green-700 font-medium">
                {user.name ?? "Unnamed"}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.PhoneNumber}</TableCell>
              <TableCell>
                {user.sessions[0]
                  ? new Date(user.sessions[0].createdAt).toLocaleString()
                  : "No Sessions"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex justify-between items-center pt-4">
        <p>
          Page {page} of {pages}
        </p>
        <div className="flex gap-2">
          <button
            className="px-4 py-1 border rounded text-green-700"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <button
            className="px-4 py-1 border rounded text-green-700"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
          >
            Next
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-8">
        <h2 className="text-lg font-medium mb-2 text-green-600">
          Logins Over the Last 30 Days
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="logins"
              stroke="#22c55e"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
