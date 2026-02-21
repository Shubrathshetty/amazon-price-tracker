import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, TrendingDown, Bell, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [productUrl, setProductUrl] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [notificationEmail, setNotificationEmail] = useState(user?.email || "");
  const [isLoading, setIsLoading] = useState(false);

  const addProductMutation = trpc.products.add.useMutation();
  const { data: products, isLoading: isLoadingProducts } = trpc.products.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productUrl.trim()) {
      toast.error("Please enter a product URL");
      return;
    }

    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      toast.error("Please enter a valid target price");
      return;
    }

    if (!notificationEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsLoading(true);
    try {
      await addProductMutation.mutateAsync({
        productUrl: productUrl.trim(),
        targetPrice: parseFloat(targetPrice),
        notificationEmail: notificationEmail.trim(),
      });

      toast.success("Product added successfully! We'll start tracking it.");
      setProductUrl("");
      setTargetPrice("");
      
      // Refresh products list
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add product";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Amazon Price Tracker
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Never miss a deal again. Track Amazon product prices and get instant alerts when they drop below your target price.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <TrendingDown className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <CardTitle>Track Prices</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Monitor price changes for any Amazon product in real-time
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <Bell className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <CardTitle>Get Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Receive email notifications when prices drop below your target
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <CardTitle>View History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    See price trends and historical data for informed decisions
                  </p>
                </CardContent>
              </Card>
            </div>

            <Button
              size="lg"
              onClick={() => navigate("/login")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.name}!</h1>
          <p className="text-gray-600 mt-2">Track Amazon products and get notified when prices drop</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Add Product Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Add Product</CardTitle>
                <CardDescription>Track a new Amazon product</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <Label htmlFor="productUrl">Amazon Product URL</Label>
                    <Input
                      id="productUrl"
                      type="url"
                      placeholder="https://www.amazon.com/dp/B0..."
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste the full Amazon product link
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="targetPrice">Target Price ($)</Label>
                    <Input
                      id="targetPrice"
                      type="number"
                      placeholder="99.99"
                      step="0.01"
                      min="0"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when price drops to this amount
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="notificationEmail">Notification Email</Label>
                    <Input
                      id="notificationEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Where to send price drop alerts
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Product"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Products List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Tracked Products</CardTitle>
                <CardDescription>
                  {isLoadingProducts ? "Loading..." : `${products?.length || 0} product${products?.length !== 1 ? "s" : ""} being tracked`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : !products || products.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No products tracked yet</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Add your first product using the form on the left
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        <div className="flex items-start gap-4">
                          {product.productImage && (
                            <img
                              src={product.productImage}
                              alt={product.productName}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 line-clamp-2">
                              {product.productName}
                            </h3>
                            <div className="flex items-center gap-4 mt-2">
                              <div>
                                <p className="text-xs text-gray-500">Current Price</p>
                                <p className="text-lg font-bold text-gray-900">
                                  ${parseFloat(product.currentPrice as any).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Target Price</p>
                                <p className="text-lg font-bold text-blue-600">
                                  ${parseFloat(product.targetPrice as any).toFixed(2)}
                                </p>
                              </div>
                              <div className="ml-auto">
                                <p className="text-xs text-gray-500">Status</p>
                                <p className={`text-sm font-semibold ${
                                  parseFloat(product.currentPrice as any) <= parseFloat(product.targetPrice as any)
                                    ? "text-green-600"
                                    : "text-orange-600"
                                }`}>
                                  {parseFloat(product.currentPrice as any) <= parseFloat(product.targetPrice as any)
                                    ? "✓ Target Met"
                                    : "Waiting"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
