#!/bin/sh
set -e

if [ -n "$PUID" ] && [ -n "$PGID" ]; then
  if ! getent group "$PGID" >/dev/null 2>&1; then
    groupadd -g "$PGID" appgroup
  fi
  if ! id -u "$PUID" >/dev/null 2>&1; then
    useradd -u "$PUID" -g "$PGID" -m appuser
  fi
  if [ ! -f "$DATA_DIR/.brewnotes_permissions" ]; then
    chown -R "$PUID":"$PGID" "$DATA_DIR"
    touch "$DATA_DIR/.brewnotes_permissions"
  fi
  exec gosu "$PUID":"$PGID" "$@"
fi

exec "$@"
