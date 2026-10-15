#!/usr/bin/env bash
# Renders the store screenshots and the Play feature graphic from the raw A16 captures in raw/.
# The Android status bar (top 100 px) and navigation bar (from y 2200) are cropped away, so no
# Android system UI reaches the App Store listing. Run from anywhere: bash apps/mobile/store/render.sh
set -euo pipefail
cd "$(dirname "$0")"
FONT=../../../node_modules/@expo-google-fonts/madimi-one/400Regular/MadimiOne_400Regular.ttf
GREEN="#1C7031" YELLOW="#FFCC00"
CAPTIONS=(
  "Your guide inside Garden Grove Village"
  "Pick a block, then a lot"
  "Step-by-step directions to the lot"
)
SHOTS=(raw/01-gps.png raw/02-destination.png raw/03-navigation.png)

# frame <shot> <caption> <width> <height> <out>: caption band on brand green, rounded screenshot below.
frame() {
  local shot=$1 caption=$2 w=$3 h=$4 out=$5
  local top=$((h * 21 / 100))
  local ih=$((h - top - h * 3 / 100))
  local iw=$((ih * 1080 / 2100))
  magick "$shot" -crop 1080x2100+0+100 +repage -resize "${iw}x${ih}!" \
    \( +clone -alpha extract -fill black -colorize 100 -fill white \
       -draw "roundrectangle 0,0,$((iw - 1)),$((ih - 1)),$((iw / 18)),$((iw / 18))" \) \
    -alpha off -compose CopyOpacity -composite /tmp/ggv-store-shot.png
  magick -size "${w}x${h}" "xc:$GREEN" \
    \( -size "$((w * 88 / 100))x$((top * 80 / 100))" -background none -fill white -font "$FONT" \
       -pointsize "$((w * 68 / 1000))" -gravity center "caption:$caption" \) \
    -gravity north -geometry "+0+$((top * 12 / 100))" -composite \
    /tmp/ggv-store-shot.png -gravity north -geometry "+0+$top" -composite \
    -alpha off -strip "$out"
}

# ios/en-US/ is the layout `asc screenshots upload --path ios --device-type IPHONE_65` reads.
mkdir -p ios/en-US play
for i in "${!SHOTS[@]}"; do
  n=$((i + 1))
  frame "${SHOTS[$i]}" "${CAPTIONS[$i]}" 1284 2778 "ios/en-US/0$n.png"
  frame "${SHOTS[$i]}" "${CAPTIONS[$i]}" 1080 2160 "play/0$n.png"
done

# Play feature graphic, 1024x500: app icon on the left, name and tagline on brand green.
magick -size 1024x500 "xc:$GREEN" \
  \( ../../web/public/icons/icon-512x512.png -resize 340x340 \) -gravity west -geometry +70+0 -composite \
  -font "$FONT" -fill white -pointsize 76 -gravity northwest -annotate +460+150 "MyGGV GPS" \
  -fill "$YELLOW" -pointsize 38 -annotate +462+260 "Find any lot in" \
  -annotate +462+310 "Garden Grove Village" \
  -alpha off -strip play/feature-graphic.png
rm -f /tmp/ggv-store-shot.png
