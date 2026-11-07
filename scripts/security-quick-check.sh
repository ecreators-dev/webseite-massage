#!/usr/bin/env bash
# Aenderungsdatum: 2026-11-07
#
# Schnelle Sicherheitspruefung (Skill "sicherheits-check", Commit-Modus).
#
# Prueft nur die mechanisch erkennbaren, kritischsten Punkte und blockiert:
#   1. Datenbank-, Schluessel- und .env-Dateien im Commit
#   2. API-Schluessel / Tokens / private Schluessel im neuen Inhalt
#   3. Supabase/Postgres-Tabellen ohne "enable row level security"
#   4. Geheimnisse in oeffentlichen Env-Variablen (NEXT_PUBLIC_, VITE_ ...)
#
# Die vollstaendige Pruefung (Zugriffstrennung, Auth-Gates, Rate Limits)
# bleibt der manuelle Check mit Claude.
#
# Aufruf:
#   bash scripts/security-quick-check.sh                  gestagte Aenderungen (Pre-Commit-Hook)
#   bash scripts/security-quick-check.sh --range A B      Aenderungen zwischen Commit A und B (GitHub Actions)
#
# Bewusst umgehen (nur wenn ein Fund nachweislich harmlos ist):
#   git commit --no-verify
#
# Abhaengigkeiten: .githooks/pre-commit, .github/workflows/sicherheits-check.yml

set -u

diffMode="staged"
baseRef=""
headRef=""
if [ "${1:-}" = "--range" ]; then
  diffMode="range"
  baseRef="${2:?Basis-Commit fehlt}"
  headRef="${3:?Ziel-Commit fehlt}"
fi

# Liste der geaenderten Dateien (hinzugefuegt, kopiert, geaendert)
listChangedFiles() {
  if [ "$diffMode" = "range" ]; then
    git diff --name-only --diff-filter=ACM "$baseRef" "$headRef"
  else
    git diff --cached --name-only --diff-filter=ACM
  fi
}

# Nur die hinzugefuegten Zeilen; Sperrdateien und dieses Skript ausgenommen
listAddedLines() {
  local excludes=(-- . ':!package-lock.json' ':!*.lock' ':!scripts/security-quick-check.sh')
  if [ "$diffMode" = "range" ]; then
    git diff -U0 "$baseRef" "$headRef" "${excludes[@]}"
  else
    git diff --cached -U0 "${excludes[@]}"
  fi | grep -E '^\+' | grep -vE '^\+\+\+'
}

# Inhalt einer Datei im zu pruefenden Stand
showFileContent() {
  if [ "$diffMode" = "range" ]; then
    git show "$headRef:$1" 2>/dev/null
  else
    git show ":$1" 2>/dev/null
  fi
}

failed=0
changedFiles=$(listChangedFiles)
if [ -z "$changedFiles" ]; then
  echo "[sicherheits-check] Keine Aenderungen zu pruefen."
  exit 0
fi

# 1) Verbotene Dateitypen
forbiddenFiles=$(echo "$changedFiles" \
  | grep -iE '(^|/)\.env($|\.)|\.sqlite$|\.sqlite3$|\.db$|\.pem$|\.pfx$|\.p12$|\.key$|(^|/)id_rsa' \
  | grep -viE '\.env\.example$')
if [ -n "$forbiddenFiles" ]; then
  echo "[sicherheits-check] Datenbank-/Schluesseldateien im Commit:"
  echo "$forbiddenFiles" | sed 's/^/    /'
  failed=1
fi

# 2) Schluessel und Tokens im neuen Inhalt
secretPattern='(eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9]{10,}|sb_secret_[A-Za-z0-9_-]{10,}|AIza[0-9A-Za-z_-]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[A-Za-z0-9-]{10,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})'
secretHits=$(listAddedLines | grep -E "$secretPattern")
if [ -n "$secretHits" ]; then
  echo "[sicherheits-check] Moegliche Schluessel/Tokens im Commit:"
  echo "$secretHits" | cut -c1-160 | sed 's/^/    /'
  failed=1
fi

# 3) Supabase/Postgres: jede neue Tabelle braucht RLS in derselben Datei
for sqlFile in $(echo "$changedFiles" | grep -iE '\.sql$'); do
  sqlContent=$(showFileContent "$sqlFile")
  for tableName in $(echo "$sqlContent" \
      | grep -ioE 'create table +(if not exists +)?"?[a-z0-9_.]+"?' \
      | awk '{print $NF}' | tr -d '"'); do
    if ! echo "$sqlContent" | grep -qiE "alter table +(only +)?\"?$tableName\"? +enable row level security"; then
      echo "[sicherheits-check] $sqlFile: Tabelle $tableName ohne 'enable row level security'"
      failed=1
    fi
  done
done

# 4) Geheimnisse in oeffentlichen Env-Variablen
publicEnvHits=$(listAddedLines \
  | grep -E '(NEXT_PUBLIC_|VITE_|REACT_APP_|PUBLIC_)[A-Z_]*(SECRET|PRIVATE|SERVICE_ROLE|PASSWORD)')
if [ -n "$publicEnvHits" ]; then
  echo "[sicherheits-check] Geheimnis in oeffentlicher Env-Variable:"
  echo "$publicEnvHits" | cut -c1-160 | sed 's/^/    /'
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  echo "[sicherheits-check] BLOCKIERT. Befunde beheben oder bewusst mit 'git commit --no-verify' umgehen."
  exit 1
fi
echo "[sicherheits-check] OK"
exit 0
