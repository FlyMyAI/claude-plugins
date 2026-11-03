---
name: flymyai
description: Use FlyMyAI to generate images, video and audio, call services and the user's connected accounts, get web data, and run or schedule cloud agents. Load it whenever FlyMyAI or flymy.ai comes up.
metadata:
  version: "1.27.3"
---

# FlyMyAI - assistant operating guide

Platform version: Headless Cloud 1.27.3 (2026-11-03). https://flymy.ai/changelog.md,
https://flymy.ai/changelog.json. On connection/news: `whats_new(since=last_seen_version)`.

> `https://flymy.ai/skill.md` and `https://flymy.ai/AGENTS.md` serve the same bytes.
> Remote Agents MCP `0.7.0-rc.69`; Python SDK `1.2.0rc25`.
> Check live schemas and installed packages; rc.69 is not on npm.

## Start here - verify FlyMyAI or recover

One bounded read-only call to `whoami`, `tools/list` or `search_tools` checks
`flymyai`. Do not reinstall a connected server. Read the live `update_agent` (or
other) schema from MCP `tools/list` before mutations; never guess fields.

Without FlyMyAI tools, do not claim success, invent tools or substitute native sharing. Use:

1. Sign up: https://app.flymy.ai/signup
2. Connect a service: https://app.flymy.ai/mcp-configs#notion (any slug); a
   signed-out user signs up and lands back there.
3. Share it there: My MCPs -> **Share** -> email and 1-30 days -> send; listed
   at https://app.flymy.ai/mcp-configs?tab=shared. "Share my Notion with <email>
   via FlyMyAI" means this personal MCP sharing (Shared connections below), not
   Notion's own sharing.
4. Or connect this assistant (sign-in, no key): Claude Code,
   `claude mcp add --transport http flymyai https://mcp-agents.flymy.ai/mcp`
   then `/mcp` -> Authenticate; claude.ai or Claude Desktop, Settings ->
   Connectors -> Add custom connector, same URL.

Key clients use that URL (`FLYMYAI_MCP_URL`) and an `X-API-Key` from a secret
manager, never pasted into chat. Without MCP, use REST only with an
authenticated `FLYMYAI_AGENTS_API_ROOT` (production
`https://backend.flymy.ai/api/v1/agents`); otherwise report that preflight is
blocked. A release-candidate run must use an explicit candidate
release contract, MCP, skill, and Agents API roots and must never fall back to
production.

Discover services/models with `search_tools`/`list_*` first. Discovery is not success.

Guides: https://flymy.ai/use-cases/
MCP setup guides and scoped reads, including Grafana: https://flymy.ai/mcp/

## Build a project

1. `whoami` - FlyMyAI is connected, and to which account.
2. `search_tools` with a plain-English intent per service, then
   `get_tool_schemas` for exact fields.
3. If a service is not `configured`, `add_tool`; the user finishes the hosted
   link; confirm with `list_configured_tools`.
4. `create_agent` once: goal, numeric `available_tools`, `input_schema`,
   `output_schema`, optional `model` from `list_agent_models`.
5. `run_agent` with a new `operation_key`; poll `get_run` until
   `poll_complete=true`; `read_run_result` if the preview is truncated.
6. Refine the same agent (`update_agent` or `append_message`) until the user
   accepts one completed run.
7. `freeze_agent` with that execution ID; poll `get_compilation` until
   `status=compiled`.
8. `run_frozen` with a new `operation_key` and poll `get_run` before calling it
   production-ready.
9. Ship: a schedule (`update_compilation`), a webhook (`triggers_v1_create`),
   a public template (`set_agent_public`), a subagent of a lead, or a product
   deployment.
10. Media: `recommend_model`, `get_pricing`, then `run_model`.

| Section | Docs |
| --- | --- |
| Start here | https://docs.flymy.ai/agents/guides/connect-your-agent |
| Tools and connections | https://docs.flymy.ai/agents/concepts/tools |
| Multiple accounts and resource sets | https://docs.flymy.ai/agents/guides/mcp-resource-sets |
| Models | https://docs.flymy.ai/api/models-endpoints |
| Agents, every MCP tool | https://docs.flymy.ai/agents/guides/agent-gateway-reference |
| Projects, artifacts, sites | https://docs.flymy.ai/agents/guides/projects |
| Embedded and resale | https://docs.flymy.ai/agents/guides/embedded-resale |
| Browser Use | https://docs.flymy.ai/mcp/browser-use |
| Your own model on GPU | https://docs.flymy.ai/cli/intro |
| Release maintainers only | https://docs.flymy.ai/agents/guides/release-gates |

