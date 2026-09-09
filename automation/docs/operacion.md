# Operación diaria

Recetario de consultas. Todas se corren dentro del contenedor:

```bash
cd automation
docker compose exec postgres psql -U "$POSTGRES_USER" -d prospector
```

---

## Ver cómo va

```sql
-- Lo primero cada mañana: cupo, enviados, si estás en horario.
select * from v_hoy;

-- Embudo completo.
select * from v_embudo;

-- Conversaciones vivas, las más calientes arriba.
select * from v_conversaciones;
```

```sql
-- Una conversación completa, como se leería en el chat.
select case direccion when 'saliente' then '→ yo' else '← él' end as quien,
       etapa,
       creado_en::timestamp(0) as cuando,
       texto
  from mensajes
 where lead_id = 42
 order by creado_en;
```

```sql
-- Qué tan bien está funcionando la apertura, por semana.
select date_trunc('week', m.creado_en)::date as semana,
       count(*) filter (where m.etapa = 'apertura')          as aperturas,
       count(distinct l.id) filter (where l.respondio_en is not null) as respondieron,
       round(100.0 * count(distinct l.id) filter (where l.respondio_en is not null)
             / nullif(count(*) filter (where m.etapa = 'apertura'), 0), 1) as tasa_pct
  from mensajes m
  join leads l on l.id = m.lead_id
 where m.direccion = 'saliente'
 group by 1 order by 1 desc;
```

```sql
-- ¿Qué ganchos usó la IA y cuáles funcionaron? (el gancho va en meta)
select l.rubro, count(*) as escritos,
       count(*) filter (where l.respondio_en is not null) as respondieron
  from leads l
 where l.toques > 0
 group by 1 order by 2 desc;
```

---

## Ajustar el ritmo

```sql
-- Subir el techo diario (la rampa sigue mandando los primeros 14 días).
update ajustes set valor = '60' where clave = 'limite_diario_max';

-- Cambiar el horario de envío.
update ajustes set valor = '10' where clave = 'hora_inicio';
update ajustes set valor = '19' where clave = 'hora_fin';

-- Incluir el sábado (1 = lunes … 7 = domingo).
update ajustes set valor = '1,2,3,4,5,6' where clave = 'dias_habiles';

-- Separar más los envíos entre sí (segundos).
update ajustes set valor = '120' where clave = 'pausa_min_seg';
update ajustes set valor = '400' where clave = 'pausa_max_seg';

-- FRENO DE MANO: corta los envíos nuevos, deja vivas las conversaciones.
update ajustes set valor = '0' where clave = 'limite_diario_max';
```

Cualquier cambio aquí lo toma el siguiente disparo del cron. No hay que
reiniciar nada ni reimportar los flujos.

---

## Editar el pitch

Los textos largos se editan mejor desde un archivo que desde `psql`.

```bash
# 1. Sacarlo a un archivo
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d prospector -tA \
  -c "select valor from ajustes where clave = 'ficha_comercial'" > /tmp/ficha.txt

# 2. Editarlo
nano /tmp/ficha.txt

# 3. Devolverlo (el heredoc con comillas evita que el shell toque el contenido)
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d prospector <<SQL
update ajustes set valor = \$ficha\$
$(cat /tmp/ficha.txt)
\$ficha\$ where clave = 'ficha_comercial';
SQL
```

Lo mismo sirve para `prompt_apertura`, `prompt_seguimiento` y
`prompt_conversacion`.

**Lo primero que hay que editar** es el bloque `PRECIOS` de `ficha_comercial`.
Mientras diga `[PENDIENTE]`, la IA tiene prohibido decir cifras y desvía toda
pregunta de precio hacia la llamada. Eso funciona, pero conviene que sea una
decisión tuya y no un descuido.

---

## Mano a mano con los leads

```sql
-- Sacar a alguien de la cola sin darlo de baja.
select * from marcar_estado(42, 'no_interesado');

-- Marcar que cerró.
select * from marcar_estado(42, 'cliente', 5, 'firmó landing + reservas');

-- Baja manual (entra en la lista negra, es irreversible por diseño).
select dar_de_baja('573001112233', 'me lo pidió por teléfono');

-- Reactivar un lead que se marcó por error como inválido.
update leads set estado = 'nuevo', toques = 0, siguiente_toque_en = null
 where id = 42;

-- Programar un seguimiento para mañana a mano.
update leads set siguiente_toque_en = now() + interval '1 day' where id = 42;
```

```sql
-- Los que nunca contestaron y ya agotaron sus tres toques.
select id, negocio, ciudad, ultimo_contacto_en::date
  from leads
 where estado = 'contactado' and toques >= 3
 order by ultimo_contacto_en;
```

---

## Depurar

```sql
-- Los últimos webhooks tal como llegaron.
select id, tipo, creado_en::timestamp(0), jsonb_pretty(payload)
  from eventos where fuente = 'evolution'
 order by id desc limit 3;

-- Errores de la IA.
select creado_en::timestamp(0), payload
  from eventos where fuente = 'anthropic'
 order by id desc limit 10;

-- Leads trabados en 'en_cola' (una ejecución que murió a medias).
select id, negocio, actualizado_en from leads
 where estado = 'en_cola' and actualizado_en < now() - interval '1 hour';

-- Devolverlos a la cola.
update leads set estado = 'nuevo'
 where estado = 'en_cola' and actualizado_en < now() - interval '1 hour';
```

```bash
# Logs en vivo
docker compose logs -f n8n
docker compose logs -f evolution

# ¿Sigue vinculado el WhatsApp?
./scripts/conectar-whatsapp.sh --estado
```

---

## Respaldo

La base es lo único irreemplazable: los leads, las conversaciones y, sobre
todo, quién pidió baja.

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" prospector \
  | gzip > respaldo-$(date +%F).sql.gz
```

Restaurar:

```bash
gunzip -c respaldo-2026-09-09.sql.gz \
  | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d prospector
```
