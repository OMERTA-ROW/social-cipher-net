import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { signInPath } from "@/lib/authRedirect";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Sidebar session control. Reads the live auth state so the label always
 * matches reality: "Log Out" when signed in, "Log In" when signed out.
 */
const SidebarAuthButton = ({ collapsed }: { collapsed?: boolean }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (signedIn === null) return null;

  const onClick = async () => {
    if (signedIn) {
      await supabase.auth.signOut();
      queryClient.clear();
      navigate("/login", { replace: true });
    } else {
      navigate(signInPath());
    }
  };

  const Icon = signedIn ? LogOut : LogIn;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors",
        "hover:text-primary hover:[text-shadow:0_0_10px_hsl(var(--primary)/0.75)]",
        collapsed ? "justify-center" : "justify-center xl:justify-start",
      )}
      title={signedIn ? "Log Out" : "Log In"}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="hidden xl:inline">{signedIn ? "Log Out" : "Log In"}</span>
    </Button>
  );
};

export default SidebarAuthButton;
