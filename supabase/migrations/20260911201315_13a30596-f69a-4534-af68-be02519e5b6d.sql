CREATE TABLE public.mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  transport text NOT NULL DEFAULT 'http',
  auth_type text NOT NULL DEFAULT 'none',
  status text NOT NULL DEFAULT 'pending',
  last_error text,
  last_checked_at timestamptz,
  tool_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, url)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_servers TO authenticated;
GRANT ALL ON public.mcp_servers TO service_role;
ALTER TABLE public.mcp_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their MCP servers" ON public.mcp_servers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners add their MCP servers" ON public.mcp_servers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update their MCP servers" ON public.mcp_servers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete their MCP servers" ON public.mcp_servers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_mcp_servers_updated BEFORE UPDATE ON public.mcp_servers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_guard_owner_mcp_servers BEFORE UPDATE ON public.mcp_servers
  FOR EACH ROW EXECUTE FUNCTION public.guard_owner_column('user_id');

CREATE TABLE public.mcp_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.mcp_servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  title text,
  description text,
  input_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (server_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_tools TO authenticated;
GRANT ALL ON public.mcp_tools TO service_role;
ALTER TABLE public.mcp_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their MCP tools" ON public.mcp_tools
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners add their MCP tools" ON public.mcp_tools
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update their MCP tools" ON public.mcp_tools
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete their MCP tools" ON public.mcp_tools
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_mcp_tools_server ON public.mcp_tools(server_id);

CREATE TRIGGER trg_mcp_tools_updated BEFORE UPDATE ON public.mcp_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  label text NOT NULL,
  model text,
  mcp_server_id uuid REFERENCES public.mcp_servers(id) ON DELETE SET NULL,
  key_hint text,
  status text NOT NULL DEFAULT 'pending',
  last_error text,
  last_checked_at timestamptz,
  is_terminal_agent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT ALL ON public.ai_agents TO service_role;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their AI agents" ON public.ai_agents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners add their AI agents" ON public.ai_agents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update their AI agents" ON public.ai_agents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete their AI agents" ON public.ai_agents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_ai_agents_terminal_default ON public.ai_agents(user_id)
  WHERE is_terminal_agent;

CREATE TRIGGER trg_ai_agents_updated BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_guard_owner_ai_agents BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.guard_owner_column('user_id');

CREATE TABLE public.agent_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_type text NOT NULL,
  owner_id uuid NOT NULL,
  secret_type text NOT NULL,
  secret_value text NOT NULL,
  encrypted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_type, owner_id, secret_type)
);

GRANT ALL ON public.agent_secrets TO service_role;
ALTER TABLE public.agent_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server side only" ON public.agent_secrets
  FOR ALL TO service_role USING (true) WITH CHECK (true);