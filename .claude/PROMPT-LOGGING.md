# User Prompt Logging Hook

## Setup
UserPromptSubmit hook configured in `.claude/settings.json` to log all user prompts.

## What Gets Logged
```
[TIMESTAMP] session:SESSION_ID | PROMPT_TEXT
```

Example:
```
[2026-08-20 11:03:45] session:a1b2c3d4 | Add a PreToolUse hook to log bash commands
[2026-08-20 11:05:12] session:a1b2c3d4 | git status
[2026-08-20 11:06:33] session:a1b2c3d4 | git commit and push changes
```

## Files
- **prompt-history.log** — All prompts from this and future sessions
- **session-id** — Persistent session ID for this Claude session (8 alphanumeric chars)

## Session ID Behavior
- Generated once per Claude session
- Persists in `.claude/session-id`
- Allows tracking prompts across multiple messages in one session
- New session creates new ID on next Claude startup

## How to Monitor
```bash
# View all prompts
cat .claude/prompt-history.log

# View just this session
CURRENT_SESSION=$(cat .claude/session-id 2>/dev/null)
grep "session:$CURRENT_SESSION" .claude/prompt-history.log

# Real-time monitoring
tail -f .claude/prompt-history.log
```

## Limitations
- Prompt text capture depends on Claude Code's hook API
- If hook system doesn't expose prompt parameter, log shows `[prompt #N]`
- First prompt in new session triggers hook setup (creates files)

## Testing
1. Send a user prompt to Claude
2. Check `.claude/prompt-history.log` for new entry
3. Verify timestamp and session ID are present
