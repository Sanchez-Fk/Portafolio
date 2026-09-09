#!/usr/bin/env bash
#
# Vincula tu WhatsApp con Evolution API y deja el webhook apuntando a n8n.
#
#   ./conectar-whatsapp.sh            # crea la instancia y muestra el QR
#   ./conectar-whatsapp.sh --estado   # solo consulta cómo está la conexión
#   ./conectar-whatsapp.sh --webhook  # solo vuelve a registrar el webhook
#
# Se ejecuta desde `automation/scripts/`, con el stack ya levantado.

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "No encuentro automation/.env. Cópialo de .env.example y rellénalo." >&2
  exit 1
fi
set -a; source .env; set +a

BASE="http://localhost:${EVOLUTION_PUERTO:-8080}"
INST="${EVOLUTION_INSTANCIA:-lumina}"
CLAVE="${EVOLUTION_API_KEY:?falta EVOLUTION_API_KEY en .env}"
# Dentro de la red de Docker, n8n se llama `n8n`. Esta es la URL que Evolution
# usa para entregar los mensajes, así que va en nombres de contenedor, no en
# localhost: para Evolution, `localhost` es ella misma.
WEBHOOK="http://n8n:5678/webhook/wa-entrante"

api() {  # api MÉTODO RUTA [CUERPO]
  local metodo="$1" ruta="$2" cuerpo="${3:-}"
  if [[ -n "$cuerpo" ]]; then
    curl -sS -X "$metodo" "$BASE$ruta" -H "apikey: $CLAVE" \
         -H 'Content-Type: application/json' -d "$cuerpo"
  else
    curl -sS -X "$metodo" "$BASE$ruta" -H "apikey: $CLAVE"
  fi
}

leer() { python3 -c "
import json,sys
try: d = json.load(sys.stdin)
except Exception: sys.exit(0)
for parte in '$1'.split('.'):
    if d is None: break
    d = d.get(parte) if isinstance(d, dict) else (d[0].get(parte) if d and isinstance(d, list) and isinstance(d[0], dict) else None)
print(d if d is not None else '')
"; }

estado_conexion() {
  api GET "/instance/connectionState/$INST" | leer instance.state
}

registrar_webhook() {
  echo "→ Registrando webhook: $WEBHOOK"
  local anidado plano respuesta
  anidado=$(printf '{"webhook":{"enabled":true,"url":"%s","webhookByEvents":false,"webhookBase64":false,"events":["MESSAGES_UPSERT"]}}' "$WEBHOOK")
  plano=$(printf '{"enabled":true,"url":"%s","webhookByEvents":false,"webhookBase64":false,"events":["MESSAGES_UPSERT"]}' "$WEBHOOK")

  # Evolution cambió la forma del cuerpo entre 2.1 y 2.2. Probamos la nueva y,
  # si la rechaza, la vieja.
  respuesta=$(api POST "/webhook/set/$INST" "$anidado" || true)
  if ! grep -qi '"url"' <<<"$respuesta"; then
    respuesta=$(api POST "/webhook/set/$INST" "$plano" || true)
  fi

  if grep -qi '"url"' <<<"$respuesta"; then
    echo "  webhook OK"
  else
    echo "  ⚠ No pude registrar el webhook automáticamente. Respuesta:" >&2
    echo "    $respuesta" >&2
    echo "    Hazlo a mano desde $BASE/manager → instancia $INST → Webhook." >&2
  fi
}

case "${1:-}" in
  --estado)
    echo "Instancia : $INST"
    echo "Estado    : $(estado_conexion)"
    echo "Webhook   : $(api GET "/webhook/find/$INST" | leer url)"
    exit 0 ;;
  --webhook)
    registrar_webhook; exit 0 ;;
esac

# ─── 1. Esperar a que Evolution responda ────────────────────────────────────
echo "→ Esperando a Evolution en $BASE"
for intento in $(seq 1 30); do
  if curl -sf "$BASE" -H "apikey: $CLAVE" >/dev/null 2>&1; then break; fi
  [[ $intento -eq 30 ]] && { echo "Evolution no responde. ¿Levantaste el stack? docker compose up -d" >&2; exit 1; }
  sleep 2
done
echo "  responde"

# ─── 2. Crear la instancia si no existe ─────────────────────────────────────
if [[ "$(estado_conexion)" == "open" ]]; then
  echo "→ La instancia '$INST' ya está conectada."
  registrar_webhook
  exit 0
fi

echo "→ Creando la instancia '$INST' (si ya existía, este paso falla sin consecuencias)"
api POST "/instance/create" \
  "$(printf '{"instanceName":"%s","integration":"WHATSAPP-BAILEYS","qrcode":true}' "$INST")" \
  >/dev/null 2>&1 || true

# ─── 3. QR ──────────────────────────────────────────────────────────────────
echo "→ Pidiendo el código QR"
conexion=$(api GET "/instance/connect/$INST")
codigo=$(leer code <<<"$conexion")
emparejamiento=$(leer pairingCode <<<"$conexion")

if [[ -n "$codigo" ]] && command -v qrencode >/dev/null 2>&1; then
  echo
  qrencode -t ANSIUTF8 "$codigo"
elif [[ -n "$codigo" ]]; then
  b64=$(leer base64 <<<"$conexion" | sed 's/^data:image\/png;base64,//')
  if [[ -n "$b64" ]]; then
    printf '%s' "$b64" | base64 -d > qr.png 2>/dev/null && echo "  QR guardado en automation/qr.png — ábrelo y escanéalo."
  fi
  echo "  (instala 'qrencode' para verlo aquí mismo, o abre $BASE/manager)"
fi
[[ -n "$emparejamiento" ]] && echo "  Código de emparejamiento: $emparejamiento"

cat <<'AYUDA'

  En el celular: WhatsApp → Ajustes → Dispositivos vinculados
                 → Vincular un dispositivo → escanea el QR.

AYUDA

# ─── 4. Esperar la vinculación ──────────────────────────────────────────────
echo "→ Esperando la vinculación (2 minutos como máximo)"
for intento in $(seq 1 60); do
  estado=$(estado_conexion)
  if [[ "$estado" == "open" ]]; then
    echo "  conectado"
    registrar_webhook
    echo
    echo "Listo. Antes del primer envío, marca la fecha de hoy como día 1 del número:"
    echo "  docker compose exec postgres psql -U \$POSTGRES_USER -d prospector -c \\"
    echo "    \"update ajustes set valor = current_date::text where clave = 'numero_activo_desde';\""
    exit 0
  fi
  printf '\r  estado: %-12s (%02d/60)' "${estado:-desconocido}" "$intento"
  sleep 2
done

echo
echo "No se conectó a tiempo. Vuelve a ejecutar el script para un QR nuevo." >&2
exit 1