## Tools and connections

Public Instagram: $0.01/billed shared-key call.

1. Call `search_tools` with a plain-English intent; read `tool`, `action`,
   `runtime_name`, and `configured`. Never download the full catalog
   per intent.
2. Call `get_tool_schemas` with the `runtime_name` when search did not inline
   the request schema. Never call a create, update, send, append, batch-write,
   or delete action with empty or guessed arguments to learn its schema. If
   lookup returns `not_found`, use the agent runtime or stop - do not probe.
3. If configured, call `execute_tool` with exactly `tool`, `action`,
   `arguments`, and a caller-owned stable `operation_key`. To select a
   non-default instance, pass its exact configured-tool public UUID as
   `connection_id`; omission is supported only while one eligible connection is
   unambiguous. Run OAuth/Composio actions inside an agent.
4. If not configured, call `add_tool` with the tool slug. It returns the exact
   connection record or guidance with a hosted
   `https://app.flymy.ai/mcp-configs#<slug>?connection_id=<public UUID>` link.
   After the user finishes, call `list_configured_tools`, match the exact
   `public_id` and `alias`, and inspect `is_configured`, `connection_status`,
   `connection_status_reason`, `connection_status_valid_until`, and
   `connect_url`. Do not invent a `setup_url` response field.
5. To revoke exactly one connection, call `delete_tool` with its numeric `id`
   (REST: `DELETE /api/v1/agents/tools/{id}/`); sibling connections of the
   same toolkit keep working, and the revoked row fails before any provider
   call.

Search rows also carry `ready`, `access`, `price` and 7-day `health`: prefer a
ready, healthy row and quote `price` before a paid call.

```text
search_tools({"query":"telegram list dialogs"})
get_tool_schemas({"runtime_names":["custom--telegram--telegram_list_dialogs"]})
execute_tool({"tool":"telegram","action":"telegram_list_dialogs",
  "arguments":{"query":"FlyMyAI"},"operation_key":"telegram-dialogs-<uuid>"})
```

Use `arguments`; `params` or `input` returns HTTP 400.
`outcome=rejected` means FlyMyAI or the provider refused before any effect
(wrong arguments, missing setup, provider refusal): fix the call and send it
with a new `operation_key`. `outcome=unknown` means it may have taken effect:
reconcile, never repeat automatically.

Without MCP tool calls, POST
`{"tool":"system-utils","action":"search_tools","arguments":{"query":"...","limit":20}}`
and then `get_tool_schemas` (at most 10 runtime names) to
`$FLYMYAI_AGENTS_API_ROOT/custom-tools/call/` with `X-API-KEY`; read
`result.schemas[runtime_name].request_schema` and call the returned `module` as
`tool`.

Telegram Bot `telegram_bot.send_document` sends a long report as a UTF-8 `.txt`
attachment with a short caption; pass an explicit `chat_id`, it is never inferred.

### Personal default - one account, no MCP resource-set setup

Use `mcp_access_mode` `legacy` in the implicit personal space; `scoped` needs
explicit set grants. Search by intent, use hosted setup.
`add_tool` without `alias` selects the idempotent `default` connection. Match
`mcp_tool`/`alias:"default"` in `list_configured_tools`; put its numeric `id`
in `available_tools`.
Require `is_configured:true`: `connected` is ready; `setup_required` or
`reconnect_required` needs setup, `verification_pending` a bounded live read.
Report `temporarily_unavailable`, never bypass it.

Do not require resource sets, groups, slots, grants, principals, revisions or
mappings for a first personal flow. Add the exact connection to a set later,
without rebuilding the agent or reconnecting the account.

### Grow into multiple accounts and MCP resource sets

Aliases are labels; authorization, dispatch, and freeze use stable public IDs.
Add each account with `add_tool` and a unique `alias` (ASCII letters, digits,
`_`, `-`), create one set with `create_mcp_resource_set` and a caller-owned
`operation_key`, write the full membership with
`replace_mcp_resource_set_members` at the current revision (reload after 409),
and grant it through `mcp_resource_set_ids` with `mcp_access_mode:"scoped"`:

