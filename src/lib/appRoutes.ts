export interface AppRouteMeta {
  path: string;
  title: string;
  description: string;
  parent?: string;
  navigation?: "primary" | "create" | "markets" | "worlds" | "support" | "hidden";
  system?: boolean;
}

/** One source of truth for route labels, breadcrumbs, and navigation visibility. */
export const APP_ROUTES: AppRouteMeta[] = [
  { path: "/", title: "Home", description: "Your live, social, and creator feed across Cyber Link.", navigation: "primary" },
  { path: "/dashboard", title: "Dashboard", description: "Your creative programs and site activity in one place.", navigation: "primary" },
  { path: "/profile", title: "Profile", description: "Your public identity, posts, media, and radio.", navigation: "primary" },
  { path: "/messages", title: "Messages", description: "Private conversations with people on Cyber Link.", navigation: "primary" },
  { path: "/studio", title: "Live Studio", description: "Create, connect broadcast tools, and manage live sessions.", navigation: "create" },
  { path: "/theater", title: "Movie Theater", description: "Host and join synchronized screenings and live discussions.", navigation: "create" },
  { path: "/connectors", title: "Connectors", description: "Link the services and tools you use with Cyber Link.", navigation: "create" },
  { path: "/integrations", title: "Account Connections", description: "Review and manage services linked to your account.", navigation: "hidden", system: true },
  { path: "/settings", title: "Account Settings", description: "Manage your profile, password, notifications, and connections.", navigation: "hidden", system: true },
  { path: "/shop", title: "Shop", description: "Browse every active Cyber Link storefront in one place.", navigation: "markets" },
  { path: "/trading", title: "Trading", description: "Monitor real markets and manage your saved chart workspace.", navigation: "markets" },
  { path: "/exchange", title: "Exchange", description: "Check fees, link exchange accounts, and follow live markets.", navigation: "markets" },
  { path: "/monetization", title: "Monetization", description: "Track earnings, affiliate links, brand deals, and payouts.", navigation: "markets" },
  { path: "/miners", title: "Miners", description: "Manage eligible mining tools and subscription access.", navigation: "markets" },
  { path: "/cyber-arena", title: "Arena", description: "Organize saved tools, token pools, and your gaming network.", navigation: "worlds" },
  { path: "/cyber-world", title: "Cyber World", description: "Open community, discovery, live, and market workspaces.", navigation: "worlds" },
  { path: "/terminal", title: "Terminal", description: "Use the read-only AI market terminal within your plan limits.", navigation: "worlds" },
  { path: "/cyber-streamer", title: "Streaming Command Center", description: "Monitor connected streaming services and live activity.", parent: "/studio" },
  { path: "/affiliate", title: "Marketplace", description: "Browse real products and build trackable affiliate links.", parent: "/shop" },
  { path: "/affiliate-links", title: "Affiliate Links", description: "Manage external affiliate destinations and tracking.", parent: "/monetization" },
  { path: "/subscription", title: "Subscriptions", description: "Compare Cyber Link plans and recurring access.", parent: "/monetization" },
  { path: "/seller-register", title: "Seller Registration", description: "Create the storefront profile used to sell on Cyber Link.", parent: "/shop" },
  { path: "/seller-dashboard", title: "Seller Dashboard", description: "Manage your storefront, products, stock, and options.", parent: "/shop" },
  { path: "/advertise", title: "Advertise", description: "Create and manage native advertising campaigns.", parent: "/monetization" },
  { path: "/security", title: "Security", description: "Review account security, sessions, and protection settings.", navigation: "support" },
  { path: "/community-guidelines", title: "Community Guidelines", description: "The safety and conduct standards for Cyber Link.", navigation: "support" },
  { path: "/verification", title: "Verification", description: "Review or submit your account verification.", navigation: "support" },
  { path: "/moderation", title: "Moderation", description: "Review reported content and record moderation decisions.", navigation: "hidden" },
  { path: "/backgrounds", title: "Space Backgrounds", description: "Control the full-screen galaxy workspace.", navigation: "support" },
  { path: "/voyage", title: "Solar System Voyage", description: "Explore the solar system from the ship view.", navigation: "support" },
  { path: "/ceo", title: "Owner Console", description: "Private platform revenue and AI operations.", navigation: "hidden" },
  { path: "/product/:productId", title: "Product", description: "Product details, options, and purchase controls.", parent: "/shop" },
  { path: "/store/:slug", title: "Store", description: "A Cyber Link seller storefront and its active products.", parent: "/shop" },
  { path: "/profile/:userId", title: "Member Profile", description: "Posts, media, radio, and connections for this member.", parent: "/" },
  { path: "/live/:streamId", title: "Live Room", description: "Watch the live session and join its conversation.", parent: "/" },
  { path: "/post/:postId", title: "Post", description: "Read the full post and its replies.", parent: "/" },
  { path: "/kit/:slug", title: "Media Kit", description: "A creator's public audience and collaboration profile.", parent: "/monetization" },
  { path: "/token-purchase", title: "Token Purchase", description: "Complete a token purchase with explicit confirmation.", parent: "/" },
  { path: "/auth", title: "Sign In", description: "Access or create your Cyber Link account.", navigation: "hidden", system: true },
  { path: "/login", title: "Sign In", description: "Access your Cyber Link account.", navigation: "hidden", system: true },
  { path: "/signup", title: "Sign Up", description: "Create your Cyber Link account.", navigation: "hidden", system: true },
  { path: "/forgot-password", title: "Forgot Password", description: "Request a secure password reset link.", navigation: "hidden", system: true },
  { path: "/reset-password", title: "Reset Password", description: "Choose a new password from a recovery link.", navigation: "hidden", system: true },
  { path: "/onboarding", title: "Welcome Setup", description: "Finish setting up your Cyber Link account.", navigation: "hidden", system: true },
  { path: "/verification-success", title: "Verification Result", description: "Confirmation of your verification request.", navigation: "hidden", system: true },
  { path: "/r/:code", title: "Affiliate Redirect", description: "A verified affiliate-link redirect.", navigation: "hidden", system: true },
  { path: "/.lovable/oauth/consent", title: "App Authorization", description: "Review an external app access request.", navigation: "hidden", system: true },
];

const segments = (value: string) => value.split("/").filter(Boolean);

export const routeMatches = (pattern: string, pathname: string) => {
  const expected = segments(pattern);
  const actual = segments(pathname);
  return expected.length === actual.length && expected.every((part, index) => part.startsWith(":") || part === actual[index]);
};

export const getRouteMeta = (pathname: string) => APP_ROUTES.find((route) => routeMatches(route.path, pathname));

export const getRouteMetaByPath = (path: string) => APP_ROUTES.find((route) => route.path === path);

export const isKnownInternalPath = (path: string) => {
  const pathname = path.split(/[?#]/, 1)[0] || "/";
  return APP_ROUTES.some((route) => routeMatches(route.path, pathname));
};