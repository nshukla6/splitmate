#!/bin/bash
# Hook script to log bash commands with timestamps

LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/bash-history.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Try to capture command from various sources
COMMAND="${1:-${BASH_COMMAND:-${*:-unknown}}}"

# Log with timestamp
echo "[$(date '+%Y-%m-%d %H:%M:%S')] $COMMAND" >> "$LOG_FILE"