```text
support = add_tool({"mcp_tool":"gmail","alias":"support"})
rs = create_mcp_resource_set({"name":"Inbox operations",
  "management_mode":"flymyai","operation_key":"inbox-set-<uuid>"})
rs = replace_mcp_resource_set_members({"resource_set_id":rs.public_id,
  "expected_revision":rs.revision,"members":[{"resource_type":"user_mcp_tool",
  "resource_id":support.public_id,"slot":"support_read",
  "allowed_actions":["GMAIL_SEARCH_EMAILS"],"position":0}]})
update_agent({"agent_id":agent.uuid,"available_tools":[],
  "mcp_resource_set_ids":[rs.public_id],"mcp_access_mode":"scoped"})
```

An omitted attachment field is unchanged; an explicit empty array clears that
relation. Include the old `default` connection in the set if the agent must
keep it, then verify with `get_agent`; otherwise the direct connection and set
grants form a union.

- One owner may retain at most 25 connection rows for one toolkit, including
  inactive ones; `is_active:false` does not free a slot, deleting a row does.
- Owner sets use `management_mode:"flymyai"` and omit `principal_id`; a
  customer mapping uses `management_mode:"customer"` with the exact
  `principal_id`. Never send deprecated `external_principal_id`.
- Member identity is `(resource_type, resource_id, slot)`:
  the same exact resource may appear in several slots, and
  each slot keeps its own `allowed_actions` ceiling. Omitting or
  sending `allowed_actions:[]` means unrestricted, not deny all; for least
  authority send exact read actions.
- One scoped agent execution admits at most 100 MCP resource sets, 500 effective
  connector bindings, 100 logical slots, 5,000 allowed-action entries, and 1 MiB
  of UTF-8 allowed-action text. An oversized authority graph fails closed before
  provider dispatch.
- `create_agent_group` shares a set across agents. Groups are flat:
  a child or subagent does not inherit a parent's connector authority.
- When several granted connections can run one action, its runtime schema
  requires `_flymyai_connection`: pass one allowed `public_id` from it, never an
  alias or row order. Direct `execute_tool` uses the exact `connection_id`.
- Freeze records set membership, connections, slots, ceilings, and revisions.
  New accounts mean the same agent UUID, a new frozen version, and the same
  stable deployment ID; older versions and customer slot mappings do not change
  in place. If resource-scope mutations are not enabled, keep the
  `default` behavior and report it; never pick a first row silently.

The list tools `list_configured_tools`, `list_mcp_resource_sets`,
`list_mcp_resource_set_members`, and `list_agent_groups` return
`{next_cursor, previous_cursor, results}`. Use `page_size` from 1-100, treat
`cursor` as an opaque, nonblank printable string of at most
1024 Unicode code points, and pass the opaque `next_cursor` back unchanged
until it is null; `list_agents` pages the same way. The configured-tool list
accepts only exact `mcp_tool` and `alias` filters; rows are compact, so filter
by `mcp_tool` or pass `view=full` for setup fields.
`list_mcp_resource_sets` rows are summaries with `member_count` and no nested
members; use `get_mcp_resource_set` for one bounded full set or
`list_mcp_resource_set_members` for a large member collection. Both
`replace_mcp_resource_set_members` and `update_mcp_resource_set` require the
current `expected_revision`.

### Shared connections and your own MCP servers

Personal MCP sharing gives the recipient every shared action of the connection,
reads and writes, on the owner's account, from any sign-in.
`list_shareable_mcp_connections` says what can be shared and with what access.
`invite_mcp_user` shares one by email, or with a teammate by `member_id` from
`list_mcp_share_people`, after the user confirms the connection, recipient, and
period (until revoked by default, or 1, 7, 14 or 30 days from acceptance); its
key is 8-128 printable non-space ASCII characters.
`list_mcp_shares` and `list_mcp_invitations` show both directions;
`accept_mcp_invitation` only after the user agrees to pay for their own calls;
`revoke_mcp_access` stops a share; `list_mcp_share_activity` lists its calls.
`list_configured_tools` lists accepted shares next to the user's own
connections under `shared_with_me`: check it before saying a service is not
connected; call one with `list_shared_mcp_tools` and `call_shared_mcp` and a
stable `operation_key`. The recipient pays; the owner's credentials never leave
FlyMyAI. Agents see who shared each connection and use a shared one when the
user has no own connection of that toolkit or asks for it. Tool annotations say
which actions only read.
Details: https://docs.flymy.ai/agents/guides/mcp-personal-sharing

