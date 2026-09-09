# Prospección por WhatsApp — Lumina Dev

Automatización que lee tu base de posibles clientes, les escribe el primer
mensaje en frío por WhatsApp, responde lo que contesten y te avisa cuando
alguien se calienta. Orquestado con **n8n**, sin la API oficial de WhatsApp.

```
                        ┌──────────────────────────────────────┐
   CSV / Excel  ──────► │  Postgres  ·  base `prospector`      │
   importar_leads.py    │  leads · mensajes · bloqueos · ajustes│
                        └───────┬──────────────────────┬───────┘
                                │  ¿a quién le toca?   │  historial
                    ┌───────────▼──────────┐  ┌────────▼─────────────┐
                    │ 01 Prospección       │  │ 02 Respuestas        │
                    │    (cada 30 min)     │  │    (webhook)         │
                    │ 03 Seguimientos      │  │                      │
                    │    (1 vez al día)    │  │  clasifica + redacta │
                    └───────────┬──────────┘  └────────┬─────────────┘
                                │  redacta con Claude  │
                                ▼                      ▼
                        ┌──────────────────────────────────────┐
                        │  Evolution API  ·  tu número normal  │
                        └──────────────────┬───────────────────┘
                                           ▼
                                     WhatsApp del lead
```

---

## Antes de empezar: lo que esto implica

Vale la pena que lo sepas antes de escribir el primer mensaje, no después.

**No es la API oficial.** Evolution API se conecta como si fuera WhatsApp Web.
Meta no lo autoriza: enviar mensajes no solicitados en volumen va contra los
términos de servicio de WhatsApp y **el número se puede bloquear, temporal o
permanentemente**. No hay configuración que elimine ese riesgo; lo que hay aquí
solo lo reduce.

Por eso, tres decisiones que ya vienen tomadas en el diseño:

- **Usa una línea dedicada**, no tu número personal ni el que aparece en el
  portafolio. Si cae, que caiga esa.
- **Rampa de calentamiento**: 10 mensajes al día la primera semana, subiendo
  hasta 40. El límite lo calcula la base según los días de vida del número.
- **Baja en el primer mensaje.** Cada apertura termina ofreciendo salir, y
  quien lo pide entra en una lista negra que ninguna consulta puede saltarse.

Además, escribir en frío a personas naturales tiene reglas propias en varios
países de LATAM (en Colombia, la Ley 1581 de 2012 sobre datos personales). Vale
la pena que lo revises para tu caso; el sistema guarda el registro de quién
pidió baja y cuándo, que es lo que te van a pedir si alguien reclama.

---

## Requisitos

- Docker y Docker Compose
- Python 3.10+ (solo para importar leads)
- Una API key de Anthropic — <https://console.anthropic.com/settings/keys>
- Un celular con WhatsApp para escanear el QR

---

## Puesta en marcha

### 1. Configurar

```bash
cd automation
cp .env.example .env
```

Abre `.env` y rellena las cuatro claves. Para generarlas:

```bash
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 32   # EVOLUTION_API_KEY
openssl rand -hex 32   # N8N_ENCRYPTION_KEY
```

`ANTHROPIC_API_KEY` la sacas de la consola de Anthropic.

> `N8N_ENCRYPTION_KEY` no se cambia después: n8n cifra las credenciales
> guardadas con ella y no las puede volver a leer si la rotas.

### 2. Levantar el stack

```bash
docker compose up -d
docker compose ps          # los cuatro servicios en `running`
```

La primera vez, Postgres ejecuta solo los archivos de `db/`: crea las bases,
las tablas, las funciones y la configuración inicial.

### 3. Vincular tu WhatsApp

```bash
./scripts/conectar-whatsapp.sh
```

Muestra un QR en la terminal (o lo guarda en `qr.png`). En el celular:
**WhatsApp → Ajustes → Dispositivos vinculados → Vincular un dispositivo**.

El script espera a que se conecte y registra el webhook hacia n8n. Para
comprobarlo después: `./scripts/conectar-whatsapp.sh --estado`.

Marca hoy como día 1 del número, que es lo que gobierna la rampa:

