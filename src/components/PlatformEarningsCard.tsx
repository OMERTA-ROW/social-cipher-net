import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, ShoppingBag } from "lucide-react";

export const PlatformEarningsCard = () => {
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformEarnings();
  }, []);

  const fetchPlatformEarnings = async () => {
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = roles?.some(r => r.role === 'admin');
      if (!isAdmin) return;

      // Fetch platform earnings
      const { data: earnings } = await supabase
        .from('platform_earnings')
        .select('amount');

      const total = earnings?.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0;
      setTotalEarnings(total);

      // Fetch total sales count
      const { data: sales } = await supabase
        .from('sales')
        .select('id', { count: 'exact' });

      setTotalSales(sales?.length || 0);
    } catch (error) {
      console.error('Error fetching platform earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || totalEarnings === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Platform Earnings</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">2% commission on all sales</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSales}</div>
          <p className="text-xs text-muted-foreground">Transactions tracked</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Per Sale</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalSales > 0 ? (totalEarnings / totalSales).toFixed(2) : '0.00'}
          </div>
          <p className="text-xs text-muted-foreground">Platform commission per transaction</p>
        </CardContent>
      </Card>
    </div>
  );
};
