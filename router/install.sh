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
DEFAULT_PORT="${MIHUI_PORT:-9878}"
PORT_RANGE_START=9879
PORT_RANGE_END=9899
RELEASE_URL="${MIHUI_RELEASE_URL:-https://github.com/KiMorev/MihUI/releases/latest/download/mihui-router.zip}"
PACKAGE_DIR=""
TMP_DIR=""

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
    curl -fL --connect-timeout 20 -o "$target" "$url"
    return
  fi

  if command_exists wget; then
    wget -O "$target" "$url"
    return
  fi

  fail "curl or wget is required to download MihUI"
}

extract_zip() {
  archive="$1"
  target="$2"
  mkdir -p "$target"

  if command_exists unzip; then
    unzip -q "$archive" -d "$target"
    return
  fi

  if command_exists busybox; then
    busybox unzip -q "$archive" -d "$target"
    return
  fi

  fail "unzip or busybox unzip is required"
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
    mkdir -p "$TMP_DIR/www" "$TMP_DIR/cgi-bin"
    cp "$script_dir/../index.html" "$script_dir/../styles.css" "$script_dir/../app.js" "$script_dir/../mihomo-editor.html" "$TMP_DIR/www/"
    cp "$script_dir/cgi-bin/mihui-update" "$TMP_DIR/cgi-bin/"
    cp "$script_dir/uninstall.sh" "$TMP_DIR/"
    PACKAGE_DIR="$TMP_DIR"
    return
  fi

  TMP_DIR=$(make_tmp_dir)
  download_file "$RELEASE_URL" "$TMP_DIR/mihui-router.zip"
  extract_zip "$TMP_DIR/mihui-router.zip" "$TMP_DIR/package"
  PACKAGE_DIR="$TMP_DIR/package"
}

validate_package() {
  [ -f "$PACKAGE_DIR/www/index.html" ] || fail "package does not contain www/index.html"
  [ -f "$PACKAGE_DIR/www/styles.css" ] || fail "package does not contain www/styles.css"
  [ -f "$PACKAGE_DIR/www/app.js" ] || fail "package does not contain www/app.js"
  [ -f "$PACKAGE_DIR/cgi-bin/mihui-update" ] || fail "package does not contain cgi-bin/mihui-update"
  [ -f "$PACKAGE_DIR/uninstall.sh" ] || fail "package does not contain uninstall.sh"
}

write_env_file() {
  cat > "$ENV_FILE" <<EOF
MIHUI_PORT=$SELECTED_PORT
MIHUI_RELEASE_URL="$RELEASE_URL"
EOF
}

write_init_script() {
  cat > "$INIT_SCRIPT" <<EOF
#!/bin/sh
MIHUI_INIT_OWNER="$APP_OWNER"
ENABLED=yes
APP_DIR="$INSTALL_DIR"
WWW_DIR="\$APP_DIR/www"
ENV_FILE="\$APP_DIR/mihui.env"
LOG_DIR="$LOG_DIR"
RUN_DIR="$RUN_DIR"
PID_FILE="$PID_FILE"
PORT="$SELECTED_PORT"
LOG_FILE="\$LOG_DIR/httpd.log"

[ -f /opt/etc/profile ] && . /opt/etc/profile
[ -f "\$ENV_FILE" ] && . "\$ENV_FILE"
[ -n "\${MIHUI_PORT:-}" ] && PORT="\$MIHUI_PORT"

find_httpd() {
  if command -v busybox >/dev/null 2>&1; then
    printf 'busybox\n'
    return
  fi

  if command -v httpd >/dev/null 2>&1; then
    printf 'httpd\n'
    return
  fi

  return 1
}

is_running() {
  [ -f "\$PID_FILE" ] || return 1
  pid=\$(cat "\$PID_FILE" 2>/dev/null || true)
  [ -n "\$pid" ] && kill -0 "\$pid" 2>/dev/null
}

start() {
  [ "\$ENABLED" = "yes" ] || exit 0
  mkdir -p "\$LOG_DIR" "\$RUN_DIR"

  wait_left=30
  while [ ! -f "\$WWW_DIR/index.html" ] && [ "\$wait_left" -gt 0 ]; do
    sleep 1
    wait_left=\$((wait_left - 1))
  done

  [ -f "\$WWW_DIR/index.html" ] || {
    printf 'MihUI www directory is not ready\n' >> "\$LOG_FILE"
    exit 1
  }

  if is_running; then
    exit 0
  fi
  rm -f "\$PID_FILE"

  httpd_kind=\$(find_httpd) || {
    printf 'busybox httpd is required\n' >> "\$LOG_FILE"
    exit 1
  }

  if [ "\$httpd_kind" = "busybox" ]; then
    nohup busybox httpd -f -p "0.0.0.0:\$PORT" -h "\$WWW_DIR" >> "\$LOG_FILE" 2>&1 &
  else
    nohup httpd -f -p "0.0.0.0:\$PORT" -h "\$WWW_DIR" >> "\$LOG_FILE" 2>&1 &
  fi

  echo \$! > "\$PID_FILE"
  sleep 1
  is_running || {
    rm -f "\$PID_FILE"
    printf 'MihUI httpd failed to start\n' >> "\$LOG_FILE"
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

if ! command_exists busybox && ! command_exists httpd; then
  fail "busybox httpd is required"
fi

assert_safe_init_target
prepare_package
validate_package

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
cp "$PACKAGE_DIR/uninstall.sh" "$INSTALL_DIR/uninstall.sh"
chmod +x "$INSTALL_DIR/www/cgi-bin/mihui-update"
chmod +x "$INSTALL_DIR/uninstall.sh"

write_env_file
write_init_script
sh "$INIT_SCRIPT" restart

log "MihUI installed"
log "URL: http://<router-ip>:$SELECTED_PORT/"
log "Install dir: $INSTALL_DIR"
log "Logs: $LOG_DIR"