```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d prospector \
  -c "update ajustes set valor = current_date::text where clave = 'numero_activo_desde';"
```

### 4. Credenciales de n8n

Abre <http://localhost:5678>, crea la cuenta de administrador y añade **tres
credenciales**. Los nombres importan: los flujos las buscan por ese nombre.

| Nombre exacto | Tipo | Cómo se llena |
|---|---|---|
| `Prospector Postgres` | Postgres | Host `postgres`, puerto `5432`, base `prospector`, usuario y clave los de `.env` |
| `Evolution API key` | Header Auth | Nombre `apikey`, valor = `EVOLUTION_API_KEY` |
| `Anthropic API key` | Header Auth | Nombre `x-api-key`, valor = `ANTHROPIC_API_KEY` |

### 5. Importar los flujos

En n8n: **Workflows → ⋯ → Import from File**, uno por uno:

```
n8n/01-prospeccion-en-frio.json
n8n/02-respuestas-entrantes.json
n8n/03-seguimientos.json
```

Los archivos también están montados dentro del contenedor, en `/flujos`.

> Al importar, n8n no puede adivinar a qué credencial se refiere cada nodo. Abre
> cada flujo y, en el primer nodo Postgres y en el primer nodo HTTP de cada
> tipo, selecciona la credencial de la lista. Se propaga al resto.

### 6. Revisar el pitch

**Este paso no es opcional.** La ficha comercial trae `PRECIOS: [PENDIENTE]`, y
mientras diga eso la IA tiene prohibido dar cifras.

```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d prospector \
  -c "select valor from ajustes where clave = 'ficha_comercial';"
```

Para editarla cómodamente, ver [docs/operacion.md](docs/operacion.md).

### 7. Cargar leads

```bash
pip install -r scripts/requirements.txt

export DATABASE_URL="postgresql://lumina:TU_CLAVE@localhost:5432/prospector"
python3 scripts/importar_leads.py mis-leads.csv --simular   # revisar primero
python3 scripts/importar_leads.py mis-leads.csv --origen "google maps"
```

> Postgres no está publicado al host por defecto. Descomenta el bloque `ports`
> de `postgres` en `docker-compose.yml` y reinicia, o corre el importador desde
> dentro de la red de Docker.

El archivo puede ser CSV o Excel. Reconoce las columnas por nombre, en español
o inglés, con o sin tildes:

| Campo | Nombres que acepta | |
|---|---|---|
| `telefono` | teléfono, celular, whatsapp, phone, número | **obligatorio** |
| `negocio` | negocio, empresa, business, razón social | **obligatorio** (si falta, usa `nombre`) |
| `nombre` | nombre, contacto, dueño, propietario | |
| `rubro` | rubro, categoría, giro, sector | |
| `ciudad` | ciudad, municipio, localidad | |
| `sitio_web` | web, website, url, página | |
| `observacion` | observación, nota, detalle, qué le falta | |

Lo que no reconozca no se pierde: va al campo `extra` en JSON y la IA lo ve.

**`observacion` es el campo que más cambia la tasa de respuesta.** Un lead con
"su página tarda 8 segundos en abrir en celular" recibe un mensaje concreto.
Uno sin observación recibe una generalidad, y las generalidades no se contestan.

Ver `scripts/leads-ejemplo.csv`.

### 8. Encender

Prueba primero con **un solo lead que sea tuyo**: importa tu propio número y
ejecuta el flujo 01 a mano con **Execute Workflow**. Mira el mensaje que llega.
Si te suena a robot, ajusta `prompt_apertura` y repite.

Cuando el mensaje te guste, activa los tres flujos con el interruptor de arriba
a la derecha.

---

## Los tres flujos

### 01 · Prospección en frío
Cada media hora en horario hábil. Comprueba horario y cupo, aparta un lote de
leads (`apartar_lote`), y por cada uno: verifica que el número tenga WhatsApp,
pide a Claude un mensaje escrito para ese negocio, lo limpia, lo envía, lo
registra y espera un rato aleatorio antes del siguiente.

