#!/bin/sh
set -eu

APP_NAME="mihui"
APP_OWNER="KiMorev/MihUI"
INSTALL_DIR="${MIHUI_DIR:-/opt/etc/mihui}"
INIT_DIR="${MIHUI_INIT_DIR:-/opt/etc/init.d}"
INIT_SCRIPT="$INIT_DIR/S99mihui"
LOG_DIR="${MIHUI_LOG_DIR:-/opt/var/log/mihui}"
RUN_DIR="${MIHUI_RUN_DIR:-/opt/var/run}"
ENV_FILE="$INSTALL_DIR/mihui.env"
PID_FILE="$RUN_DIR/mihui.pid"
PYTHON_BIN="${MIHUI_PYTHON_BIN:-/opt/bin/python3}"
DEFAULT_PORT="${MIHUI_PORT:-9878}"
PORT_RANGE_START=9879
PORT_RANGE_END=9899
DEFAULT_RELEASE_URL="https://github.com/KiMorev/MihUI/releases/latest/download/mihui-router.tar.gz"
SOURCE_ARCHIVE_URL="${MIHUI_SOURCE_ARCHIVE_URL:-https://github.com/KiMorev/MihUI/archive/refs/heads/main.tar.gz}"
RELEASE_URL="${MIHUI_RELEASE_URL:-$DEFAULT_RELEASE_URL}"
DOWNLOAD_URLS="${MIHUI_DOWNLOAD_URLS:-}"
PACKAGE_DIR=""
TMP_DIR=""
DOWNLOADED_ARCHIVE=""

log() {
  printf '%s\n' "$*"
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

setup_download_urls() {
  if [ -n "$DOWNLOAD_URLS" ]; then
    return
  fi

  DOWNLOAD_URLS="$RELEASE_URL"
  if [ "$RELEASE_URL" = "$DEFAULT_RELEASE_URL" ]; then
    DOWNLOAD_URLS="$DOWNLOAD_URLS $SOURCE_ARCHIVE_URL"
  fi
}

cleanup() {
  if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}

trap cleanup EXIT

make_tmp_dir() {
  mktemp -d "${TMPDIR:-/tmp}/mihui-install.XXXXXX" 2>/dev/null || {
    local_dir="${TMPDIR:-/tmp}/mihui-install.$$"
    rm -rf "$local_dir"
    mkdir -p "$local_dir"
    printf '%s\n' "$local_dir"
  }
}

download_file() {
  url="$1"
  target="$2"

  if command_exists curl; then
    curl -fL --connect-timeout 20 -o "$target" "$url" && return 0
  fi

  if command_exists wget; then
    wget -O "$target" "$url" && return 0
  fi

  return 1
}

download_package_archive() {
  setup_download_urls

  for url in $DOWNLOAD_URLS; do
    archive_name="${url##*/}"
    case "$archive_name" in
      *.tar.gz|*.tgz|*.tar|*.zip) ;;
      *) archive_name="mihui-router.tar.gz" ;;
    esac

    DOWNLOADED_ARCHIVE="$TMP_DIR/$archive_name"
    rm -f "$DOWNLOADED_ARCHIVE"
    log "Downloading MihUI package: $url"
    if download_file "$url" "$DOWNLOADED_ARCHIVE"; then
      return
    fi
    log "Download failed: $url"
  done

  fail "curl or wget is required to download MihUI, and all download URLs failed"
}

ensure_python() {
  if [ -x "$PYTHON_BIN" ]; then
    return
  fi

  if command_exists python3; then
    PYTHON_BIN="$(command -v python3)"
    return
  fi

  if command_exists opkg; then
    OPKG_BIN="$(command -v opkg)"
  elif [ -x "/opt/bin/opkg" ]; then
    OPKG_BIN="/opt/bin/opkg"
  else
    fail "python3 is required; install Entware python3 or run: opkg update && opkg install python3"
  fi

  log "python3 not found, installing through Entware opkg..."
  "$OPKG_BIN" update || fail "opkg update failed"
  "$OPKG_BIN" install python3 || fail "opkg install python3 failed"

  if [ ! -x "$PYTHON_BIN" ]; then
    if command_exists python3; then
      PYTHON_BIN="$(command -v python3)"
    else
      fail "python3 is still unavailable after installation"
    fi
  fi
}

