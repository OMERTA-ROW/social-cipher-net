import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, ShieldCheck, AlertTriangle, Users, Eye, Ban } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/Navigation";

const CommunityGuidelines = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Community Guidelines</h1>
          <p className="text-lg text-muted-foreground">
            Welcome to CyberLink. These guidelines help create a safe, inclusive, and vibrant community for all users.
          </p>
        </div>

        {/* Critical Rules */}
        <Alert variant="destructive" className="mb-6">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">Zero Tolerance Policies</AlertTitle>
          <AlertDescription className="text-base mt-2">
            The following content is strictly prohibited and will result in immediate account suspension and reporting to authorities:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Child Sexual Abuse Material (CSAM)</strong> - Any sexual content involving minors</li>
              <li><strong>Murder & Extreme Violence</strong> - Content depicting killings or extreme graphic violence showing death</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Age Restrictions */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <CardTitle>Age-Restricted Content (18+)</CardTitle>
            </div>
            <CardDescription>Content restricted to users 18 years and older</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Adult Nudity & Sexual Content</h3>
              <p className="text-muted-foreground">
                Explicit nudity and sexual content involving adults is permitted but restricted to users 18 years or older. This includes:
              </p>
              <ul className="list-disc ml-6 mt-2 text-muted-foreground">
                <li>Explicit nudity (genitals, breasts in sexual context)</li>
                <li>Sexual acts or explicit sexual content</li>
                <li>Adult-oriented material and pornographic content</li>
              </ul>
              <Alert className="mt-4">
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  Our AI automatically detects and restricts adult content. Users under 18 cannot view this content.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Unrestricted Content */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Unrestricted Content</CardTitle>
            </div>
            <CardDescription>Content available to all users (13+)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The following content types are NOT age-restricted and are available to all users:
            </p>
            <ul className="list-disc ml-6 text-muted-foreground space-y-2">
              <li><strong>Violence & Action</strong> - General violence, action content, fighting, combat sports</li>
              <li><strong>Profanity & Language</strong> - Swear words, offensive language, mature dialogue</li>
              <li><strong>Mature Themes</strong> - Drug references, alcohol, mature storytelling</li>
              <li><strong>Gore & Horror</strong> - Horror content, graphic effects (excluding actual murder)</li>
              <li><strong>Suggestive Content</strong> - Suggestive themes without explicit nudity</li>
            </ul>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* General Community Standards */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Community Standards</h2>

          <Card>
            <CardHeader>
              <CardTitle>Respect & Conduct</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold mb-1">Harassment & Bullying</h4>
                <p className="text-sm text-muted-foreground">
                  Do not engage in harassment, bullying, doxxing, or targeted hate speech. Respect others' privacy and dignity.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Hate Speech</h4>
                <p className="text-sm text-muted-foreground">
                  Content promoting hatred or violence against individuals or groups based on race, ethnicity, religion, gender, sexual orientation, or disability is prohibited.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Spam & Manipulation</h4>
                <p className="text-sm text-muted-foreground">
                  Do not spam, engage in vote manipulation, or artificially inflate engagement metrics.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Illegal Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Do not post content that promotes or facilitates illegal activities, including:
              </p>
              <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
                <li>Sale of illegal drugs or controlled substances</li>
                <li>Human trafficking or exploitation</li>
                <li>Sale of weapons to prohibited buyers</li>
                <li>Coordinating criminal activities</li>
                <li>Copyright infringement and piracy</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold mb-1">Age Verification</h4>
                <p className="text-sm text-muted-foreground">
                  Users must be at least 13 years old. Government-issued ID verification is required at signup.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Account Security</h4>
                <p className="text-sm text-muted-foreground">
                  Keep your account secure. Do not share login credentials or use someone else's account.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Platform Integration</h4>
                <p className="text-sm text-muted-foreground">
                  When connecting external accounts (Instagram, TikTok, YouTube, etc.), you are responsible for content posted to those platforms.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Monetization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                For creators monetizing content through our platform:
              </p>
              <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
                <li>Adult content must be clearly marked as 18+</li>
                <li>You must have rights to all content you monetize</li>
                <li>Payment information must be accurate and verified</li>
                <li>Tax compliance is your responsibility</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Enforcement */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              <CardTitle>Enforcement & Appeals</CardTitle>
            </div>
            <CardDescription>How we enforce these guidelines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">AI Content Moderation</h4>
              <p className="text-sm text-muted-foreground">
                Our AI system automatically scans content for policy violations. Adult content is age-gated, while prohibited content (CSAM, murder) is immediately blocked.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Consequences</h4>
              <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
                <li><strong>CSAM or Murder Content:</strong> Immediate permanent ban + law enforcement notification</li>
                <li><strong>Harassment/Hate Speech:</strong> Warning → Temporary suspension → Permanent ban</li>
                <li><strong>Spam/Manipulation:</strong> Content removal → Account restrictions</li>
                <li><strong>Minor Policy Violations:</strong> Warning or content removal</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Appeals Process</h4>
              <p className="text-sm text-muted-foreground">
                If you believe content was incorrectly flagged or your account was wrongly suspended, you can appeal through the Security page or contact support. Appeals for CSAM or murder violations will not be accepted.
              </p>
            </div>
          </CardContent>
        </Card>

        <Alert className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Updates to Guidelines</AlertTitle>
          <AlertDescription>
            These guidelines may be updated periodically. Continued use of the platform constitutes acceptance of the current guidelines. Major changes will be announced to users.
          </AlertDescription>
        </Alert>

        <div className="text-center text-sm text-muted-foreground">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p className="mt-2">Questions? Contact us at support@cyberlink.com</p>
        </div>
      </div>
    </div>
  );
};

export default CommunityGuidelines;