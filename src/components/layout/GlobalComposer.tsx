import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PostComposer from "@/components/post/PostComposer";

/** Pages that already show their own post form (or shouldn't show one). */
const EXCLUDED = ["/", "/index", "/profile", "/auth", "/reset-password", "/onboarding"];

/** Compact post form shown at the top of every signed-in page. */
const GlobalComposer = () => {
  const { pathname } = useLocation();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!signedIn || EXCLUDED.includes(pathname)) return null;
  return (
    <div className="mb-6">
      <PostComposer />
    </div>
  );
};

export default GlobalComposer;
