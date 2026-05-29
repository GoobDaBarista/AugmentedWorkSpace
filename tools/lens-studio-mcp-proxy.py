#!/usr/bin/env python3
"""
stdio <-> streamable-HTTP MCP bridge for Lens Studio 5.15.x.

Why this exists:
  Lens Studio 5.15.1's MCP server only accepts protocol version "2025-06-18"
  and returns a hard error (-32602) for anything else instead of negotiating
  down. Newer Claude Code builds advertise a newer protocol version, so the
  handshake fails. This bridge sits in the middle: Claude Code speaks stdio to
  it, and it speaks streamable-HTTP to Lens Studio, rewriting the `initialize`
  request's protocolVersion to "2025-06-18" so the server is happy. The server
  echoes 2025-06-18 back, which Claude Code still supports, so both sides agree.

Config (via env, set in the MCP server entry):
  LENS_MCP_URL    upstream endpoint  (e.g. http://localhost:8732/mcp)
  LENS_MCP_TOKEN  bearer token from Lens Studio "Configure Server -> Copy MCP Config"

If Lens Studio is restarted and hands out a new token, update LENS_MCP_TOKEN in
the MCP server config (claude mcp ... ) — the bridge logic itself never changes.
"""

import json
import os
import sys
import urllib.request
import urllib.error

UPSTREAM = os.environ.get("LENS_MCP_URL", "http://localhost:8732/mcp")
TOKEN = os.environ.get("LENS_MCP_TOKEN", "")
PINNED_PROTOCOL = "2025-06-18"

# Session id handed back by the server on initialize, sent on later requests.
_session_id = None


def log(*args):
    """Diagnostics go to stderr so they never corrupt the stdio JSON-RPC stream."""
    print("[lens-bridge]", *args, file=sys.stderr, flush=True)


def write_message(obj):
    """Emit one JSON-RPC message to stdout as a single line (stdio framing)."""
    sys.stdout.write(json.dumps(obj, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def build_request(body_bytes):
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if TOKEN:
        headers["Authorization"] = "Bearer " + TOKEN
    if _session_id:
        headers["Mcp-Session-Id"] = _session_id
    return urllib.request.Request(UPSTREAM, data=body_bytes, headers=headers, method="POST")


def emit_sse_payloads(resp):
    """Parse a text/event-stream response and forward each JSON-RPC message."""
    data_lines = []
    for raw in resp:
        line = raw.decode("utf-8", "replace").rstrip("\r\n")
        if line == "":  # event boundary
            if data_lines:
                payload = "\n".join(data_lines)
                data_lines = []
                try:
                    write_message(json.loads(payload))
                except json.JSONDecodeError:
                    log("non-JSON SSE payload dropped:", payload[:200])
            continue
        if line.startswith("data:"):
            data_lines.append(line[5:].lstrip())
    if data_lines:
        try:
            write_message(json.loads("\n".join(data_lines)))
        except json.JSONDecodeError:
            pass


def forward(message):
    """Send one client message upstream; forward any response(s) back to stdout."""
    global _session_id

    is_initialize = message.get("method") == "initialize"
    if is_initialize:
        params = message.setdefault("params", {})
        if params.get("protocolVersion") != PINNED_PROTOCOL:
            log("rewriting protocolVersion", params.get("protocolVersion"), "->", PINNED_PROTOCOL)
            params["protocolVersion"] = PINNED_PROTOCOL

    body = json.dumps(message, separators=(",", ":")).encode("utf-8")
    has_id = "id" in message and message["id"] is not None

    try:
        with urllib.request.urlopen(build_request(body)) as resp:
            if is_initialize:
                sid = resp.headers.get("Mcp-Session-Id")
                if sid:
                    _session_id = sid
                    log("captured session id")
            ctype = (resp.headers.get("Content-Type") or "").lower()
            if "text/event-stream" in ctype:
                emit_sse_payloads(resp)
            else:
                raw = resp.read()
                if raw.strip():
                    write_message(json.loads(raw.decode("utf-8", "replace")))
                # else: 202 Accepted with empty body (notification) -> nothing to send
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:500]
        log("HTTP", e.code, detail)
        if has_id:
            write_message({
                "jsonrpc": "2.0",
                "id": message["id"],
                "error": {"code": -32000, "message": f"upstream HTTP {e.code}: {detail}"},
            })
    except Exception as e:  # noqa: BLE001 - bridge must never crash the stream
        log("forward error:", repr(e))
        if has_id:
            write_message({
                "jsonrpc": "2.0",
                "id": message["id"],
                "error": {"code": -32000, "message": f"bridge error: {e}"},
            })


def main():
    log("starting; upstream =", UPSTREAM, "token set =", bool(TOKEN))
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            log("dropping non-JSON stdin line:", line[:200])
            continue
        forward(message)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
