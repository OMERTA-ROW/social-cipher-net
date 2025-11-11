import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useProductModeration } from "@/hooks/useProductModeration";
import { Loader2, Plus, Package, DollarSign, ShieldAlert } from "lucide-react";
import { User } from "@supabase/supabase-js";

const SellerDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    price: "",
    image_url: "",
    category: "",
    stock_quantity: "",
    shipping_cost: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { moderateProduct, loading: moderating } = useProductModeration();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchSellerProfile();
    }
  }, [user]);

  const fetchSellerProfile = async () => {
    if (!user) return;

    setLoading(true);
    const { data: profile, error: profileError } = await supabase
      .from("seller_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      toast({
        title: "Not a Seller",
        description: "You need to register as a seller first",
        variant: "destructive",
      });
      navigate("/seller-register");
      return;
    }

    setSellerProfile(profile);

    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", profile.id);

    setProducts(productsData || []);
    setLoading(false);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerProfile) return;

    // Insert product first
    const { data: newProduct, error } = await supabase.from("products").insert({
      seller_id: sellerProfile.id,
      title: productForm.title,
      description: productForm.description,
      price: parseFloat(productForm.price),
      image_url: productForm.image_url || null,
      category: productForm.category || null,
      stock_quantity: parseInt(productForm.stock_quantity) || 0,
      shipping_cost: parseFloat(productForm.shipping_cost) || 0,
    }).select().single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Automatically moderate product with AI
    toast({
      title: "Moderating Product",
      description: "AI is checking your product for policy compliance...",
    });

    const moderationResult = await moderateProduct(
      newProduct.id,
      productForm.title,
      productForm.description,
      productForm.category,
      productForm.image_url
    );

    if (moderationResult.blocked) {
      // Product was blocked, inform user
      toast({
        title: "Product Blocked",
        description: moderationResult.reason || "Product violates platform policies",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Product added and verified by AI moderation!",
      });
    }

    setIsDialogOpen(false);
    setProductForm({
      title: "",
      description: "",
      price: "",
      image_url: "",
      category: "",
      stock_quantity: "",
      shipping_cost: "",
    });
    fetchSellerProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Seller Dashboard</h1>
            <p className="text-muted-foreground">{sellerProfile?.business_name}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Fill in the details to list a new product for sale
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Product Title *</Label>
                  <Input
                    id="title"
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping">Shipping Cost</Label>
                    <Input
                      id="shipping"
                      type="number"
                      step="0.01"
                      value={productForm.shipping_cost}
                      onChange={(e) => setProductForm({ ...productForm, shipping_cost: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={productForm.stock_quantity}
                      onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Image URL</Label>
                  <Input
                    id="image"
                    type="url"
                    value={productForm.image_url}
                    onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={moderating}>
                  {moderating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Moderating...
                    </>
                  ) : (
                    "Add Product"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sellerProfile?.commission_rate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{sellerProfile?.status}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Products</CardTitle>
            <CardDescription>Manage your product listings</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No products yet. Add your first product!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card key={product.id} className={product.is_blocked ? "border-destructive" : ""}>
                    {product.is_blocked && (
                      <div className="bg-destructive/10 px-3 py-2 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                        <span className="text-xs text-destructive font-medium">Blocked by AI</span>
                      </div>
                    )}
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg">{product.title}</CardTitle>
                      <CardDescription>${product.price}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                      <p className="text-xs mt-2">Stock: {product.stock_quantity}</p>
                      {product.is_blocked && (
                        <p className="text-xs mt-2 text-destructive">
                          {product.blocked_reason}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerDashboard;
