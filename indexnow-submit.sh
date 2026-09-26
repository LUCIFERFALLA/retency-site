#!/usr/bin/env bash
# IndexNow submitter — instantly notifies Bing, Yandex, Naver, Seznam of new/updated URLs.
# Bing's index is what Perplexity and ChatGPT search read from, so this is the
# fastest path from "published" to "citable by AI search".
#
# Usage:  bash indexnow-submit.sh
set -euo pipefail

KEY="599875345e24e5ce70f07c4173f430af"
HOST="retency.in"

read -r -d '' PAYLOAD <<JSON || true
{
  "host": "${HOST}",
  "key": "${KEY}",
  "keyLocation": "https://${HOST}/${KEY}.txt",
  "urlList": [
    "https://${HOST}/",
    "https://${HOST}/services",
    "https://${HOST}/ai-ad-creative",
    "https://${HOST}/ai-film-animation",
    "https://${HOST}/pr-earned-media",
    "https://${HOST}/growth-retainer",
    "https://${HOST}/pricing",
    "https://${HOST}/work",
    "https://${HOST}/swarajya",
    "https://${HOST}/ai-ads-in-india",
    "https://${HOST}/blog",
    "https://${HOST}/blog/ai-animation-studio-vs-traditional",
    "https://${HOST}/blog/ai-ad-agency-vs-ai-ad-studio",
    "https://${HOST}/blog/ai-ads-cost-india",
    "https://${HOST}/blog/ai-ads-vs-agency",
    "https://${HOST}/blog/24-hour-ad-turnaround",
    "https://${HOST}/blog/ai-anime-india-swarajya"
  ]
}
JSON

echo "Submitting $(echo "$PAYLOAD" | grep -c 'https://') URLs to IndexNow..."
CODE=$(curl -s -o /tmp/indexnow-resp.txt -w '%{http_code}' \
  -X POST "https://api.indexnow.org/IndexNow" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data "$PAYLOAD")

echo "HTTP $CODE"
case "$CODE" in
  200|202) echo "Accepted. Bing/Yandex will crawl shortly." ;;
  400) echo "Bad request — check the JSON payload." ;;
  403) echo "Key rejected — confirm https://${HOST}/${KEY}.txt is live and contains exactly the key." ;;
  422) echo "URLs do not match the host, or key mismatch." ;;
  429) echo "Rate limited — try again later." ;;
  *)   echo "Unexpected response:"; cat /tmp/indexnow-resp.txt ;;
esac
