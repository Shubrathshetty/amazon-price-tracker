import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ProductDetailProps {
  productId: string;
}

export default function ProductDetail({ productId }: ProductDetailProps) {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [newTargetPrice, setNewTargetPrice] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const productIdNum = parseInt(productId, 10);

  const { data, isLoading } = trpc.products.getWithHistory.useQuery(
    { productId: productIdNum },
    { enabled: isAuthenticated }
  );

  const updateTargetMutation = trpc.products.updateTarget.useMutation();
  const removeMutation = trpc.products.remove.useMutation();

  const handleUpdateTarget = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTargetPrice || parseFloat(newTargetPrice) <= 0) {
      toast.error("Please enter a valid target price");
      return;
    }

    setIsUpdating(true);
    try {
      await updateTargetMutation.mutateAsync({
        productId: productIdNum,
        targetPrice: parseFloat(newTargetPrice),
      });

      toast.success("Target price updated successfully!");
      setNewTargetPrice("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update target price";
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveProduct = async () => {
    if (!confirm("Are you sure you want to stop tracking this product?")) {
      return;
    }

    try {
      await removeMutation.mutateAsync({ productId: productIdNum });
      toast.success("Product removed from tracking");
      navigate("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to remove product";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <p className="text-gray-500">Product not found</p>
        </div>
      </div>
    );
  }

  const product = data.product;
  const priceHistory = data.priceHistory;

  // Prepare chart data
  const chartData = priceHistory
    .map((item) => ({
      date: new Date(item.checkedAt).toLocaleDateString(),
      price: parseFloat(item.price as any),
    }))
    .reverse();

  const currentPrice = parseFloat(product.currentPrice as any);
  const targetPrice = parseFloat(product.targetPrice as any);
  const priceStatus = currentPrice <= targetPrice ? "Target Met!" : "Waiting";
  const priceStatusColor = currentPrice <= targetPrice ? "text-green-600" : "text-orange-600";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Product Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="line-clamp-2">{product.productName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.productImage && (
                  <img
                    src={product.productImage}
                    alt={product.productName}
                    className="w-full h-48 object-cover rounded"
                  />
                )}

                <div>
                  <p className="text-xs text-gray-500">Current Price</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${currentPrice.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Target Price</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${targetPrice.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`text-lg font-bold ${priceStatusColor}`}>
                    {priceStatus}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Last Checked</p>
                  <p className="text-sm text-gray-700">
                    {product.lastCheckedAt
                      ? new Date(product.lastCheckedAt).toLocaleString()
                      : "Never"}
                  </p>
                </div>

                <a
                  href={product.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">
                    View on Amazon
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Update Target Price */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Target Price</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateTarget} className="space-y-4">
                  <div>
                    <Label htmlFor="newTargetPrice">New Target Price ($)</Label>
                    <Input
                      id="newTargetPrice"
                      type="number"
                      placeholder="99.99"
                      step="0.01"
                      min="0"
                      value={newTargetPrice}
                      onChange={(e) => setNewTargetPrice(e.target.value)}
                      disabled={isUpdating}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Remove Product */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-lg text-red-900">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleRemoveProduct}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Stop Tracking
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Price History Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Price History (Last 30 Days)</CardTitle>
                <CardDescription>
                  {priceHistory.length} price check{priceHistory.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => `$${(value as number).toFixed(2)}`}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#3b82f6"
                        dot={{ fill: "#3b82f6" }}
                        name="Price"
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No price history available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price History Table */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Price Checks</CardTitle>
              </CardHeader>
              <CardContent>
                {priceHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4 font-semibold">Date</th>
                          <th className="text-right py-2 px-4 font-semibold">Price</th>
                          <th className="text-right py-2 px-4 font-semibold">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistory.map((item, index) => {
                          const currentItemPrice = parseFloat(item.price as any);
                          const previousPrice =
                            index < priceHistory.length - 1
                              ? parseFloat(priceHistory[index + 1].price as any)
                              : currentItemPrice;
                          const change = currentItemPrice - previousPrice;
                          const changePercent = ((change / previousPrice) * 100).toFixed(2);

                          return (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-4">
                                {new Date(item.checkedAt).toLocaleString()}
                              </td>
                              <td className="text-right py-2 px-4 font-semibold">
                                ${currentItemPrice.toFixed(2)}
                              </td>
                              <td className={`text-right py-2 px-4 font-semibold ${
                                change < 0 ? "text-green-600" : change > 0 ? "text-red-600" : "text-gray-600"
                              }`}>
                                {change !== 0 ? (
                                  <>
                                    {change > 0 ? "+" : ""}{change.toFixed(2)} ({changePercent}%)
                                  </>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No price history available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
