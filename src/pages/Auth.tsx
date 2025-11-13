import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import RealisticSpaceBackground from "@/components/RealisticSpaceBackground";
import MatrixOverlay from "@/components/MatrixOverlay";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [documentType, setDocumentType] = useState<string>("");
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [birthdate, setBirthdate] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            birthdate: birthdate,
          }
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // Update profile with birthdate
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ birthdate })
        .eq('id', authData.user.id);

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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <RealisticSpaceBackground />
      <MatrixOverlay />
      
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
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                <Button 
                  type="submit" 
                  className="w-full glow-primary hover:scale-105 transition-transform" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enter CyberLink
                </Button>
              </form>
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
                  <Label htmlFor="birthdate" className="text-foreground">Date of Birth</Label>
                  <Input
                    id="birthdate"
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="bg-background/50 border-primary/30 focus:border-primary transition-all"
                  />
                  <p className="text-xs text-muted-foreground">
                    You must be at least 13 years old. Users under 18 cannot view adult nudity/sexual content.
                  </p>
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