For an MCP server not in search, call `add_mcp_server` (OAuth:
`auth_type:"oauth"`, then `authorize_mcp_server`, give the user its
`authorize_url`), then `connect_mcp_server`; use `discovered_tools` only at
`status:"connected"`. Call it with `call_mcp_server` (`server_id`, `action`,
exact `arguments`, stable `operation_key`, sent as `Idempotency-Key`).
Details: https://docs.flymy.ai/agents/guides/mcp-servers

## Models - discover, price, run

```text
recommend_model({"description":"cheap flat icon image",
  "include_schema":true,"top_n":1})
run_model({"endpoint_id":"flymyai/nano-banana",
  "input":{"prompt":"A blue circle, flat icon"}})
```

Use the returned endpoint, schema bounds and price; a guessed paid call is not
discovery. `get_pricing` quotes a listed model before a paid run. Over REST,
`GET https://backend.flymy.ai/api/v1/demo/catalog/` (no key) gives each public
model a `price` (`run_price`, or usage-based `rates`, `tokens` or
`run_time`). Generated file `url`s expire at `url_expires_at` (15 min max).

Chat models carry `openai.base_url`
(`https://api.flymy.ai/api/v1/<endpoint_id>/openai/v1`) for the OpenAI SDK with
the FlyMyAI key as Bearer: text and `image_url` messages, `stream`,
`reasoning_effort`; no `response_format`. Guide:
https://docs.flymy.ai/guides/llm-openai-compat

`tools` work on Grok 4.7, DeepSeek V4.1 Flash and Kimi K3.1 Pro. Guides:
https://docs.flymy.ai/guides/ + grok-4-7, deepseek-v4-1-flash, kimi-k3-1-pro

Native models keep their own input and output through the model-proxy API
(`https://backend.flymy.ai/api/v1/model-proxy/`: `catalog/?endpoint_id=<owner>/<name>`
gives the contract revision, `contracts/<revision>/` its schema and price, then POST
`operations/` with your own `Idempotency-Key` and GET the operation):
`flymyai/minimax-h3-ref2va` (MiniMax H3) makes a 5 or 10 s video with sound from a
prompt and 1-12 of your own reference files (up to 9 images and 3 audio clips: upload
each with `POST /api/v1/agents/files/` and pass the returned `artifact`), priced by
video length; `flymyai/deepseek-v4-1-flash-1017` takes native chat completions with
`tools` and an explicit `max_tokens`, priced per token with cached input lower, one
complete answer without streaming. A call that finds no running instance waits while
one starts (status `queued` with `*_capacity_not_ready`): keep reading the same
operation and never send it again. `flymyai/deepseek-v4_1-flash` is a different,
older route. Guide: https://docs.flymy.ai/api/model-proxy

Model REST inputs are model-specific `multipart/form-data`, not JSON; read
`https://api.flymy.ai/api/v1/flymyai/<endpoint_id>/openapi.json` first.

```bash
curl -fsS --no-buffer --max-time 60 -H "X-API-KEY: $FLYMYAI_API_KEY" \
  -F 'prompt=Reply exactly FLYMYAI_OK' \
  https://api.flymy.ai/api/v1/flymyai/google-gemini-31-flash-lite-preview/predict/stream/
```

Concatenate `output_data.output` chunks (the last event has `stream_details`
token counts) and check body-level status even on HTTP 200. Python SDK:
`pip install 'flymyai>=1.2.0rc22'`; images come back base64, so prefer URL or
async outputs for large media. Usage: `GET https://api.flymy.ai/api/v2/usage`
over a bounded date range (lags 20+ s). Details:
https://docs.flymy.ai/clients/python

TypeSafe Jev 1.13 answers typed questions (Choice, Noul, Score):
`typesafe_jev.decide` in agents or `make_typed_decision`. Guide:
https://docs.flymy.ai/guides/typesafe-jev

## Agents - create, run, freeze, schedule

