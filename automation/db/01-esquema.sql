-- ═══════════════════════════════════════════════════════════════════════════
-- Esquema de la base `prospector`.
--
-- Idea central: la base es la que manda. Los flujos de n8n son tontos a
-- propósito — piden trabajo, envían, y reportan. Toda la lógica de "a quién le
-- toca hoy", "cuántos caben" y "quién ya dijo que no" vive aquí, en funciones.
-- Así el mismo estado sirve para n8n, para un script suelto y para una consulta
-- a mano cuando quieras saber cómo va el embudo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Tipos ──────────────────────────────────────────────────────────────────

create type lead_estado as enum (
  'nuevo',           -- importado, nadie lo ha tocado
  'en_cola',         -- apartado por una ejecución en curso
  'contactado',      -- se envió la apertura, sin respuesta todavía
  'respondio',       -- contestó algo, aún sin clasificar
  'interesado',      -- respondió con señal de compra
  'agendado',        -- hay llamada o reunión puesta
  'cliente',         -- cerró
  'no_interesado',   -- dijo que no, pero sin pedir baja
  'no_contactar',    -- pidió baja explícita. Nunca más.
  'invalido',        -- el número no tiene WhatsApp
  'error'            -- falló el envío y hay que revisarlo a mano
);

create type direccion_msg as enum ('saliente', 'entrante');

-- ─── Tablas ─────────────────────────────────────────────────────────────────

-- Configuración y textos comerciales. Está en la base y no en el .env a
-- propósito: así cambias el pitch, el horario o el límite diario sin reiniciar
-- nada ni volver a importar los flujos.
create table ajustes (
  clave          text primary key,
  valor          text not null,
  nota           text,
  actualizado_en timestamptz not null default now()
);