extract_archive() {
  archive="$1"
  target="$2"
  mkdir -p "$target"

  case "$archive" in
    *.tar.gz|*.tgz)
      tar -xzf "$archive" -C "$target"
      return
      ;;
    *.tar)
      tar -xf "$archive" -C "$target"
      return
      ;;
    *.zip)
      if command_exists unzip; then
        unzip -q "$archive" -d "$target"
        return
      fi

      if command_exists busybox; then
        busybox unzip -q "$archive" -d "$target"
        return
      fi

      fail "unzip or busybox unzip is required for zip archives"
      ;;
  esac

  fail "unsupported archive format: $archive"
}

package_from_source_tree() {
  source_dir="$1"
  target_dir="$2"

  [ -f "$source_dir/index.html" ] || return 1
  [ -f "$source_dir/styles.css" ] || return 1
  [ -f "$source_dir/app.js" ] || return 1
  [ -f "$source_dir/mihomo-editor.html" ] || return 1
  [ -f "$source_dir/router/cgi-bin/mihui-update" ] || return 1
  [ -f "$source_dir/router/mihui_server.py" ] || return 1
  [ -f "$source_dir/router/uninstall.sh" ] || return 1

  mkdir -p "$target_dir/www" "$target_dir/cgi-bin"
  cp "$source_dir/index.html" "$source_dir/styles.css" "$source_dir/app.js" "$source_dir/mihomo-editor.html" "$target_dir/www/"
  cp "$source_dir/router/cgi-bin/mihui-update" "$target_dir/cgi-bin/"
  cp "$source_dir/router/mihui_server.py" "$target_dir/"
  cp "$source_dir/router/uninstall.sh" "$target_dir/"
  [ -f "$source_dir/router/install.sh" ] && cp "$source_dir/router/install.sh" "$target_dir/"
  [ -f "$source_dir/VERSION" ] && cp "$source_dir/VERSION" "$target_dir/"
  return 0
}