Use `create_agent` once; refine with `update_agent`, reuse with new inputs.
Pick `model`/`effort` from `list_agent_models`
(cost-1 for helpers), `web_search` from `list_web_search_engines`. Call
published agents over REST or the SDK.

For file instructions, create/update with `user_prompt_source:{"agent_file_id":id}`
instead of `user_prompt`; `get_agent` returns the pinned source. Pass references
intact, including version IDs. Instructions and reports share one full-content
contract: `read_payload` for ranges, `flymy.iter_payload` for streams verified by
size and SHA-256 at EOF. Exhaust a stream before using its contents; previews
and model context do not limit the transfer. Details and examples:
https://docs.flymy.ai/agents/guides/serverless-agents

```text
run_agent({"agent_id":agent.uuid,"message":"Run the health check.",
  "operation_key":"health-run-<uuid>"})
run_frozen({"compilation_id":frozen.id,"operation_key":"health-frozen-<uuid>"})
```

Runs return `id`, `status`, `run_seq` and `subagent_limits`. Poll `get_run` with
`since` until `poll_complete=true`. Its 4 KiB result/error previews include
`size_bytes`, `sha256` and `ref`. Read the full result with
`read_run_result({"execution_id":run.id,"ref":page.result.ref})`, advancing
`offset=next_offset` until `complete=true`; verify `sha256`. After a follow-up,
get a fresh ref. Send the first task as `run_agent.message`; it belongs to the
run's idempotency identity. SDK `runs.append_message` supports sync/async retries
with `idempotency_key`: https://docs.flymy.ai/agents/sdk/python#follow-up

Define `input_schema` and matching `{{ placeholders }}` in `user_prompt`; pass
fresh `variables` on later runs. Freeze takes the execution ID and optional
`guidance` (up to 20,000 characters). Return its `compilation.id`,
`instruction_md`, schemas, successful frozen test and integration code.
A completed frozen test is ready to publish; do not freeze it again.

`schedule_agent` freezes and schedules once: pass `execution_id`,
`cron_schedule`, `timezone` and `schedule_variables`. For an existing freeze,
edit those fields with `update_compilation` on the same ID. New variables apply
to future runs; `cron_schedule:""` unschedules. After a lost scheduling response,
reconcile that execution's compilations before retrying: scheduling has no
idempotency key. Three consecutive failures pause the schedule and notify its
owner. Resolve the cause, then set `schedule_paused:false`; true pauses without
removing the cron.

A freeze becomes live. `save_instruction_version` saves an edited
`instruction_md` as a draft; test its `compilation_id` with `run_frozen`, then
`set_live_version` (an older version rolls back). Runs without an explicit
version and schedules use the live version. Find it with `list_compilations`,
`is_live=true`. Revoke retained browser media consent with `update_compilation`,
`browser_media_consent:{"purposes":[]}`.

`list_agent_versions(agent_id, limit?, cursor?)` (Python
`client.compilations.list_versions`) lists an agent's versions newest first, with
`next_cursor` for older pages; `get_compilation` opens one.

`upload_agent_file` attaches a file up to 1 MiB to an agent; its
`operation_key` reconciles the same upload instead of adding a file.

Run a freeze as its owner via `POST /compilations/{id}/run-instruction/` under
`/api/v1/agents/`, with `Idempotency-Key`; poll `/executions/{id}/status/?since=`.
Product customers use deployments below. SDK `AgentClient` authors, runs and
freezes agents; `client.compilations` manages versions. Scheduling uses REST/MCP.

## Subagents - a lead runs your other agents

Any ordinary run can start subagents. `subagent_limits` on `run_agent` or
`run_frozen` sets the lead's allowance: `cap_usd` (subagents and their tools; 0
turns them off), `max_children` (1-6), `max_parallel` (1-3) and `agents`, up to 10
of your agent ids the lead may start. New chats share one $5 pool for subagents
and their tools; the lead's own calls bill separately.

Chat/API/SDK/MCP leads use `create_subagent` and `update_subagent` for requested
helpers, including `user_prompt_source`. Lists and edits stay within the project.
Scheduled, frozen and child runs cannot author helpers. Editing another agent
needs your request; `flymy.yaml` agents use plan/apply. External assistants use
`create_agent` and `update_agent`.

In the run the lead has:

