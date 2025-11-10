import { useState } from "react";
import Navigation from "@/components/Navigation";
import PostCard from "@/components/PostCard";
import CreatePostDialog from "@/components/CreatePostDialog";
import CyberSpaceBackground from "@/components/CyberSpaceBackground";
import AIBotAssistant from "@/components/AIBotAssistant";
import { toast } from "sonner";

interface Post {
  id: number;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
}

const Index = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([
    {
      id: 1,
      author: "Alex Chen",
      content: "Just discovered an amazing new feature in Cyber Link! The future of social networking is here. 🚀",
      timestamp: "2h ago",
      likes: 42,
      comments: 8,
    },
    {
      id: 2,
      author: "Sarah Mitchell",
      content: "The cyber aesthetic of this platform is absolutely stunning. Love how everything glows! ✨",
      timestamp: "4h ago",
      likes: 67,
      comments: 12,
    },
    {
      id: 3,
      author: "Marcus Johnson",
      content: "Building connections in the digital age has never been more intuitive. Welcome to Cyber Link!",
      timestamp: "6h ago",
      likes: 89,
      comments: 23,
    },
  ]);

  const handleCreatePost = (content: string) => {
    const newPost: Post = {
      id: posts.length + 1,
      author: "You",
      content,
      timestamp: "Just now",
      likes: 0,
      comments: 0,
    };
    setPosts([newPost, ...posts]);
    toast.success("Post created successfully!");
  };

  return (
    <div className="min-h-screen bg-background">
      <CyberSpaceBackground />
      <Navigation onCreatePost={() => setIsCreateDialogOpen(true)} />
      
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Feed</h2>
            <p className="text-muted-foreground">Stay connected with the cyber community</p>
          </div>
          
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} {...post} />
            ))}
          </div>
        </div>
      </main>

      <CreatePostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onPost={handleCreatePost}
      />
      
      <AIBotAssistant />
    </div>
  );
};

export default Index;