select_package_dir() {
  root="$1"

  if [ -f "$root/www/index.html" ] && [ -f "$root/cgi-bin/mihui-update" ]; then
    printf '%s\n' "$root"
    return 0
  fi

  if package_from_source_tree "$root" "$TMP_DIR/source-package"; then
    printf '%s\n' "$TMP_DIR/source-package"
    return 0
  fi

  for candidate in "$root"/*; do
    [ -d "$candidate" ] || continue

    if [ -f "$candidate/www/index.html" ] && [ -f "$candidate/cgi-bin/mihui-update" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi

    if package_from_source_tree "$candidate" "$TMP_DIR/source-package"; then
      printf '%s\n' "$TMP_DIR/source-package"
      return 0
    fi
  done

  return 1
}

is_our_init_script() {
  [ -f "$1" ] && grep -q "MIHUI_INIT_OWNER=\"$APP_OWNER\"" "$1"
}

assert_safe_init_target() {
  if [ -e "$INIT_SCRIPT" ] && ! is_our_init_script "$INIT_SCRIPT"; then
    fail "$INIT_SCRIPT exists and is not owned by $APP_OWNER"
  fi
}

read_existing_port() {
  if [ -f "$ENV_FILE" ]; then
    sed -n 's/^MIHUI_PORT=\([0-9][0-9]*\)$/\1/p' "$ENV_FILE" | sed -n '1p'
    return
  fi

  if is_our_init_script "$INIT_SCRIPT"; then
    sed -n 's/^PORT="\([0-9][0-9]*\)"$/\1/p' "$INIT_SCRIPT" | sed -n '1p'
  fi
}

port_in_use() {
  port="$1"

  if command_exists ss; then
    ss -ltn 2>/dev/null | grep -Eq "[:.]$port[[:space:]]"
    return $?
  fi

  if command_exists netstat; then
    netstat -ln 2>/dev/null | grep -Eq "[:.]$port[[:space:]]"
    return $?
  fi

  return 1
}

pick_free_port() {
  if ! port_in_use "$DEFAULT_PORT"; then
    printf '%s\n' "$DEFAULT_PORT"
    return
  fi

  port="$PORT_RANGE_START"
  while [ "$port" -le "$PORT_RANGE_END" ]; do
    if ! port_in_use "$port"; then
      printf '%s\n' "$port"
      return
    fi
    port=$((port + 1))
  done

  fail "no free port in $PORT_RANGE_START-$PORT_RANGE_END"
}

prepare_package() {
  script_dir=$(CDPATH= cd "$(dirname "$0")" && pwd)

  if [ -f "$script_dir/www/index.html" ] && [ -f "$script_dir/cgi-bin/mihui-update" ]; then
    PACKAGE_DIR="$script_dir"
    return
  fi

  if [ -f "$script_dir/../index.html" ] && [ -f "$script_dir/cgi-bin/mihui-update" ]; then
    TMP_DIR=$(make_tmp_dir)
    package_from_source_tree "$script_dir/.." "$TMP_DIR" || fail "failed to prepare local package"
    PACKAGE_DIR="$TMP_DIR"
    return
  fi

  TMP_DIR=$(make_tmp_dir)
  download_package_archive
  extract_archive "$DOWNLOADED_ARCHIVE" "$TMP_DIR/package"
  PACKAGE_DIR=$(select_package_dir "$TMP_DIR/package") || fail "downloaded package has unsupported layout"
}

validate_package() {
  [ -f "$PACKAGE_DIR/www/index.html" ] || fail "package does not contain www/index.html"
  [ -f "$PACKAGE_DIR/www/styles.css" ] || fail "package does not contain www/styles.css"
  [ -f "$PACKAGE_DIR/www/app.js" ] || fail "package does not contain www/app.js"
  [ -f "$PACKAGE_DIR/cgi-bin/mihui-update" ] || fail "package does not contain cgi-bin/mihui-update"
  [ -f "$PACKAGE_DIR/mihui_server.py" ] || fail "package does not contain mihui_server.py"
  [ -f "$PACKAGE_DIR/uninstall.sh" ] || fail "package does not contain uninstall.sh"
}

write_env_file() {
  cat > "$ENV_FILE" <<EOF
MIHUI_PORT=$SELECTED_PORT
MIHUI_RELEASE_URL="$RELEASE_URL"
MIHUI_DOWNLOAD_URLS="$DOWNLOAD_URLS"
MIHUI_PYTHON_BIN="$PYTHON_BIN"
EOF
}

write_init_script() {
  cat > "$INIT_SCRIPT" <<EOF
#!/bin/sh
MIHUI_INIT_OWNER="$APP_OWNER"
ENABLED=yes
APP_DIR="$INSTALL_DIR"
WWW_DIR="\$APP_DIR/www"
SERVER_PY="\$APP_DIR/mihui_server.py"
ENV_FILE="\$APP_DIR/mihui.env"
LOG_DIR="$LOG_DIR"
RUN_DIR="$RUN_DIR"
PID_FILE="$PID_FILE"
PYTHON_BIN="$PYTHON_BIN"
PORT="$SELECTED_PORT"
LOG_FILE="\$LOG_DIR/server.log"

[ -f /opt/etc/profile ] && . /opt/etc/profile
[ -f "\$ENV_FILE" ] && . "\$ENV_FILE"
[ -n "\${MIHUI_PORT:-}" ] && PORT="\$MIHUI_PORT"
[ -n "\${MIHUI_PYTHON_BIN:-}" ] && PYTHON_BIN="\$MIHUI_PYTHON_BIN"

is_running() {
  [ -f "\$PID_FILE" ] || return 1
  pid=\$(cat "\$PID_FILE" 2>/dev/null || true)
  [ -n "\$pid" ] && kill -0 "\$pid" 2>/dev/null
}

start() {
  [ "\$ENABLED" = "yes" ] || exit 0
  mkdir -p "\$LOG_DIR" "\$RUN_DIR"

  wait_left=30
  while { [ ! -f "\$WWW_DIR/index.html" ] || [ ! -f "\$SERVER_PY" ]; } && [ "\$wait_left" -gt 0 ]; do
    sleep 1
    wait_left=\$((wait_left - 1))
  done

  [ -f "\$WWW_DIR/index.html" ] || {
    printf 'MihUI www directory is not ready\n' >> "\$LOG_FILE"
    exit 1
  }
  [ -f "\$SERVER_PY" ] || {
    printf 'MihUI server is not ready\n' >> "\$LOG_FILE"
    exit 1
  }
  [ -x "\$PYTHON_BIN" ] || {
    printf 'python3 is not executable: %s\n' "\$PYTHON_BIN" >> "\$LOG_FILE"
    exit 1
  }

  if is_running; then
    exit 0
  fi
  rm -f "\$PID_FILE"

  if command -v nohup >/dev/null 2>&1; then
    nohup "\$PYTHON_BIN" "\$SERVER_PY" --host 0.0.0.0 --port "\$PORT" --app-dir "\$APP_DIR" >> "\$LOG_FILE" 2>&1 &
  else
    printf 'nohup is missing, starting without nohup\n' >> "\$LOG_FILE"
    "\$PYTHON_BIN" "\$SERVER_PY" --host 0.0.0.0 --port "\$PORT" --app-dir "\$APP_DIR" >> "\$LOG_FILE" 2>&1 &
  fi

  echo \$! > "\$PID_FILE"
  sleep 1
  is_running || {
    rm -f "\$PID_FILE"
    printf 'MihUI server failed to start\n' >> "\$LOG_FILE"
    exit 1
  }
}

stop() {
  if is_running; then
    pid=\$(cat "\$PID_FILE")
    kill "\$pid" 2>/dev/null || true
    sleep 1
    kill -0 "\$pid" 2>/dev/null && kill -9 "\$pid" 2>/dev/null || true
  fi
  rm -f "\$PID_FILE"
}

case "\${1:-start}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status)
    if is_running; then
      echo "MihUI is running on port \$PORT"
    else
      echo "MihUI is stopped"
      exit 1
    fi
    ;;
  *) echo "Usage: \$0 {start|stop|restart|status}"; exit 2 ;;
esac
EOF
  chmod +x "$INIT_SCRIPT"
}

show_service_log() {
  log "MihUI service log: $LOG_DIR/server.log"
  if [ -f "$LOG_DIR/server.log" ]; then
    log "--- server.log ---"
    if command_exists tail; then
      tail -n 40 "$LOG_DIR/server.log"
    else
      cat "$LOG_DIR/server.log"
    fi
    log "--- end server.log ---"
  fi
}

assert_safe_init_target
prepare_package
validate_package
ensure_python

EXISTING_PORT=$(read_existing_port || true)
if [ -n "$EXISTING_PORT" ]; then
  SELECTED_PORT="$EXISTING_PORT"
else
  SELECTED_PORT=$(pick_free_port)
fi

mkdir -p "$INSTALL_DIR" "$INSTALL_DIR/www" "$INIT_DIR" "$LOG_DIR" "$RUN_DIR"

if is_our_init_script "$INIT_SCRIPT"; then
  sh "$INIT_SCRIPT" stop || true
fi

rm -rf "$INSTALL_DIR/www"
mkdir -p "$INSTALL_DIR/www/cgi-bin"
cp -R "$PACKAGE_DIR/www/." "$INSTALL_DIR/www/"
cp -R "$PACKAGE_DIR/cgi-bin/." "$INSTALL_DIR/www/cgi-bin/"
cp "$PACKAGE_DIR/mihui_server.py" "$INSTALL_DIR/mihui_server.py"
cp "$PACKAGE_DIR/uninstall.sh" "$INSTALL_DIR/uninstall.sh"
[ -f "$PACKAGE_DIR/VERSION" ] && cp "$PACKAGE_DIR/VERSION" "$INSTALL_DIR/VERSION"
chmod +x "$INSTALL_DIR/www/cgi-bin/mihui-update"
chmod +x "$INSTALL_DIR/uninstall.sh"

write_env_file
write_init_script
if ! sh "$INIT_SCRIPT" restart; then
  show_service_log
  fail "MihUI files were installed, but service did not start"
fi

log "MihUI installed"
log "URL: http://<router-ip>:$SELECTED_PORT/"
log "Install dir: $INSTALL_DIR"
log "Logs: $LOG_DIR"
