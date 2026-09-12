import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Lock } from "lucide-react";
import ScrollDatePicker from "@/components/ScrollDatePicker";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [documentType, setDocumentType] = useState<string>("");
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [birthdate, setBirthdate] = useState("");
  const [birthdateTouched, setBirthdateTouched] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState(6);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Same-origin relative path to return to after auth (used by the OAuth consent flow).
  const rawNext = searchParams.get("next") ?? "";
  const nextPath =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

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
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(nextPath);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate(nextPath);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, nextPath]);

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

    if (!documentType || !idDocument) {
      toast({
        title: "Error",
        description: "Please select document type and upload your ID document.",
        variant: "destructive",
      });
      return;
    }

    if (!birthdate) {
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
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${nextPath}`,
          data: {
            birthdate: birthdate,
            username: username.trim(),
            display_name: displayName.trim(),
          }
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // Store birthdate privately (never exposed on public profiles)
      const { error: profileError } = await supabase
        .from('profile_private')
        .upsert({ user_id: authData.user.id, birthdate }, { onConflict: 'user_id' });

      if (profileError) console.error('Profile update error:', profileError);

      // Upload ID document
      const fileExt = idDocument.name.split('.').pop();
      const fileName = `${authData.user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('identity-documents')
        .upload(fileName, idDocument, {
          contentType: idDocument.type,
        });

      if (uploadError) throw uploadError;

      // Create verification record
      const { error: verificationError } = await supabase
        .from('identity_verification')
        .insert({
          user_id: authData.user.id,
          document_type: documentType,
          document_url: fileName,
          verification_status: 'pending',
        });

      if (verificationError) throw verificationError;

      toast({
        title: "Success",
        description: "Account created! Your identity is being verified. You can now sign in.",
      });
      
      setEmail("");
      setPassword("");
      setDocumentType("");
      setIdDocument(null);
      setBirthdate("");
      setUsername("");
      setDisplayName("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Check if account is locked before attempting login
    const { data: lockCheck } = await supabase.rpc('check_account_locked', { p_email: email });
    
    if (lockCheck && lockCheck.length > 0 && lockCheck[0].is_locked) {
      const unlockTime = new Date(lockCheck[0].unlock_time);
      setIsAccountLocked(true);
      setLockoutEndTime(unlockTime);
      toast({
        title: "Account Locked",
        description: `Too many failed login attempts. Please try again after ${unlockTime.toLocaleTimeString()}.`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

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
            description: `${error.message}. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lockout.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: error.message,
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
            Welcome to CyberLink
          </CardTitle>
          <CardDescription className="text-base">
            Enter the digital universe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
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
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot Password?
                  </Button>
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

                <div className="space-y-2">
                  <Label htmlFor="document-type" className="text-foreground">Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType} required>
                    <SelectTrigger id="document-type" className="bg-background/50 border-primary/30">
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="other">Other Government ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id-document" className="text-foreground">Upload ID Document</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="id-document"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                      required
                      className="cursor-pointer bg-background/50 border-primary/30"
                    />
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Accepted formats: JPG, PNG, PDF (Max 10MB)
                  </p>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;