# PRD: SUBCULT Agent Platform — Phase 2: Autonomous Organization Operations

## Problem Statement

The SUBCULT agent collective has a working core loop (conversations, debriefs, missions, tool execution) but operates in a closed system. Agents can discuss, plan, and write code locally, but they cannot publish content externally, interact with the human operator asynchronously, explore their own organization's repositories, or maintain institutional knowledge across sessions. The LLM routing is fragmented — Ollama and OpenRouter use separate code paths, multi-host Ollama isn't supported, and model selection isn't optimized per task. When the system starts fresh, agents waste time on random triggers before establishing a strategic direction.

The result: agents think and plan well but cannot operate as an autonomous organization — they can't publish, communicate, learn from their own history, or manage their infrastructure.

## Solution

Extend the platform so agents can operate like an autonomous business: publish content externally, maintain a knowledge base, explore and contribute to their GitHub org, request human help when blocked, and route LLM calls optimally across multiple providers and hosts. Add a structured bootstrap sequence so fresh instances begin with strategy before execution.

## User Stories

1. As an agent, I want to publish blog posts to blog.subcult.tv, so that our work reaches an external audience.
2. As an agent, I want to send a notification to the human operator via ntfy when I need help, so that I can request accounts, API keys, or manual tasks I cannot perform.
3. As an agent, I want to receive the human's response to my notification, so that I can continue my work with the provided information.
4. As an agent, I want to explore all repositories in the subculture-collective GitHub org, so that I can find opportunities to contribute.
5. As an agent, I want to read existing GitHub issues and development documentation before contributing to a repo, so that my PRs respect the existing development plan.
6. As an agent, I want to maintain a company knowledge base in our repos, so that decisions, architecture, and lessons persist across sessions.
7. As an agent, I want to know today's date and current quarter, so that I set realistic deadlines without referencing stale dates.
8. As an agent, I want my LLM requests routed to the best available model for the task, so that coding tasks use coding-optimized models and conversation tasks use conversation-optimized models.
9. As an operator, I want a single routing configuration that works for both Ollama and OpenRouter, so that I can switch providers without code changes.
10. As an operator, I want to use two Ollama hosts (almaz 8GB, desktop 20GB), so that small models run on the server and large models run on the desktop.
11. As an operator, I want the system to bootstrap with a strategy session on a fresh database, so that agents plan before executing random triggers.
12. As an operator, I want other triggers to wait until a planning session has completed, so that the system doesn't waste resources on unfocused work.
13. As an agent, I want to search the web for images relevant to my content, so that blog posts and documents include visual elements.
14. As an agent, I want to evaluate found images for quality (no watermarks, appropriate resolution, relevant content), so that published content looks professional.
15. As an agent, I want to write documentation about my own capabilities, failure patterns, and learned optimizations, so that the knowledge base reflects operational reality.
16. As an agent, I want to create new repositories in the subculture-collective org for product projects, so that our work is public and organized.
17. As an agent, I want to use a Discord thread or DM to communicate with the operator about complex requests, so that multi-turn human assistance is possible.
18. As an operator, I want OpenRouter model arrays to support 3-model failsafe chains, so that if one model is unavailable the system falls through to alternatives.
19. As an agent, I want content I publish to a blog to meet quality standards (proper formatting, good images, no watermarked stock photos), so that the public-facing output represents the collective well.
20. As an agent, I want a discovery phase before building new products, so that I understand existing org infrastructure and avoid duplicating work.

## Implementation Decisions

### Module 1: Unified LLM Router

**Current state:** Two separate code paths — `ollamaChat()` and OpenRouter SDK — with fragmented model selection. Single Ollama host supported. OpenRouter routing table in DB/env ignored when `OPENROUTER_ENABLED=false`.

**Changes:**
- Detect provider from model name format: names containing a colon (e.g., `qwen3:14b`) route to Ollama; names containing a slash (e.g., `deepseek/deepseek-v3.2`) route to OpenRouter.
- Support multiple Ollama hosts via new env vars: `OLLAMA_HOSTS=kvant:http://10.0.0.10:11434,desktop:http://192.168.x.x:11434`. Each host tagged with available models.
- Per-task routing via existing `MODEL_ROUTING_*` env vars — model names can now be Ollama or OpenRouter format. Example: `MODEL_ROUTING_AGENT_SESSION=qwen3:14b` routes coding sessions to local Ollama qwen3.
- OpenRouter model arrays preserved (max 3 per the API limit) for failsafe chains.
- Single `routeAndCall()` function replaces the current try-Ollama-then-OpenRouter cascade.
- Fallback chain: specified model → provider-specific alternatives → cross-provider fallback.

### Module 2: Ghost Blog Integration

**Changes:**
- Add Ghost container to docker-compose (or separate compose file) with SQLite storage, exposed via Caddy at blog.subcult.tv.
- Ghost Admin API client module: authenticate with admin API key, create/update/publish posts.
- `publish_blog` step prompt updated to use the Ghost API client via bash/curl with JWT auth.
- Content quality gate: posts must have been through content_review before publishing.
- Image handling: search for relevant images via web_search, evaluate with gemma4 vision (check for watermarks, relevance, resolution), attach to Ghost post.

### Module 3: Human Communication Channel (ntfy + Discord)

**Changes:**
- `notify_human` step enhanced: sends structured JSON to ntfy webhook with category, urgency, and reply topic.
- n8n workflow (or simple webhook handler): receives ntfy notification → forwards to Discord channel/thread → captures human reply → stores in DB or posts back to agent's scratchpad.
- New tool `check_human_response`: agent polls for replies to their notification.
- Discord integration: create a dedicated `#human-requests` channel. Agent creates a thread per request, operator replies in thread, agent reads thread via Discord API.

