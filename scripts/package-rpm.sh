#!/usr/bin/env bash
set -euo pipefail

# Build a .rpm package from the aktif-linux-x64 binary.
# Requires: rpmbuild (`brew install rpm` on macOS, `apt install rpm` on Ubuntu)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

VERSION=$(node -e "process.stdout.write(require('$ROOT_DIR/package.json').version)")
BINARY="$ROOT_DIR/bin/aktif-linux-x64"
OUT_DIR="$ROOT_DIR/dist"
BUILD_DIR="$OUT_DIR/rpmbuild"

if [[ ! -f "$BINARY" ]]; then
  echo "Error: $BINARY not found. Run 'bun run build:linux-x64' first." >&2
  exit 1
fi

echo "Building aktif-${VERSION}-1.x86_64.rpm..."

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"/{BUILD,RPMS,SPECS,SOURCES,SRPMS}
mkdir -p "$BUILD_DIR/SOURCES/aktif-$VERSION/usr/local/bin"

cp "$BINARY" "$BUILD_DIR/SOURCES/aktif-$VERSION/usr/local/bin/aktif"
chmod 755 "$BUILD_DIR/SOURCES/aktif-$VERSION/usr/local/bin/aktif"

cat > "$BUILD_DIR/SPECS/aktif.spec" << EOF
Name:           aktif
Version:        $VERSION
Release:        1
Summary:        ISO 27001 A.5.9 asset inventory CLI
License:        MIT
ExclusiveArch:  x86_64

%description
Lightweight CLI tool to manage an asset inventory in compliance with
ISO 27001 A.5.9. Replaces static spreadsheets with a versioned,
automatable, and auditable solution.

%install
mkdir -p %{buildroot}/usr/local/bin
cp $BUILD_DIR/SOURCES/aktif-$VERSION/usr/local/bin/aktif %{buildroot}/usr/local/bin/aktif

%files
/usr/local/bin/aktif

%changelog
* $(date "+%a %b %d %Y") Vincent L <vincent@fuko.io> - $VERSION-1
- Release $VERSION
EOF

rpmbuild -bb \
  --target x86_64 \
  --define "_topdir $BUILD_DIR" \
  "$BUILD_DIR/SPECS/aktif.spec"

mkdir -p "$OUT_DIR"
find "$BUILD_DIR/RPMS" -name "*.rpm" -exec cp {} "$OUT_DIR/" \;
rm -rf "$BUILD_DIR"

echo "Done: $OUT_DIR/aktif-${VERSION}-1.x86_64.rpm"