create table leads (
  id            bigserial primary key,
  -- E.164 sin '+' ni espacios: 573052624583. Lo normaliza el importador.
  telefono      text not null unique,
  nombre        text,                       -- persona, si la conoces
  negocio       text not null,
  rubro         text,                       -- "restaurante", "gimnasio", "clínica dental"
  ciudad        text,
  sitio_web     text,                       -- vacío = argumento de venta
  -- Qué le viste mal o qué le falta. Es el campo que más mueve la aguja en el
  -- mensaje de apertura: sin esto, la IA solo puede escribir generalidades.
  observacion   text,
  origen        text,                       -- "google maps", "instagram", "referido"
  extra         jsonb not null default '{}'::jsonb,

  estado             lead_estado not null default 'nuevo',
  toques             smallint    not null default 0,   -- mensajes salientes de prospección
  ultimo_contacto_en timestamptz,
  siguiente_toque_en timestamptz,
  respondio_en       timestamptz,
  temperatura        smallint,                          -- 1 frío … 5 listo para cerrar
  nota_interna       text,                              -- lo que la IA entendió del lead

  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index leads_cola_idx     on leads (estado, creado_en);
create index leads_seguimiento_idx on leads (estado, siguiente_toque_en)
  where siguiente_toque_en is not null;

create table mensajes (
  id        bigserial primary key,
  lead_id   bigint references leads(id) on delete cascade,
  telefono  text not null,
  direccion direccion_msg not null,
  -- apertura | seguimiento_1..3 | conversacion | baja | aviso
  etapa     text,
  texto     text not null,
  wa_id     text,                          -- id del mensaje en WhatsApp
  meta      jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index mensajes_lead_idx on mensajes (lead_id, creado_en desc);
create index mensajes_dia_idx  on mensajes (direccion, creado_en);
-- Evolution puede reenviar el mismo webhook. Esto lo hace idempotente.
create unique index mensajes_wa_id_idx on mensajes (wa_id) where wa_id is not null;

-- Lista negra. Es lo único que ninguna función puede saltarse.
create table bloqueos (
  telefono  text primary key,
  motivo    text not null default 'baja solicitada',
  creado_en timestamptz not null default now()
);

-- Bitácora cruda de webhooks. Sirve para depurar cuando Evolution cambia el
-- formato del payload entre versiones.
create table eventos (
  id        bigserial primary key,
  fuente    text not null,
  tipo      text,
  payload   jsonb not null,
  creado_en timestamptz not null default now()
);

create index eventos_fecha_idx on eventos (creado_en desc);

-- ─── actualizado_en automático ──────────────────────────────────────────────

create or replace function tocar_actualizado_en() returns trigger
language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger leads_actualizado   before update on leads
  for each row execute function tocar_actualizado_en();
create trigger ajustes_actualizado before update on ajustes
  for each row execute function tocar_actualizado_en();

-- ═══════════════════════════════════════════════════════════════════════════
-- Lectura de ajustes
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function ajuste(p_clave text, p_default text default null)
returns text language sql stable as $$
  select coalesce((select valor from ajustes where clave = p_clave), p_default);
$$;

create or replace function ajuste_int(p_clave text, p_default int)
returns int language sql stable as $$
  select coalesce(nullif(ajuste(p_clave), '')::int, p_default);
$$;

-- La zona horaria del negocio, no la del servidor.
create or replace function zona() returns text language sql stable as $$
  select ajuste('zona_horaria', 'America/Bogota');
$$;

create or replace function ahora_local() returns timestamp language sql stable as $$
  select (now() at time zone zona());
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Límites de envío
--
-- Un número recién vinculado que dispara 100 mensajes en frío el primer día se
-- gana un baneo. La rampa sube el cupo con los días de vida del número.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function dias_de_vida_numero() returns int
language sql stable as $$
  select greatest(
    1,
    (current_date - coalesce(nullif(ajuste('numero_activo_desde'), '')::date,
                             current_date)) + 1
  );
$$;

create or replace function limite_diario_hoy() returns int
language sql stable as $$
  select least(
    ajuste_int('limite_diario_max', 40),
    case
      when dias_de_vida_numero() <= 3  then ajuste_int('rampa_dia_1_3',   10)
      when dias_de_vida_numero() <= 7  then ajuste_int('rampa_dia_4_7',   20)
      when dias_de_vida_numero() <= 14 then ajuste_int('rampa_dia_8_14',  30)
      else ajuste_int('limite_diario_max', 40)
    end
  );
$$;

-- Cuenta solo prospección (apertura + seguimientos). Las respuestas dentro de
-- una conversación viva no gastan cupo: esas las pidió el lead.
create or replace function enviados_hoy() returns int
language sql stable as $$
  select count(*)::int
    from mensajes
   where direccion = 'saliente'
     and (etapa = 'apertura' or etapa like 'seguimiento_%')
     and (creado_en at time zone zona())::date = ahora_local()::date;
$$;

create or replace function cupo_restante() returns int
language sql stable as $$
  select greatest(limite_diario_hoy() - enviados_hoy(), 0);
$$;

-- ¿Estamos dentro del horario en que un humano escribiría?
create or replace function en_horario() returns boolean
language sql stable as $$
  select extract(isodow from ahora_local())::int
           = any (string_to_array(ajuste('dias_habiles', '1,2,3,4,5'), ',')::int[])
     and extract(hour from ahora_local())::int
           between ajuste_int('hora_inicio', 9) and ajuste_int('hora_fin', 18) - 1;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Colas
-- ═══════════════════════════════════════════════════════════════════════════

-- Aparta hasta `p_max` leads nuevos y los marca `en_cola` en la misma
-- transacción. `skip locked` evita que dos ejecuciones simultáneas de n8n
-- agarren el mismo lead y le escriban dos veces.
create or replace function apartar_lote(p_max int default 5)
returns setof leads language plpgsql as $$
declare
  v_cupo int := least(greatest(p_max, 0), cupo_restante());
begin
  if v_cupo = 0 then
    return;
  end if;

  return query
  update leads l
     set estado = 'en_cola'
   where l.id in (
     select c.id
       from leads c
      where c.estado = 'nuevo'
        and c.telefono is not null
        and not exists (select 1 from bloqueos b where b.telefono = c.telefono)
      order by c.creado_en
      limit v_cupo
      for update skip locked
   )
  returning l.*;
end $$;

-- Seguimientos vencidos. El "apartado" aquí es empujar `siguiente_toque_en`
-- media hora: si la ejecución muere a medio camino, el lead vuelve solo a la
-- cola en vez de quedarse trabado para siempre.
create or replace function apartar_seguimientos(p_max int default 5)
returns setof leads language plpgsql as $$
declare
  v_cupo int := least(greatest(p_max, 0), cupo_restante());
begin
  if v_cupo = 0 then
    return;
  end if;

  return query
  update leads l
     set siguiente_toque_en = now() + interval '30 minutes'
   where l.id in (
     select c.id
       from leads c
      where c.estado = 'contactado'
        and c.siguiente_toque_en is not null
        and c.siguiente_toque_en <= now()
        and c.toques < ajuste_int('max_toques', 3)
        and not exists (select 1 from bloqueos b where b.telefono = c.telefono)
      order by c.siguiente_toque_en
      limit v_cupo
      for update skip locked
   )
  returning l.*;
end $$;

-- Devuelve un lead a la cola cuando el envío falla por algo transitorio.
create or replace function soltar_lead(p_lead_id bigint) returns void
language sql as $$
  update leads set estado = 'nuevo' where id = p_lead_id and estado = 'en_cola';
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Registro de actividad
-- ═══════════════════════════════════════════════════════════════════════════

-- Espaciado entre toques: 3 días al primero, 5 al segundo, y se acabó.
create or replace function espera_siguiente_toque(p_toques int)
returns interval language sql stable as $$
  select case p_toques
           when 1 then make_interval(days => ajuste_int('espera_toque_2', 3))
           when 2 then make_interval(days => ajuste_int('espera_toque_3', 5))
           else null
         end;
$$;

-- OJO al llamarla: `select * from registrar_envio(...)` la evalúa una vez.
-- `select (registrar_envio(...)).*` la evalúa UNA VEZ POR COLUMNA, y entonces
-- el contador de toques se dispara. Los flujos usan siempre la primera forma.
create or replace function registrar_envio(
  p_lead_id bigint,
  p_texto   text,
  p_etapa   text default 'apertura',
  p_wa_id   text default null
) returns leads language plpgsql as $$
declare
  v_lead   leads;
  v_toques int;
begin
  select * into v_lead from leads where id = p_lead_id for update;
  if not found then
    raise exception 'lead % no existe', p_lead_id;
  end if;

  insert into mensajes (lead_id, telefono, direccion, etapa, texto, wa_id)
  values (p_lead_id, v_lead.telefono, 'saliente', p_etapa, p_texto, p_wa_id)
  on conflict do nothing;

  v_toques := v_lead.toques + 1;

  update leads
     set estado = case
                    -- Si ya venía conversando, un envío no lo devuelve a frío.
                    when estado in ('nuevo', 'en_cola', 'contactado') then 'contactado'
                    else estado
                  end,
         toques             = v_toques,
         ultimo_contacto_en = now(),
         siguiente_toque_en = now() + espera_siguiente_toque(v_toques)
   where id = p_lead_id
  returning * into v_lead;

  return v_lead;
end $$;

-- Alta o localización de un lead a partir de un mensaje entrante. Cubre el caso
-- de alguien que escribe sin estar en la base (un referido, por ejemplo).
create or replace function registrar_entrante(
  p_telefono text,
  p_texto    text,
  p_wa_id    text default null,
  p_nombre   text default null
) returns leads language plpgsql as $$
declare
  v_lead leads;
begin
  select * into v_lead from leads where telefono = p_telefono for update;

  if not found then
    insert into leads (telefono, nombre, negocio, origen, estado, respondio_en)
    values (p_telefono,
            p_nombre,
            coalesce(nullif(p_nombre, ''), 'Desconocido ' || p_telefono),
            'entrante',
            'respondio',
            now())
    returning * into v_lead;
  end if;

  insert into mensajes (lead_id, telefono, direccion, etapa, texto, wa_id)
  values (v_lead.id, p_telefono, 'entrante', 'conversacion', p_texto, p_wa_id)
  on conflict (wa_id) where wa_id is not null do nothing;

  update leads
     set estado = case
                    when estado in ('contactado', 'en_cola', 'nuevo') then 'respondio'
                    else estado
                  end,
         respondio_en = coalesce(respondio_en, now()),
         -- Un lead que contesta sale de la secuencia automática: a partir de
         -- aquí la conversación manda.
         siguiente_toque_en = null
   where id = v_lead.id
  returning * into v_lead;

  return v_lead;
end $$;

create or replace function dar_de_baja(p_telefono text, p_motivo text default 'baja solicitada')
returns void language sql as $$
  insert into bloqueos (telefono, motivo)
  values (p_telefono, p_motivo)
  on conflict (telefono) do nothing;

  update leads
     set estado = 'no_contactar', siguiente_toque_en = null
   where telefono = p_telefono;
$$;

create or replace function marcar_estado(
  p_lead_id     bigint,
  p_estado      lead_estado,
  p_temperatura smallint default null,
  p_nota        text default null
) returns leads language sql as $$
  update leads
     set estado      = p_estado,
         temperatura = coalesce(p_temperatura, temperatura),
         nota_interna = coalesce(p_nota, nota_interna),
         siguiente_toque_en = case
           when p_estado in ('no_interesado', 'no_contactar', 'cliente', 'invalido')
             then null
           else siguiente_toque_en
         end
   where id = p_lead_id
  returning *;
$$;

-- Últimos N mensajes en el formato que espera la API de Anthropic.
create or replace function historial(p_lead_id bigint, p_n int default 12)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(m order by m.creado_en), '[]'::jsonb)
    from (
      select jsonb_build_object(
               'role',    case when direccion = 'saliente' then 'assistant' else 'user' end,
               'content', texto
             ) as m,
             creado_en
        from mensajes
       where lead_id = p_lead_id
       order by creado_en desc
       limit p_n
    ) m;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Vistas de control
-- ═══════════════════════════════════════════════════════════════════════════

create view v_embudo as
  select estado, count(*) as leads
    from leads
   group by estado
   order by count(*) desc;

create view v_hoy as
  select limite_diario_hoy()               as cupo_del_dia,
         enviados_hoy()                    as enviados,
         cupo_restante()                   as restante,
         dias_de_vida_numero()             as dia_del_numero,
         en_horario()                      as dentro_de_horario,
         (select count(*) from leads where estado = 'nuevo')      as en_cola,
         (select count(*) from mensajes
           where direccion = 'entrante'
             and (creado_en at time zone zona())::date = ahora_local()::date) as respuestas_hoy;

create view v_conversaciones as
  select l.id, l.negocio, l.telefono, l.estado, l.temperatura,
         l.toques, l.ultimo_contacto_en, l.nota_interna,
         (select count(*) from mensajes m where m.lead_id = l.id and m.direccion = 'entrante')
           as mensajes_recibidos
    from leads l
   where l.estado in ('respondio', 'interesado', 'agendado')
   order by l.temperatura desc nulls last, l.ultimo_contacto_en desc;