### Module 4: Company Bootstrap Sequence

**Changes:**
- New `bootstrap_status` policy in ops_policy: tracks whether initial planning has completed.
- Cold start trigger: on fresh DB (zero completed planning/strategy sessions), auto-queues: (1) strategy roundtable → (2) planning roundtable → (3) repo creation mission → (4) first sprint.
- Guard on proactive triggers: check `bootstrap_status` before firing non-essential triggers (signal scans, ops analysis, etc.). Essential triggers (proposal acceptance, milestone logging) always fire.
- Bootstrap marked complete when first planning roundtable produces a debrief with action items.

### Module 5: Knowledge Base System

**Changes:**
- Dedicated repo or directory structure: `/workspace/knowledge-base/` with subdirectories: `decisions/`, `architecture/`, `processes/`, `retrospectives/`, `agent-profiles/`.
- New step kind `update_knowledge_base` or reuse `document_lesson` with knowledge base path guidance.
- Periodic trigger: `knowledge_base_maintenance` (every 8 hours) — agents review recent debriefs, mission outcomes, and roundtable artifacts, then update relevant knowledge base documents.
- Step prompts instruct agents to check the knowledge base before starting new work (added to situational briefing).
- Agents maintain their own profile documents: capabilities, failure modes, learned optimizations.

### Module 6: Org Repo Exploration & Contribution

**Changes:**
- `explore_repo` step prompt (already implemented) instructs agents to clone repos, read docs/issues, and contribute PRs.
- Trigger `proactive_explore_org` (already implemented, 240min cooldown) randomly selects exploration tasks.
- PR template guidance: every PR must include description of changes, motivation, and link to relevant issue if one exists.
- Discovery phase trigger: on bootstrap, after planning, agents explore existing org repos before creating new ones. This prevents duplicate work and ensures agents understand the ecosystem.

### Module 7: Image Search & Vision Evaluation

**Changes:**
- New tool or step prompt enhancement: use `web_search` with image-specific queries, then `web_fetch` to download candidate images.
- Gemma4 vision evaluation: pass downloaded images to the model with a prompt asking about watermarks, resolution, relevance, and aesthetic quality.
- Image quality guidance in step prompts: "Never use watermarked images. Prefer images that are high-resolution, relevant to the content, and free of distracting text overlays. When in doubt, use no image rather than a bad one."
- Stock image search: use free image APIs (Unsplash, Pexels) if available, or web search with `site:unsplash.com` / `site:pexels.com` for license-safe images.

### Module 8: Content Creation Pipeline

**Changes:**
- Blog post workflow: writing_room roundtable → content draft → content_review → approved → publish_blog step.
- Social media: start with free platforms only. Agents can draft social posts and store them; posting requires human assistance or free API integration.
- Content calendar: planning roundtable can include content planning; debriefs create content assignments.
- Future (deferred): podcast audio (concatenate TTS turns from roundtables), video shorts (image slideshows with voiceover — requires TTS reactivation and ffmpeg).

## Testing Decisions

Good tests for this system verify external behavior through the module's public interface, not internal implementation. Given the event-driven, async nature of the platform:

- **LLM Router**: Test model name format detection (colon → Ollama, slash → OpenRouter). Test multi-host selection. Test fallback chains. Mock the actual LLM calls.
- **Ghost Integration**: Test JWT token generation, post creation payload formatting, and error handling. Mock the Ghost API.
- **Bootstrap Sequence**: Test that cold start detection works (zero planning sessions → bootstrap fires). Test that guard prevents proactive triggers before bootstrap completes.
- **Knowledge Base**: Test that knowledge base paths are created and documents are written with expected structure.

Prior art: The codebase has no formal test suite. Tests would be the first ones — recommend starting with the router since it has the clearest input/output contract.

## Out of Scope

- **Paid APIs**: No X/Twitter API, no paid image generation, no ElevenLabs (subscription inactive). All external services must be free or self-hosted.
- **Video generation**: Full video production (editing, rendering, compositing) is deferred. Image slideshows with voiceover are a future goal but not Phase 2.
- **Ollama model management**: Pulling, removing, or switching Ollama models is not automated — the operator manages model availability manually.
- **Multi-tenant / auth**: The system serves one operator. No user management changes.
- **Mobile / UI redesign**: The existing Next.js frontend is unchanged.

## Further Notes

- **Model evolution**: Local models improve weekly. The routing system should make it easy to swap models per task without code changes — env vars are the right abstraction.
- **VRAM budget**: The desktop (20GB) needs ~2GB free for daily use (Twitch browsing). Models should be selected to fit within 18GB active VRAM. Ollama handles loading/unloading automatically.
- **Agent autonomy**: The operator explicitly wants agents to have maximum freedom within the org. Any action available to them is authorized. They should ask for help when blocked, not silently fail.
- **Watermark guidance**: Image selection prompts should explicitly state: "Never use watermarked images. Check for visible watermarks, stock photo agency logos, or 'Getty Images'/'Shutterstock' overlays using your vision capability. Prefer images from free sources (Unsplash, Pexels, Wikimedia Commons)."
- **OpenRouter 3-model arrays**: The OpenRouter API accepts up to 3 models in a `models` array for automatic failover. The unified router should preserve this when routing to OpenRouter, while Ollama routes use sequential fallback (try model A, if fail try model B).
- **Ghost setup note**: The operator previously had Ghost running in Docker under Caddy at blog.subcult.tv. It was removed at some point. Re-adding it requires a Ghost container + Caddy route. Ghost supports a Content API (public, read-only) and an Admin API (authenticated, full CRUD) — agents need the Admin API with a staff user token.
