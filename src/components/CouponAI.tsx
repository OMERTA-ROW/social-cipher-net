import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Search, Sparkles, Tag, Clock, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Deal {
  title: string;
  discount: string;
  description: string;
  category: string;
  expires: string;
  code?: string;
}

const CouponAI = () => {
  const [query, setQuery] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { toast } = useToast();

  const categories = ["Electronics", "Fashion", "Home", "Gaming", "Beauty", "Food"];

  const searchDeals = async (searchQuery: string = query, category: string = selectedCategory) => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a search term",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('coupon-ai', {
        body: { query: searchQuery, category }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive"
        });
        return;
      }

      setDeals(data.deals || []);
      
      if (data.deals && data.deals.length > 0) {
        toast({
          title: "Deals Found!",
          description: `Found ${data.deals.length} deals for you`,
        });
      }
    } catch (error) {
      console.error('Coupon search error:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search for deals. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code Copied!",
      description: `${code} copied to clipboard`,
    });
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Coupon AI</CardTitle>
        </div>
        <CardDescription>
          AI-powered coupon search for the best percentage deals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Deals</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search for products or deals..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchDeals()}
                className="flex-1"
              />
              <Button 
                onClick={() => searchDeals()}
                disabled={loading}
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => {
                    setSelectedCategory(cat);
                    searchDeals(cat, cat);
                  }}
                  disabled={loading}
                  className="w-full"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {deals.length > 0 && (
          <div className="space-y-3 mt-4 max-h-96 overflow-y-auto">
            {deals.map((deal, index) => (
              <Card key={index} className="bg-background/80 border-primary/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        {deal.title}
                        <Badge variant="secondary" className="bg-primary/20">
                          <Tag className="h-3 w-3 mr-1" />
                          {deal.discount} OFF
                        </Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {deal.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {deal.expires}
                      </span>
                      <Badge variant="outline">{deal.category}</Badge>
                    </div>
                    
                    {deal.code && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyCode(deal.code!)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {deal.code}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && deals.length === 0 && query && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No deals found. Try a different search!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CouponAI;
