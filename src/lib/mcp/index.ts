import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfileTool from "./tools/get-my-profile";
import listFeedTool from "./tools/list-feed";
import createPostTool from "./tools/create-post";
import searchUsersTool from "./tools/search-users";
import followUserTool from "./tools/follow-user";
import likePostTool from "./tools/like-post";
import getPostThreadTool from "./tools/get-post-thread";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "cyber-link-social",
  title: "Cyber Link Social",
  version: "0.1.0",
  instructions:
    "Tools for Cyber Link Social, a cyber/futuristic social network. Read the signed-in user's profile, browse the following/discover feeds, read post threads, publish posts and replies, like posts, search members, and follow or unfollow people. All actions run as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyProfileTool,
    listFeedTool,
    getPostThreadTool,
    createPostTool,
    likePostTool,
    searchUsersTool,
    followUserTool,
  ],
});
