#!/bin/sh
set -eu

APP_OWNER="KiMorev/MihUI"
INSTALL_DIR="${MIHUI_DIR:-/opt/etc/mihui}"
INIT_SCRIPT="${MIHUI_INIT_SCRIPT:-/opt/etc/init.d/S99mihui}"
LOG_DIR="${MIHUI_LOG_DIR:-/opt/var/log/mihui}"
PID_FILE="${MIHUI_PID_FILE:-/opt/var/run/mihui.pid}"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

is_our_init_script() {
  [ -f "$1" ] && grep -q "MIHUI_INIT_OWNER=\"$APP_OWNER\"" "$1"
}

case "$INSTALL_DIR" in
  ""|"/"|"/opt"|"/opt/etc")
    fail "unsafe install dir: $INSTALL_DIR"
    ;;
esac

if is_our_init_script "$INIT_SCRIPT"; then
  sh "$INIT_SCRIPT" stop || true
fi

if [ -f "$PID_FILE" ]; then
  pid=$(cat "$PID_FILE" 2>/dev/null || true)
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    sleep 1
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

rm -rf "$INSTALL_DIR"

if is_our_init_script "$INIT_SCRIPT"; then
  rm -f "$INIT_SCRIPT"
fi

printf '%s\n' "MihUI removed"
printf '%s\n' "Logs were not removed: $LOG_DIR"
