import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gamepad2, Users, Radio, Trophy, Zap } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";

interface GangMember {
  id: number;
  name: string;
  rank: string;
  level: number;
  isLive: boolean;
}

const CyberGamers = () => {
  const navigate = useNavigate();
  const [gangMembers] = useState<GangMember[]>([
    { id: 1, name: "CyberNinja", rank: "Leader", level: 99, isLive: true },
    { id: 2, name: "PixelWarrior", rank: "Elite", level: 87, isLive: false },
    { id: 3, name: "NeonGhost", rank: "Elite", level: 85, isLive: true },
    { id: 4, name: "DataHunter", rank: "Member", level: 72, isLive: false },
    { id: 5, name: "CodeBreaker", rank: "Member", level: 68, isLive: false },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation onCreatePost={() => {}} />
      
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Gamepad2 className="w-10 h-10 text-primary text-glow" />
            <h1 className="text-4xl font-bold text-primary text-glow">Cyber Gamers</h1>
          </div>
          <p className="text-muted-foreground">Join the ultimate gaming community and stream live</p>
        </div>

        <Tabs defaultValue="gang" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="gang" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Gang Members
            </TabsTrigger>
            <TabsTrigger value="games" className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Games
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Tournaments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gang" className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Gang Members
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gangMembers.map((member) => (
                  <Card key={member.id} className="p-4 bg-muted/20 border-primary/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2 border-primary/50">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                          <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-foreground">{member.name}</h3>
                          <Badge variant="outline" className="text-xs">{member.rank}</Badge>
                        </div>
                      </div>
                      {member.isLive && (
                        <Badge variant="destructive" className="animate-pulse">
                          <Radio className="w-3 h-3 mr-1" />
                          LIVE
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-primary" />
                        Level {member.level}
                      </span>
                    </div>
                    
                    <Button 
                      onClick={() => navigate("/studio")}
                      variant={member.isLive ? "default" : "outline"}
                      className="w-full"
                    >
                      {member.isLive ? "Watch Stream" : "View Profile"}
                    </Button>
                  </Card>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
              <h3 className="text-xl font-bold text-foreground mb-4">CyberLink Live Integration</h3>
              <p className="text-muted-foreground mb-4">
                Gang members can stream their gameplay directly on CyberLink Live. 
                Click the button below to start your own gaming stream!
              </p>
              <Button 
                onClick={() => navigate("/studio")}
                className="glow-primary"
              >
                <Radio className="w-4 h-4 mr-2" />
                Go Live Now
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="games" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {["Cyber Strike", "Neon Racers", "Digital Warfare", "Pixel Legends", "Code Combat", "Virtual Arena"].map((game, idx) => (
                <Card key={idx} className="p-6 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50 transition-colors">
                  <div className="aspect-video bg-muted/20 rounded-lg mb-4 flex items-center justify-center">
                    <Gamepad2 className="w-16 h-16 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{game}</h3>
                  <p className="text-sm text-muted-foreground mb-4">Join the action and compete with gang members</p>
                  <Button variant="outline" className="w-full">Play Now</Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                Upcoming Tournaments
              </h2>
              
              <div className="space-y-4">
                {[
                  { name: "Cyber Strike Championship", date: "Dec 15, 2025", prize: "$5,000" },
                  { name: "Neon Racers Grand Prix", date: "Dec 20, 2025", prize: "$3,000" },
                  { name: "Gang Wars Tournament", date: "Dec 25, 2025", prize: "$10,000" },
                ].map((tournament, idx) => (
                  <Card key={idx} className="p-4 bg-muted/20 border-primary/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{tournament.name}</h3>
                        <p className="text-sm text-muted-foreground">{tournament.date}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-primary text-primary-foreground mb-2">{tournament.prize}</Badge>
                        <Button size="sm">Register</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CyberGamers;
