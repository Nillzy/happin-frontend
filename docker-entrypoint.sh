#!/bin/sh
# Ersetzt zur Laufzeit die Platzhalter im gebauten JS-Bundle durch die
# tatsächlichen EXPO_PUBLIC_*-Werte aus dem Container-Environment.
# Damit ist dasselbe Image auf verschiedenen Hosts einsetzbar
# (z.B. vm552 vs. eigene VM des Dozenten).
set -e

# Fallback-Werte für vm552 (falls Env-Vars nicht gesetzt sind)
: "${EXPO_PUBLIC_BACKEND_URL:=http://vm552.ipp-vps.net:8001}"
: "${EXPO_PUBLIC_SUPABASE_URL:=https://hylnqapjtkgqyxvmfqgy.supabase.co}"
: "${EXPO_PUBLIC_SUPABASE_ANON_KEY:=sb_publishable_EE_Ih9vyxOh7cKAPySDLqg_a3ZdrnzA}"
: "${EXPO_PUBLIC_MAPTILER_API_KEY:=M8TUe0Jj8EETksfXJXWU}"
: "${EXPO_PUBLIC_MAPTILER_KEY:=24BJqEt6oG77LpBJavu8}"

# Platzhalter in allen JS-Dateien ersetzen (| als Delimiter wg. URL-Slashes)
find /usr/share/nginx/html -name "*.js" -exec sed -i \
  -e "s|__RUNTIME_BACKEND_URL__|${EXPO_PUBLIC_BACKEND_URL}|g" \
  -e "s|__RUNTIME_SUPABASE_URL__|${EXPO_PUBLIC_SUPABASE_URL}|g" \
  -e "s|__RUNTIME_SUPABASE_ANON_KEY__|${EXPO_PUBLIC_SUPABASE_ANON_KEY}|g" \
  -e "s|__RUNTIME_MAPTILER_API_KEY__|${EXPO_PUBLIC_MAPTILER_API_KEY}|g" \
  -e "s|__RUNTIME_MAPTILER_KEY__|${EXPO_PUBLIC_MAPTILER_KEY}|g" \
  {} +

exec "$@"
