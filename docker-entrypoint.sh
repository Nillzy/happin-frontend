#!/bin/sh
set -e

cat > /usr/share/nginx/html/env-config.js <<EOF
window._env_ = {
  EXPO_PUBLIC_BACKEND_URL: "${EXPO_PUBLIC_BACKEND_URL:-}",
  EXPO_PUBLIC_SUPABASE_URL: "${EXPO_PUBLIC_SUPABASE_URL:-}",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}",
  EXPO_PUBLIC_MAPTILER_API_KEY: "${EXPO_PUBLIC_MAPTILER_API_KEY:-}",
  EXPO_PUBLIC_MAPTILER_KEY: "${EXPO_PUBLIC_MAPTILER_KEY:-}"
};
EOF

find /usr/share/nginx/html -name "*.html" | while read -r f; do
  if ! grep -q 'env-config.js' "$f"; then
    sed -i 's|<head>|<head><script src="/env-config.js"></script>|g' "$f"
  fi
done

exec nginx -g "daemon off;"