'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Users,
    Receipt,
    CreditCard,
    AlertCircle,
    ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinancialOverview {
    summary: {
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        profitMargin: string;
        transactionCount: number;
        expenseCount: number;
        pendingDistributions: number;
        pendingDistributionsCount: number;
        activePartnersCount: number;
    };
    revenueByType: Array<{
        type: string;
        amount: number;
        count: number;
    }>;
    expensesByCategory: Array<{
        category: string;
        amount: number;
        count: number;
    }>;
    monthlyTrend: {
        revenue: Array<{ month: string; revenue: number }>;
        expenses: Array<{ month: string; expense: number }>;
    };
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

export default function FinanceOverviewPage() {
    const [data, setData] = useState<FinancialOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("all");

    const fetchData = async () => {
        try {
            setLoading(true);
            let params = "";

            if (dateRange !== "all") {
                const endDate = new Date();
                const startDate = new Date();

                switch (dateRange) {
                    case "7days":
                        startDate.setDate(endDate.getDate() - 7);
                        break;
                    case "30days":
                        startDate.setDate(endDate.getDate() - 30);
                        break;
                    case "90days":
                        startDate.setDate(endDate.getDate() - 90);
                        break;
                    case "year":
                        startDate.setFullYear(endDate.getFullYear() - 1);
                        break;
                }

                params = `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
            }

            const res = await axios.get(`/api/finance/overview${params}`);
            setData(res.data);
        } catch (error) {
            console.error("Failed to load financial overview", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    if (loading || !data) {
        return (
            <div className="p-6">
                <h1 className="text-3xl font-bold text-green-500 mb-6">Financial Overview</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const { summary, revenueByType, expensesByCategory, monthlyTrend } = data;

    // Prepare revenue pie chart data
    const revenuePieData = revenueByType.map((item, index) => ({
        name: item.type.replace(/_/g, ' '),
        value: item.amount,
        color: COLORS[index % COLORS.length],
    }));

    // Prepare expenses pie chart data
    const expensesPieData = expensesByCategory.map((item, index) => ({
        name: item.category.replace(/_/g, ' '),
        value: item.amount,
        color: COLORS[index % COLORS.length],
    }));

    // Prepare monthly trend data
    const monthlyData = monthlyTrend.revenue.map((rev, index) => {
        const exp = monthlyTrend.expenses.find(e => e.month === rev.month);
        return {
            month: rev.month,
            revenue: rev.revenue || 0,
            expenses: exp?.expense || 0,
            profit: (rev.revenue || 0) - (exp?.expense || 0),
        };
    });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-green-500">Financial Overview</h1>
                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="90days">Last 90 Days</SelectItem>
                        <SelectItem value="year">Last Year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Revenue
                        </CardTitle>
                        <DollarSign className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ₨{summary.totalRevenue.toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {summary.transactionCount} transactions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Expenses
                        </CardTitle>
                        <Receipt className="h-5 w-5 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            ₨{summary.totalExpenses.toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {summary.expenseCount} expenses
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Net Profit
                        </CardTitle>
                        {summary.netProfit >= 0 ? (
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`text-2xl font-bold ${
                                summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'
                            }`}
                        >
                            ₨{summary.netProfit.toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Margin: {summary.profitMargin}%
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Pending Distributions
                        </CardTitle>
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            ₨{summary.pendingDistributions.toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {summary.pendingDistributionsCount} pending
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Link href="/dashboard/finance/partners">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Business Partners</p>
                                    <p className="text-2xl font-bold mt-1">
                                        {summary.activePartnersCount}
                                    </p>
                                </div>
                                <Users className="h-8 w-8 text-purple-500" />
                            </div>
                            <Button variant="ghost" className="w-full mt-4 text-purple-600">
                                Manage Partners <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/finance/transactions">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Transactions</p>
                                    <p className="text-2xl font-bold mt-1">{summary.transactionCount}</p>
                                </div>
                                <CreditCard className="h-8 w-8 text-green-500" />
                            </div>
                            <Button variant="ghost" className="w-full mt-4 text-green-600">
                                View Transactions <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/finance/expenses">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Expenses</p>
                                    <p className="text-2xl font-bold mt-1">{summary.expenseCount}</p>
                                </div>
                                <Receipt className="h-8 w-8 text-red-500" />
                            </div>
                            <Button variant="ghost" className="w-full mt-4 text-red-600">
                                View Expenses <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/finance/distributions">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Distributions</p>
                                    <p className="text-2xl font-bold mt-1">
                                        {summary.pendingDistributionsCount}
                                    </p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-blue-500" />
                            </div>
                            <Button variant="ghost" className="w-full mt-4 text-blue-600">
                                Manage Distributions <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Revenue by Type */}
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={revenuePieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) =>
                                        `${name}: ${(percent * 100).toFixed(0)}%`
                                    }
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {revenuePieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => `₨${value.toLocaleString()}`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Expenses by Category */}
                <Card>
                    <CardHeader>
                        <CardTitle>Expenses by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={expensesPieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) =>
                                        `${name}: ${(percent * 100).toFixed(0)}%`
                                    }
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {expensesPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => `₨${value.toLocaleString()}`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Financial Trend (Last 6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value: number) => `₨${value.toLocaleString()}`} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="Revenue"
                            />
                            <Line
                                type="monotone"
                                dataKey="expenses"
                                stroke="#ef4444"
                                strokeWidth={2}
                                name="Expenses"
                            />
                            <Line
                                type="monotone"
                                dataKey="profit"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Profit"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Revenue & Expenses Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {revenueByType.map((item, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="text-sm">
                                            {item.type.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">₨{item.amount.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">{item.count} txns</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Expense Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {expensesByCategory.map((item, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="text-sm">
                                            {item.category.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">₨{item.amount.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">{item.count} items</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
