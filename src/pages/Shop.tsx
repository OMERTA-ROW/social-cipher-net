import AppShell from "@/components/layout/AppShell";
import FeedShopTab from "@/components/feed/FeedShopTab";

const Shop = () => (
  <AppShell>
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Shop</h1>
        <p className="text-sm text-muted-foreground">
          Every store on Cyber Link, in one place.
        </p>
      </header>
      <FeedShopTab />
    </div>
  </AppShell>
);

export default Shop;
