#!/bin/bash
# make_shorts.sh <final.mp4> <outdir>  — 3 vertical Shorts (1080x1920): blurred background, video in the middle,
# question on top, "FULL VIDEO ON THE CHANNEL" at the bottom.
set -e
IN="$1"; OUT="$2"; FONT=$(dirname "$0")/Fredoka700.ttf; mkdir -p "$OUT"
mk() { # name start end line1 line2
  ffmpeg -y -v error -ss "$2" -to "$3" -i "$IN" -filter_complex "\
[0:v]split=2[a][b];\
[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.12[bg];\
[b]scale=1080:-2[fg];\
[bg][fg]overlay=(W-w)/2:(H-h)/2-40,\
drawtext=fontfile=$FONT:text='$4':fontsize=86:fontcolor=white:borderw=8:bordercolor=0x0b0a12:x=(w-text_w)/2:y=300,\
drawtext=fontfile=$FONT:text='$5':fontsize=86:fontcolor=0xffd47e:borderw=8:bordercolor=0x0b0a12:x=(w-text_w)/2:y=410,\
drawbox=x=150:y=1520:w=780:h=110:color=0xc0352a@0.95:t=fill,\
drawtext=fontfile=$FONT:text='FULL VIDEO ON THE CHANNEL':fontsize=50:fontcolor=white:x=(w-text_w)/2:y=1548[v]" \
    -map "[v]" -map 0:a:0 -c:v libx264 -crf 19 -preset medium -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$OUT/$1.mp4"
  echo "$1: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$1.mp4") s"
}
# usage: source this file is not needed; edit the mk lines below per episode, e.g.:
# mk short_a 0.0 28.2 "WHAT IF THE MOON" "VANISHED TONIGHT?"