Un número sin WhatsApp queda en `invalido` sin gastar cupo. Un envío fallido
devuelve el lead a la cola, no lo pierde.

### 02 · Respuestas entrantes
Webhook desde Evolution. Normaliza el mensaje (descarta grupos, estados y lo
que tú mismo envías), lo guarda, arma el historial y hace **una sola llamada**
a Claude que clasifica la intención y redacta la respuesta a la vez.

- **baja** → lista negra + una despedida de texto fijo. No pasa por la IA.
- **interesado / pregunta** → responde y, si la temperatura llega a 4, te avisa
  a tu propio WhatsApp.
- **no_interesado** → agradece y cierra.

Una respuesta del lead corta su secuencia de seguimientos automáticamente.

### 03 · Seguimientos
Una pasada al día. Toma los leads con seguimiento vencido y escribe el
siguiente toque, mostrándole a la IA lo ya enviado para que no repita el
ángulo. Tres toques como máximo: apertura, +3 días, +5 días. El último es un
cierre limpio que avisa que no vuelves a escribir — y suele ser el que más
responden.

---

## Operación diaria

```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d prospector
```

```sql
select * from v_hoy;             -- cupo, enviados, si estás en horario
select * from v_embudo;          -- leads por estado
select * from v_conversaciones;  -- quién está caliente, ordenado
```

El recetario completo de consultas está en
[docs/operacion.md](docs/operacion.md); el razonamiento comercial detrás de los
prompts, en [docs/playbook-comercial.md](docs/playbook-comercial.md).

### Frenar todo

```sql
update ajustes set valor = '0' where clave = 'limite_diario_max';
```

Corta los envíos nuevos al instante y deja vivas las conversaciones en curso.
Para parar también las respuestas, desactiva el flujo 02 en n8n.

---

## Costos

Cada mensaje son entre 1.500 y 4.000 tokens de entrada y unos 200 de salida con
`claude-opus-5`. La ficha comercial y el prompt van marcados con
`cache_control`, así que a partir de la segunda llamada del día esa parte se
cobra a una fracción.

En la práctica, 40 mensajes diarios más sus respuestas cuestan pocos dólares al
mes. Si quieres bajarlo más, `esfuerzo_apertura` ya está en `low`; también
puedes cambiar `modelo` a `claude-sonnet-5` en la tabla `ajustes` sin tocar
ningún flujo.

---

## Migraciones

Los archivos de `db/` corren **una sola vez**, cuando el volumen de Postgres
está vacío. Si cambias el esquema después, aplica el cambio a mano:

```bash
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d prospector < db/01-esquema.sql
```

Casi todo en `01-esquema.sql` es `create or replace`, así que reaplicarlo
actualiza las funciones sin tocar los datos. Los `create table` y `create type`
sí fallarán con "ya existe": es esperado, y no rompen nada.

Para empezar de cero (**borra todos los leads y conversaciones**):

```bash
docker compose down -v && docker compose up -d
```

---

## Cuando algo falla

| Síntoma | Dónde mirar |
|---|---|
| No llega ningún mensaje | `select * from v_hoy;` — casi siempre es cupo agotado o estar fuera de horario |
| El flujo 02 no se dispara | `./scripts/conectar-whatsapp.sh --estado`. Si el webhook está vacío: `--webhook` |
| «credential not found» al ejecutar | Falta seleccionar la credencial en ese nodo tras importar |
| El QR expira antes de escanear | Vuelve a correr el script; Evolution genera uno nuevo |
| El estado se queda en `connecting` | `docker compose restart evolution` y vuelve a vincular |
| Los mensajes suenan a robot | Es el prompt, no el modelo. `prompt_apertura` en `ajustes` |
| Un webhook llegó pero no se procesó | `select payload from eventos order by id desc limit 5;` — ahí está el crudo |
| Cambió el formato de Evolution | Compara `eventos.payload` con lo que espera el nodo «Normalizar» |

Los errores de la IA quedan en `eventos` con `fuente = 'anthropic'`. Cuando la
redacción falla no se envía nada: mejor un silencio que un mensaje roto.
