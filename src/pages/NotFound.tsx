import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="hologram-title mb-4 text-5xl font-bold">Page not found</h1>
        <p className="mb-5 text-muted-foreground">That destination does not exist in Cyber Link.</p>
        <Button asChild><Link to="/">Return Home</Link></Button>
      </div>
    </div>
  );
};

export default NotFound;