- `list_subagents` - the allowed agents with their model and inputs.
- `delegate_agent(agent=..., brief, variables, operation_key=...)` - runs the
  chosen agent. With `model` instead of `agent`, copies the lead and its tools.
- `wait_subagents`, `subagent_status(child_id)` (facts and full-result reference),
  `cancel_subagents`; the lead automatically joins its batch.
- `describe_subagent_api`, `freeze_subagent` (from its last completed
  subagent run) and `schedule_subagent` manage the allowed agents.

Children stop at their budget share, cannot delegate, and receive no connections
shared by others. `get_team_run` is for Agent Teams, not native helper runs.

Identical delegations in one owner turn reuse their child. An explicit
`operation_key` identifies an intentional job; changed inputs conflict.
Use the child's full result reference instead of recollecting its data.

A lead whose frozen instruction uses `delegate_agent` pins the live version of
each allowed agent when it is frozen, so freeze those agents first. Its scheduled
runs start the pinned versions, which receive only their `variables`.

`delegate` (older) starts a bounded copy of the lead.

A lead and the agents it starts are a fleet, listed as a project
(`fleet:<lead id>`).

## Projects - one config with pages, agents, storage and budgets

`projects_plan` previews only; `projects_create` applies the confirmed
`plan_token`. Keep optional `brief`/`model`/`effort` identical. Choose effort from
the model's `effort_options` in `list_agent_models`; omit if empty.
Omitted/null/blank: defaults. `template=empty` without a brief saves
model/effort with no task or chat.
Re-plan changed brief/model/explicit effort. Brief: 65,536 UTF-8 bytes max,
positive balance. Continue returned `agent`/`chat` (nullable on partial creation),
never resend the brief. Retry the same request and `operation_key`.
Clone: `template=app:<owner>/<app>` in both calls or workspace **Clone**;
private resources/budget, no data/chats/connections. `projects_share` publishes a saved version (chats/files public);
`projects_copy` copies a link or `official` template (`setup.chat`).
`apps_plan` / `apps_apply` update; poll `apps_status`. Inspect: `projects_list`,
`projects_get`, `projects_errors`; pause/resume: `projects_stop`, `projects_start`.
Edit: `projects_rename`, `projects_set_budget`, `projects_delete`; confirm deletion.
Details: https://docs.flymy.ai/agents/guides/projects

`apps_secrets_list` reads names/status, never stored values. Use the exact app
`owner/name`; never put values in chat. `apps_secrets_generate` creates only an
absent value; repeats keep it. `apps_secrets_delete` removes it. Ask before writes.

Compaction saves private archives (`read_context_checkpoint`; older via
`search_memory` in `context_checkpoints`; isolated runs stay isolated). Keep
decisions, open work and when-to-read notes; old plans grant no new approval.

Artifacts: `create_artifact` (private; `type` from `list_artifact_types` is a
template whose README.md names the file to edit), `publish_artifact_version`
(only changes: `edits`, `files[].from`; never re-type files), `share_artifact`,
`clone_artifact`, `add_artifact_member` (view/edit, once accepted). On
"<link> add these things to the artifact: ..." call
`get_artifact` and follow `next`: owner/editor publish beside the live
version (`publish: false`, live `base_version`, give `page_url`), live only on
"and update current version"; others clone. Sites: `publish_site`,
`share_site`, `invite_to_site`, `get_site_usage` (the owner's sponsor pool or
consenting visitors pay, under daily caps).
Details: https://docs.flymy.ai/agents/guides/artifacts

## Templates

Only on request: `set_agent_public` (`preview`: auto or via `update_agent`).
Fork/adapt/freeze: `copy_agent`; a lead brings its subagents.
Media: https://flymy.ai/media | https://docs.flymy.ai/agents/guides/media-templates
Briefs: https://flymy.ai/templates/ - read template.txt; own
connections, 0% markup.
PromptLinks: SEO/GEO links, citations and runbook.
Akta prompts/tools: https://flymy.ai/vc/ - review before running.

## Embedded and resale - one builder key, no end-user keys

One builder key on the builder backend serves every product user, who connects
their own services. Never ask an end user to create a FlyMyAI account or paste a
key.

- Keep `FLYMYAI_API_KEY` only in a server secret manager, never in clients,
  URLs, logs, or chat.
