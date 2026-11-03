# FlyMyAI for Claude Code

One install gives Claude Code the FlyMyAI Agents MCP and the FlyMyAI skill:
generate images, video and audio, call your connected services, get web data,
and build, run and schedule agents that keep working in the FlyMyAI cloud.

## Install

In Claude Code:

```text
/plugin marketplace add FlyMyAI/claude-plugins
/plugin install flymyai@flymyai
```

From a shell:

```bash
claude plugin marketplace add FlyMyAI/claude-plugins
claude plugin install flymyai@flymyai
```

Then run `/mcp`, open `plugin:flymyai:flymyai` and sign in to FlyMyAI in the
browser. No API key goes into a file. New to FlyMyAI? Sign up at
https://app.flymy.ai/signup.

Already added FlyMyAI with `claude mcp add`? Remove that copy
(`claude mcp remove flymyai`) so its tools are not listed twice.

## What it contains

| Path | What it is |
| --- | --- |
| `plugins/flymyai/.mcp.json` | The remote Agents MCP, `https://mcp-agents.flymy.ai/mcp` (Streamable HTTP, OAuth sign-in) |
| `plugins/flymyai/skills/flymyai/SKILL.md` | The FlyMyAI guide: the same bytes as https://flymy.ai/skill.md for the version in `plugin.json` |

Claude loads the skill when a task needs FlyMyAI; you can also run it as
`/flymyai:flymyai`.

## Updates

The plugin version is the platform version of the guide it carries. Turn on
auto-update for the `flymyai` marketplace in `/plugin` (Marketplaces), or run:

```bash
claude plugin marketplace update flymyai
claude plugin update flymyai@flymyai
```

Between plugin updates, the guide tells the assistant to read
https://flymy.ai/skill.md again when `whats_new` reports a newer version.

## Maintainers

On every platform release that changes the guide (the FlyMyAI platform log
protocol):

```bash
node scripts/sync-skill.mjs ../docs/static/skill.md   # copy the guide, set the plugin version
node scripts/sync-skill.mjs --check ../docs/static/skill.md
claude plugin validate .
```

Then commit and push to `main`. A change to the plugin alone keeps the guide and
adds a suffix to the version, for example `1.27.3-1`.

## License

MIT
