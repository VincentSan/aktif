#!/usr/bin/env bash
set -euo pipefail

# Build a .deb package from the aktif-linux-x64 binary.
# Requires: dpkg-deb (Linux native, or `brew install dpkg` on macOS)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

VERSION=$(node -e "process.stdout.write(require('$ROOT_DIR/package.json').version)")
BINARY="$ROOT_DIR/bin/aktif-linux-x64"
OUT_DIR="$ROOT_DIR/dist"
PKG_NAME="aktif_${VERSION}_amd64"
PKG_DIR="$OUT_DIR/$PKG_NAME"

if [[ ! -f "$BINARY" ]]; then
  echo "Error: $BINARY not found. Run 'bun run build:linux-x64' first." >&2
  exit 1
fi

echo "Building $PKG_NAME.deb..."

rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/DEBIAN"
mkdir -p "$PKG_DIR/usr/local/bin"

cat > "$PKG_DIR/DEBIAN/control" << EOF
Package: aktif
Version: $VERSION
Architecture: amd64
Maintainer: Vincent L
Description: ISO 27001 A.5.9 asset inventory CLI
 Lightweight CLI tool to manage an asset inventory in compliance with
 ISO 27001 A.5.9. Replaces static spreadsheets with a versioned,
 automatable, and auditable solution.
EOF

cp "$BINARY" "$PKG_DIR/usr/local/bin/aktif"
chmod 755 "$PKG_DIR/usr/local/bin/aktif"

mkdir -p "$OUT_DIR"
dpkg-deb --build "$PKG_DIR" "$OUT_DIR/$PKG_NAME.deb"
rm -rf "$PKG_DIR"

echo "Done: $OUT_DIR/$PKG_NAME.deb"
