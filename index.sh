#! /bin/sh

if [ "$#" -lt 3 ]; then
    echo "Usage: ./index.sh <YouTubeURL:String> <name:String>
                  <speaker:Object{extract:Bool, regex:String(optional), nbSubStr:Number(optional)}>
                  <title:Object{extract:Bool, regex:String(optional), nbSubStr:Number(optional)}>
                  <accentColor:String(optional>"
    echo "  - name: conference name"
    echo "  - speaker: information about the speaker extraction"
    echo "  \textract: true or false depending if you want to extract the speaker name from videos' title"
    echo "  \t\tBy default, it takes the second part after the '-'"
    echo "  \tregex: allow you to pass a regex to match the speaker name in videos"
    echo "  \tnbSubStr: index of the matched substring that is the speaker name"
    echo "  - title: exact same process than 'speaker' (except no default behaviour)"
    echo "  - accentColor: css color"
    exit 1
fi

curl -H "Content-Type: application/json" \
     -X POST \
     -u ':test' \
     -d "{\"youtubeURL\":\"$1\", \"name\": \"$2\", \"speaker\": $3, \"title\": $4, \"accentColor\": \"$5\" }" \
     http://localhost:3000/index
