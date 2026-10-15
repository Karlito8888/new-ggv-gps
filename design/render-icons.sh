#!/usr/bin/env bash
# Renders every app icon (iOS, Android adaptive layers, web) from design/icon.svg.
# Needs resvg and ImageMagick 7 (apt). Run from the repo root after `bun install` (the font).
set -euo pipefail
font=node_modules/@expo-google-fonts/madimi-one/400Regular/MadimiOne_400Regular.ttf
mobile=apps/mobile/assets
web=apps/web/public/icons
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# layer <id> <px> <out.png>: renders one top-level layer of the 108 dp canvas.
layer() {
  echo "#ios{display:none} #$1{display:inline}" > "$tmp/layer.css"
  resvg --use-font-file "$font" --stylesheet "$tmp/layer.css" -w "$2" design/icon.svg "$3"
}
# The iOS and web icons are the centre 72 dp square: 1024 px of the 1536 px render.
centre() { magick "$1" -crop 1024x1024+256+256 +repage -alpha off "$2"; }

layer ios 1536 "$tmp/ios.png"
centre "$tmp/ios.png" "PNG24:$mobile/icon.png"
layer android-background 1024 "$tmp/bg.png"
magick "$tmp/bg.png" -alpha off "PNG24:$mobile/android-background.png"
layer android-foreground 1024 "$mobile/adaptive-icon.png"
layer android-monochrome 1024 "$mobile/android-monochrome.png"
layer maskable 1536 "$tmp/maskable.png"
centre "$tmp/maskable.png" "PNG24:$tmp/maskable-1024.png"

for s in 16 32 48 72 96 144 192 512; do
  magick "$mobile/icon.png" -resize "${s}x${s}" "PNG24:$web/icon-${s}x${s}.png"
done
for s in 48 72 96 144 192 512; do
  magick "$web/icon-${s}x${s}.png" -quality 90 "$web/icon-${s}x${s}.webp"
done
for s in 192 512; do
  magick "$tmp/maskable-1024.png" -resize "${s}x${s}" "PNG24:$web/icon-maskable-${s}x${s}.png"
  magick "$web/icon-maskable-${s}x${s}.png" -quality 90 "$web/icon-maskable-${s}x${s}.webp"
done
