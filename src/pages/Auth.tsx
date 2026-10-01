import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";
import ScrollDatePicker from "@/components/ScrollDatePicker";
import { safeReturnPath } from "@/lib/authRedirect";
import { fetchOnboardingComplete } from "@/hooks/useOnboarding";

type RecoveryState = "none" | "pending" | "ready" | "expired";

const friendlyAuthError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/invalid login credentials/i.test(message)) return "The email or password is incorrect.";
  if (/email not confirmed/i.test(message)) return "Confirm your email before signing in.";
  if (/rate limit|too many requests/i.test(message)) return "Too many attempts. Please wait and try again.";
  if (/expired|invalid.*token|session.*missing/i.test(message)) return "This link has expired or was already used.";
  return fallback;
};

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [birthdate, setBirthdate] = useState("");
  const [birthdateTouched, setBirthdateTouched] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(() => window.location.pathname === "/forgot-password");
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState(6);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Password-recovery state. While a recovery link is being processed we must
  // never bounce the user to the app: they have not chosen a new password yet.
  const [recovery, setRecovery] = useState<RecoveryState>(() => {
    if (typeof window === "undefined") return "none";
    const hash = window.location.hash ?? "";
    const requested =
      window.location.pathname === "/reset-password" ||
      new URLSearchParams(window.location.search).get("reset") === "true" ||
      hash.includes("type=recovery") ||
      hash.includes("error=");
    if (!requested) return "none";
    return hash.includes("error=") ? "expired" : "pending";
  });
  const [recoveryError, setRecoveryError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const hash = new URLSearchParams((window.location.hash ?? "").replace(/^#/, ""));
    const description = hash.get("error_description");
    return description ? friendlyAuthError(description.replace(/\+/g, " "), "This reset link is no longer valid.") : null;
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Same-origin relative path to return to after auth (used by the OAuth consent flow).
  const rawNext = searchParams.get("next");
  const nextPath = rawNext ? safeReturnPath(rawNext) : "/dashboard";
  const [checkEmailFor, setCheckEmailFor] = useState<string | null>(null);
  const inRecovery = recovery !== "none";
  const initialTab = location.pathname === "/signup" ? "signup" : "signin";

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Error",
        description: friendlyAuthError(error, "We could not send the reset email. Please try again."),
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Password reset email sent! Check your inbox.",
      });
      setShowForgotPassword(false);
    }

    setLoading(false);
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Both passwords must match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      const message = friendlyAuthError(error, "We could not update your password. Please request a new reset link.");
      setRecoveryError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
      return;
    }

    toast({ title: "Password updated", description: "You are signed in with your new password." });
    setNewPassword("");
    setConfirmPassword("");
    setRecovery("none");
    window.history.replaceState(null, "", `${window.location.pathname}`);
    navigate(nextPath);
  };

  useEffect(() => {
    let active = true;

    // Where a signed-in member goes: their welcome setup the first time,
    // otherwise the page they came from. A read failure never traps anyone.
    const continueSignedIn = async (userId: string) => {
      let done = true;
      try {
        done = await fetchOnboardingComplete(userId);
      } catch {
        done = true;
      }
      if (!active) return;
      navigate(done ? nextPath : "/onboarding", { replace: true });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (!session) {
        // A recovery link that produced no session is expired or already used.
        if (recovery === "pending") {
          setRecovery("expired");
          setRecoveryError((prev) => prev ?? "This reset link is no longer valid. Request a new one.");
        }
        return;
      }
      if (recovery === "pending") {
        setRecovery("ready");
        return;
      }
      if (recovery === "none") continueSignedIn(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") {
        setRecovery("ready");
        return;
      }
      if (!session) return;
      if (recovery !== "none") return;
      continueSignedIn(session.user.id);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate, nextPath, recovery]);


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username.trim().length < 3 || !displayName.trim()) {
      toast({
        title: "Error",
        description: "Please choose a username (3+ characters) and a display name.",
        variant: "destructive",
      });
      return;
    }

    if (!birthdate) {
      setBirthdateTouched(true);

      toast({
        title: "Error",
        description: "Please enter your date of birth.",
        variant: "destructive",
      });
      return;
    }

    // Validate age (must be at least 13 years old)
    const birthDate = new Date(birthdate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

    if (actualAge < 13) {
      toast({
        title: "Error",
        description: "You must be at least 13 years old to create an account.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            birthdate: birthdate,
            username: username.trim(),
            display_name: displayName.trim(),
          }
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      if (!authData.session) setCheckEmailFor(email);
      else toast({ title: "Account created", description: "Your account is ready." });
      
      setEmail("");
      setPassword("");
      setBirthdate("");
      setUsername("");
      setDisplayName("");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: friendlyAuthError(error, "We could not create your account. Check your details and try again."),
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Record failed login attempt
      const { data: attemptResult } = await supabase.rpc('record_failed_login', { p_email: email });
      
      if (attemptResult && attemptResult.length > 0) {
        const result = attemptResult[0];
        if (result.is_locked) {
          const unlockTime = new Date(result.unlock_time);
          setIsAccountLocked(true);
          setLockoutEndTime(unlockTime);
          toast({
            title: "Account Locked",
            description: `Too many failed login attempts. Your account is locked until ${unlockTime.toLocaleTimeString()}.`,
            variant: "destructive",
          });
        } else {
          const remaining = 6 - result.attempts;
          setRemainingAttempts(remaining);
          toast({
            title: "Error",
            description: `${friendlyAuthError(error, "Sign-in failed.")} ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lockout.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: friendlyAuthError(error, "Sign-in failed. Check your details and try again."),
          variant: "destructive",
        });
      }
    } else {
      // Clear login attempts on successful login
      await supabase.rpc('clear_login_attempts', { p_email: email });
      setIsAccountLocked(false);
      setRemainingAttempts(6);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      
      <Card className="w-full max-w-md relative z-10 bg-card/95 backdrop-blur-xl border-primary/20 shadow-2xl shadow-primary/10 animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            {inRecovery ? "Choose a new password" : "Welcome to CyberLink"}
          </CardTitle>
          <CardDescription className="text-base">
            {inRecovery ? "Finish resetting your account password" : "Enter the digital universe"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inRecovery ? (
            <div className="space-y-4">
              {recovery === "pending" && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking your reset link…
                </div>
              )}

              {recovery === "expired" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
                    <Lock className="mx-auto mb-2 h-7 w-7 text-destructive" />
                    <p className="font-semibold text-destructive">Reset link not valid</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {recoveryError ?? "This reset link has expired or was already used."}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setRecovery("none");
                      setRecoveryError(null);
                      setShowForgotPassword(true);
                      window.history.replaceState(null, "", "/login");
                    }}
                  >
                    Request a new reset link
                  </Button>
                </div>
              )}

              {recovery === "ready" && (
                <form onSubmit={handleSetNewPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-foreground">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-background/50 border-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-foreground">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-background/50 border-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  {recoveryError && <p className="text-sm text-destructive">{recoveryError}</p>}
                  <Button type="submit" className="w-full glow-primary" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save new password
                  </Button>
                </form>
              )}
            </div>
          ) : checkEmailFor ? (
            <div className="space-y-4 text-center" role="status">
              <h3 className="text-lg font-semibold text-foreground">Check your email to confirm your account</h3>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <span className="text-foreground">{checkEmailFor}</span>. Open it to activate your account, then sign in.
              </p>
              <Button variant="outline" className="w-full" onClick={() => { setCheckEmailFor(null); navigate("/login"); }}>
                Back to sign in
              </Button>
            </div>
          ) : (
          <Tabs key={location.pathname} defaultValue={initialTab} className="w-full">

            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                Sign Up
              </TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="animate-fade-in">
              {showForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Reset Password</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter your email to receive a password reset link
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-foreground">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50 border-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full glow-primary hover:scale-105 transition-transform" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-primary hover:text-primary/80"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Back to Sign In
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  {isAccountLocked && lockoutEndTime && (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
                      <Lock className="h-8 w-8 mx-auto mb-2 text-destructive" />
                      <p className="text-destructive font-semibold">Account Locked</p>
                      <p className="text-sm text-muted-foreground">
                        Try again after {lockoutEndTime.toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsAccountLocked(false);
                        setRemainingAttempts(6);
                      }}
                      required
                      className="bg-background/50 border-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-background/50 border-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  {remainingAttempts < 6 && remainingAttempts > 0 && (
                    <p className="text-sm text-amber-500 text-center">
                      ⚠️ {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full glow-primary hover:scale-105 transition-transform" 
                    disabled={loading || isAccountLocked}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enter CyberLink
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-primary hover:text-primary/80 p-0 h-auto"
                    onClick={() => navigate(`/forgot-password${nextPath === "/" ? "" : `?next=${encodeURIComponent(nextPath)}`}`)}
                  >
                    Forgot Password?
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    New here?{" "}
                    <Link to={`/signup${rawNext ? `?next=${encodeURIComponent(nextPath)}` : ""}`} className="font-medium text-primary hover:underline">
                      Create Account
                    </Link>
                  </p>
                </form>
              )}
            </TabsContent>
            <TabsContent value="signup" className="animate-fade-in">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background/50 border-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-foreground">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-background/50 border-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-foreground">Username</Label>
                  <Input
                    id="signup-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                    placeholder="yourhandle"
                    required
                    minLength={3}
                    maxLength={24}
                    className="bg-background/50 border-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-displayname" className="text-foreground">Display Name</Label>
                  <Input
                    id="signup-displayname"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How others see you"
                    required
                    maxLength={40}
                    className="bg-background/50 border-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Date of Birth</Label>
                  <ScrollDatePicker
                    value={birthdate}
                    onChange={(v) => {
                      setBirthdateTouched(true);
                      setBirthdate(v);
                    }}
                  />
                  {birthdateTouched && !birthdate ? (
                    <p className="text-xs text-destructive">Please choose your date of birth.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Scroll each column to pick your date. You must be at least 13 years old. Users under 18 cannot view adult nudity/sexual content.
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full glow-primary hover:scale-105 transition-transform" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Join CyberLink
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          )}
          <div className="mt-6 flex justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/security" className="hover:text-primary">Privacy & security</Link>
            <Link to="/community-guidelines" className="hover:text-primary">Terms & guidelines</Link>
          </div>
        </CardContent>

      </Card>
    </div>
  );
};

export default Auth;