- Author and owner-test through MCP. Deployment publish and customer
  connect-session are Agents REST; do not invent `client.deployments` calls
  unless the installed SDK exposes them. MCP `whoami` and
  `GET /api/v1/agents/me/` with the builder key must return the same `user_id`;
  customer identity is never that owner session's `user_id`.
- Publish the frozen version as one stable deployment (draft, `access`,
  preflight, publish) and upgrade or roll back by staging another immutable
  version on the same deployment ID. If preflight rejects a toolkit, keep the
  worker whole and report it; do not split it or bypass preflight.
- `external_user_id` is the builder's stable, opaque, non-secret ID (at most
  255 characters, not starting with `flymyai-owner-`). Normal product IDs come
  from authenticated server sessions, never from the client, an email, or a
  secret. `external_user_id` selects the external principal only.
- The deployment `access` GET is read-only. The `connect-session` POST is the
  first mutating bootstrap for a new user: send only its `redirect_url`
  (single-use, 15 minutes) to that user, then poll `access` with backoff. It has
  no idempotency key, so reconcile a lost response through `access`.
- FlyMyAI bills the deployment owner; there is no per-user rollup, so ledger
  `external_user_id`, deployment, execution ID and idempotency key yourself and
  read `/executions/{id}/prices/`.

Mapping modes, chosen on every run:

- FlyMyAI-managed binding - omit both `resource_set_id` and `connections`.
- Customer-managed named mapping - store a principal resource-set `public_id`
  and `revision`, and send both `resource_set_id` and `resource_set_revision` on
  every run; members are `resource_type:"integration_connection"` IDs.
- One-off mapping - `connections` keyed by frozen slot.

`resource_set_id` and `connections` are mutually exclusive. Omitted slots
currently continue through saved bindings, so send every required slot when the
request must own the whole mapping. Owner connection IDs are never valid, and
a customer principal never falls back to the owner's authoring connection.

```bash
curl -fsS --max-time 30 -X POST -H "X-API-KEY: $FLYMYAI_API_KEY" \
  -H "Idempotency-Key: $PERSISTED_DEPLOYMENT_RUN_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"external_user_id":"customer_42","variables":{}}' \
  "$FLYMYAI_AGENTS_API_ROOT/deployments/$DEPLOYMENT_ID/run/"
```

A HTTP 400 under `connections` means a missing or invalid slot. A customer-bound
MCP process (`FLYMYAI_MCP_MODE=customer`) has one immutable deployment/customer
binding per gateway process, set by trusted server configuration; the
deployment, `external_user_id`, and mapping are process settings. Those
authority values are never model-call arguments. Its client authenticates with
a customer edge token, not the owner key, and sees only
`run_bound_deployment` and `get_bound_deployment_run`. Two customers on one
deployment get different principals and executions while keeping the
same agent, frozen version, deployment, and billed owner.

## Browser Use - real browser tasks

`run_browser_task` drives a remote browser; `wait_for_browser_task` is a pure
read; `send_task` continues and `stop_browser_task` ends a session.
New sessions use `gpt-6-luna` by default; pass `model` to pick another.

- Use the same existing public `execution_id` and exact connection for create,
  poll, files, follow-up and stop.
- Never put passwords in prompts. **Create saved browser** (or
  `client.tools.create_browser_profile`) binds a profile to the connection; the
  user signs in once in the live view. On an unknown result or 409, inspect with
  `get_browser_profile` and `reconcile_browser_profile`, never create again.
  Use a second connection for a second account, and end with
  `stop_browser_task(strategy="session")`.
- `live_url`, `live_url_clean`, and `share_url` are full-control credentials:
  only for the requesting user, never published or logged.
- Media becomes durable only through `get_browser_recording(persist=true)`,
  `recover_browser_artifact`, or `download_browser_file` (256 MiB budget). In
  chat, show the signed `ALLOW_BROWSER_USE_*` lines, stop, and repeat with the
  token only after the user sends them. Never manufacture that
  acknowledgement. Tokens are one-time, short-lived, execution-bound,
  connection-bound, and request-bound.
- A status or recording is not proof a file was downloaded or that a social
  site is supported.

## Your own model on GPU - FlyMyAI CLI

Deploy your Python model as an auto-scaling GPU endpoint, billed for its
compute, with the FlyMyAI CLI (`fma`):

