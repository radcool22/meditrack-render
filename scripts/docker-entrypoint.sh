#!/bin/sh
# Restart-on-crash supervisor for the render server. Forwards SIGTERM/SIGINT
# to the node process so Fly's graceful shutdown and rolling deploys still
# work; only restarts on an unexpected (non-signal) crash exit.

term_received=0
child_pid=""

on_term() {
  term_received=1
  [ -n "$child_pid" ] && kill -TERM "$child_pid" 2>/dev/null
}
trap on_term TERM INT

while true; do
  node dist/server/index.js &
  child_pid=$!
  wait "$child_pid"
  exit_code=$?

  if [ "$term_received" -eq 1 ]; then
    exit "$exit_code"
  fi

  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"level\":\"error\",\"msg\":\"server exited unexpectedly, restarting\",\"exit_code\":$exit_code}" >&2
  sleep 1
done
