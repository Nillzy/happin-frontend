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

sed -i 's|<head>|<head><script src="/env-config.js"></script>|' /usr/share/nginx/html/index.html

exec nginx -g "daemon off;"