```bash
pip install git+https://github.com/flymyai/fma-custom-models.git
fma init my_model   # model.py with initialize() and predict()
fma login           # the user signs in; never ask for the password in chat
fma deploy          # then fma logs, fma update, fma delete
```

## Auth, errors, and resource discipline

Never print, echo, or read back credentials or the environment (`env`,
`printenv`, `echo $KEY`); reference secrets only as variables. REST uses
`X-API-KEY`; models are at `https://api.flymy.ai`, keys at
`https://app.flymy.ai/profile`, docs at `https://docs.flymy.ai`.

- Every run submission requires an explicit caller-owned retry identity. MCP
  `run_agent` and `run_frozen` require a nonblank printable ASCII
  `operation_key` of at most 255 characters with no leading or trailing
  spaces. REST task runs (`/tasks/{id}/run-loop/`), compilation runs
  (`/compilations/{id}/run-instruction/`), and deployment runs
  (`/deployments/{id}/run/`) send the same value as `Idempotency-Key`. Neither
  gateway nor backend generates a fallback. Reserve it with the request before
  dispatch, reuse it only for the identical request, and use a new key per
  logical run.
- Sandbox `flymy.tool(..., operation_key=...)`, paid inference (MCP
  `analyze_media`, `make_typed_decision`, non-chat `run_model`; REST async
  `Idempotency-Key`), writes and delegation tools share one key grammar and
  canonical-request rule; another body under a used key gets 409
  `idempotency_key_reused`. Provider
  `request_id` is separate. After an ambiguous outcome, reconcile the original
  operation, never redispatch it under a new key.
- MCP `create_mcp_resource_set` and `create_agent_group` are durable creates and
  require their own caller-owned `operation_key`. Their REST collection POSTs
  require the same value in `Idempotency-Key`. The same key and body replay the
  original response; a changed body returns 409. After a lost response, retry
  that body with that key, never a new key.
- A REST replay returns the same execution for 2 days; later reuse can create a
  new one, and a concurrent replay can return 409.
- `create_agent`, `freeze_agent`, deployment creation, and `connect-session`
  have no replay key: record an audit label and the request before dispatch,
  persist returned IDs, reconcile a lost response by bounded reads, and report
  an unknown outcome instead of cloning.

403 is a key or balance problem (Agents also use 402 for balance); read the
body. Direct tool calls (`execute_tool`, REST, compiled and scheduled runs)
are charged like agent runs; at an empty balance a paid call gets 402
`insufficient_balance` before it runs, with `shortfall_usd` and `top_up_url`;
`create_top_up_link` (whole dollars) makes a checkout link for the user, never pay yourself. 404 is an inaccessible ID, 409 an idempotency or state conflict, 400
field validation, 5xx retryable only when the operation is safe. Poll
`/executions/{id}/status/?since=` (about 1 KiB), not full executions. Avoid
account-wide lists in request paths, bound concurrency and timeouts, and cap
files before decode. When live behavior conflicts with this file, make one bounded read-only
probe and report the discrepancy. Report a failing or missing tool, a wrong result
or a wrong guide once with `send_feedback`, without secrets or personal data.

## Install and update

Claude Code plugin with this skill and the MCP:
`/plugin marketplace add FlyMyAI/claude-plugins`, then
`/plugin install flymyai@flymyai`. Or save as a skill
(`~/.claude/skills/flymyai/SKILL.md`) or as `AGENTS.md`: Codex and Cursor read
`AGENTS.md`; Claude Code and Gemini CLI read a `CLAUDE.md` or `GEMINI.md`
containing exactly `@AGENTS.md`. Refetch https://flymy.ai/skill.md when `whats_new`
reports a version newer than `metadata.version`.

## Release maintainers only

A personal user connecting one account does not need to learn it. The release
harness, before any product mutation, fetches `/agent-guide-release.json`,
requires its `release_contract` with schema version 2, and compares it to an
independently approved release pin; a candidate/stable mismatch stops the gate.

### Release-maintainer-only connectionless fixture

An assistant already building a requested worker must skip this entire section
and publish that same requested agent - never a smoke agent beside it. The
fresh-assistant gate also creates exactly one requested evaluation agent. The
trusted release harness mints test customer IDs in its
authenticated test identity store, never in prompts or MCP arguments.
