# Bash Command Logging Hook - Limitations

## Current Status
The PreToolUse hook in Claude Code **does not expose tool parameters to hooks**.

### Why the command text isn't captured:
- PreToolUse hooks run **before** tool execution
- Hook system doesn't pass the Bash tool's `command` parameter to the hook script
- Only generic "Bash command executed" messages can be logged this way

### What's being logged:
```
[2026-08-20 10:50:05] Bash command executed
```

### What we want:
```
[2026-08-20 10:50:05] git status
[2026-08-20 10:50:07] npm run dev
```

## Potential Solutions

### Option 1: Shell History Wrapper (Not Implemented)
- Wrap shell execution with `set -x` (xtrace) mode
- Would require modifying how Claude runs bash
- Not accessible via hook system

### Option 2: Post-execution Logging (Limited)
- Could try PostToolUse hook to log after execution
- Still doesn't have direct access to command parameters
- Would only know execution happened, not what was run

### Option 3: Custom Claude Code Extension
- Would require building a custom MCP server
- Could intercept and log Bash tool calls
- Outside scope of settings.json hooks

## Conclusion
The Claude Code hook system is designed for side effects (running linters, design checkers, etc.), not for capturing tool parameters. To capture actual bash commands, we'd need access to tool parameter data in hooks, which isn't currently supported.

The current implementation successfully logs that bash commands are executed with timestamps, which can be useful for tracking when work happened.
