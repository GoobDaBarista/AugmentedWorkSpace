# tools/

## lens-studio-mcp-proxy.py

A stdio↔HTTP bridge that lets Claude Code (or any stdio MCP client) drive this
project's **Lens Studio 5.15.1** instance.

### Why it's needed

This project stays on Lens Studio 5.15.1 — the last version with official
**Spectacles 2024** hardware support. Its built-in MCP server only accepts MCP
protocol version `2025-06-18` and returns a hard error for anything else instead
of negotiating down. Newer MCP clients advertise a newer protocol, so a direct
connection fails. This bridge rewrites the `initialize` handshake to
`2025-06-18`; the server echoes that back, which modern clients still accept.

### Setup

1. In Lens Studio: **AI Assistant → MCP → Configure Server** → **Copy MCP Config**.
   Note the URL (`http://localhost:8732/mcp`) and the bearer token.
2. Register the bridge with Claude Code:
   ```
   claude mcp add lens-studio \
     -e LENS_MCP_URL=http://localhost:8732/mcp \
     -e LENS_MCP_TOKEN=<token> \
     -- python3 /absolute/path/to/lens-studio-mcp-proxy.py
   ```
3. Restart the Claude Code session so the new MCP server loads.

### When it stops working

Lens Studio issues a **new bearer token** on restart. If the bridge fails to
connect, re-copy the config and update `LENS_MCP_TOKEN` (remove + re-add the
server, then restart the session).

The canonical copy used by Claude Code lives at
`~/.claude/lens-studio-mcp-proxy.py`; this file is a backup kept with the project.
