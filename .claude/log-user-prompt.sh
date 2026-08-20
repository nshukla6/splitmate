#!/bin/bash
# Hook script to log user prompts with timestamps and session ID

LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/prompt-history.log"
SESSION_FILE="${CLAUDE_PROJECT_DIR}/.claude/session-id"
mkdir -p "$(dirname "$LOG_FILE")"

# Get or create session ID (persists for the duration of this Claude session)
if [ ! -f "$SESSION_FILE" ]; then
  # Generate a new session ID (8 random alphanumeric characters)
  SESSION_ID=$(head -c 4 /dev/urandom | od -An -tx1 | tr -d ' ' | cut -c1-8)
  echo "$SESSION_ID" > "$SESSION_FILE"
else
  SESSION_ID=$(cat "$SESSION_FILE")
fi

# Get prompt text from various possible sources
# Note: Hook system may not expose prompt parameter, so this captures context
PROMPT="${1:-${CLAUDE_USER_PROMPT:-${*:-[prompt unavailable]}}}"

# If no prompt captured, use placeholder with counter
if [ -z "$PROMPT" ] || [ "$PROMPT" = "[prompt unavailable]" ]; then
  PROMPT_COUNT=$(grep -c "session:$SESSION_ID" "$LOG_FILE" 2>/dev/null || echo 0)
  PROMPT="[prompt #$((PROMPT_COUNT + 1))]"
fi

# Log with timestamp and session ID
echo "[$(date '+%Y-%m-%d %H:%M:%S')] session:$SESSION_ID | $PROMPT" >> "$LOG_FILE"
