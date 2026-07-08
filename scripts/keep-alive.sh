#!/bin/bash
# Persistent server wrapper - keeps Next.js alive
cd /home/z/my-project
LOG="/tmp/next-server.log"

while true; do
  echo "[$(date)] Starting Next.js..." >> "$LOG"
  npx next dev -p 3000 >> "$LOG" 2>&1
  echo "[$(date)] Server exited, restarting in 3s..." >> "$LOG"
  sleep 3
done