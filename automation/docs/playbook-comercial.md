# Playbook comercial

Por qué los prompts dicen lo que dicen. Si vas a cambiarlos —y deberías, en
cuanto tengas datos propios— esto es el razonamiento que hay detrás.

---

## La premisa

Un mensaje en frío por WhatsApp compite contra el pulgar. La persona no te
conoce, no te pidió nada, y decide en dos segundos si archiva el chat. Todo lo
que hagas tiene que sobrevivir a esos dos segundos.

De ahí salen las tres reglas que atraviesan todo el sistema:

1. **El primer mensaje no vende.** Solo busca una respuesta. Cualquiera.
2. **Lo específico gana.** "Vi que no tienen página" derrota a "ofrecemos
   soluciones digitales" siempre, sin excepción.
3. **La salida fácil sube la tasa de respuesta.** Ofrecer la baja en el primer
   mensaje quita la sensación de acoso, y quien no la usa está más dispuesto a
   contestar.

---

## Los tres momentos

### Prospectar en frío — ganar la respuesta

El mensaje de apertura tiene cuatro partes, en este orden:

```
  1. Un dato concreto de SU negocio        ← lo único que evita el archivo
  2. Quién eres, en cinco palabras
  3. Una pregunta fácil de contestar
  4. La salida
```

Ejemplo:

> Hola Marcela, vi que La Toscana no tiene página y las reservas les llegan por
> DM. Soy José, hago sitios web con reservas automáticas. ¿Cuántas mesas se les
> van por no contestar a tiempo?
>
> Si no te interesa dime "baja" y no te escribo más.

Fíjate en la pregunta: no es "¿te interesa?" (sí/no, y el no es gratis) ni
"¿cuándo podemos hablar?" (pide un compromiso antes de que exista razón para
darlo). Es una pregunta sobre **su** dolor, que la persona sabe contestar y que
le cuesta menos responder que ignorar.

**El material entra por el campo `observacion`.** Si está vacío, la IA solo
puede escribir generalidades, y las generalidades no se contestan. Vale más un
lote de 30 leads con una observación real cada uno que 300 en blanco.

Lo que nunca funciona: emojis en fila, "espero que estés bien", enlaces en el
primer mensaje (van directo a la carpeta de spam mental), audios, y cualquier
frase que empiece con "Somos una empresa".

### Elevator pitch — cuando preguntan qué haces

Dos frases. Problema primero, solución después:

> Hago sitios web para negocios que ya tienen clientes pero los están perdiendo
> en el camino: la gente escribe y nadie contesta, o la página tarda tanto que
> se salen antes de verla. Construyo la parte que cierra la venta, no la que se
> ve bonita.

Lo que la hace funcionar es que **nombra un problema que la persona reconoce en
su propio negocio** antes de decir qué vendes. La versión mala —"desarrollo web
full-stack con Node y React"— habla de ti; ésta habla de él.

Los tres proyectos del portafolio existen para respaldarla, y cada uno sirve
para un tipo de lead distinto:

| El lead es… | El caso que le sirve | Por qué |
|---|---|---|
| Un negocio que vive del WhatsApp | **Cotizador Web** | El cliente arma su precio sin esperar una llamada |
| Uno que pierde reservas o citas | **Spartan** | Prueba de que manejas estado en vivo y sin desfase |
| Uno que ya vende y quiere escalar | **LeadHunter v2** | Prueba de que construyes herramientas, no folletos |

### Cerrar — mover a la llamada

El objetivo de toda conversación es **una llamada de 15 minutos**. No se cotiza
por chat. No se manda catálogo. El chat solo sirve para ganar la llamada.

El orden importa y es contraintuitivo: **primero contestas lo que preguntaron,
después mueves hacia la llamada.** Esquivar la pregunta para empujar la reunión
es la forma más rápida de perder un lead tibio.

**Las objeciones y qué hay detrás de cada una:**

| Dice | Quiere decir | Qué hacer |
|---|---|---|
| "¿Cuánto cuesta?" | Está evaluando, no descartando | Rango si lo tienes, y los 15 minutos. Nunca una cifra inventada |
| "Ya tengo página" | Tiene una que no le sirve, y lo sabe | No la ataques: "¿te está trayendo clientes o solo está ahí?" |
| "Mándame información" | Es un no cortés, casi siempre | No mandes un PDF. Devuelve una pregunta sobre su negocio: cuesta menos responderla que leer un catálogo |
| "No tengo tiempo" | No le has dado una razón suficiente | 15 minutos, cuando le sirva, incluso el sábado |
| "Lo consulto y te aviso" | Puede ser real | Acepta sin presionar y propón una fecha concreta |

**Dónde entras tú.** El flujo te avisa a tu propio WhatsApp cuando la
temperatura llega a 4, o cuando el lead pide algo que solo un humano contesta:
una cotización formal, una factura, cerrar, o algo que la ficha comercial no
cubre. En esos casos la IA reconoce lo que pidieron y dice que tú contestas hoy
— y a partir de ahí es tuyo.

---

## El diferenciador

De todo lo que vendes, hay un punto que aparece una y otra vez en el mercado:
**las agencias desaparecen después del lanzamiento.** Es la queja más común de
cualquier negocio que ya contrató a alguien, y está en la ficha comercial por
eso. No es una frase de marketing: es la objeción anticipada del lead que ya se
quemó una vez.

Úsalo en la llamada, no en el primer mensaje. En frío suena a promesa vacía;
después de que te cuente su historia con la agencia anterior, suena a respuesta.

---

## Qué medir

En este orden, porque cada uno arregla algo distinto:

1. **Tasa de respuesta a la apertura.** Si está por debajo del 10%, el problema
   es el mensaje o los datos. Casi siempre es que `observacion` viene vacía.
2. **Cuántos llegan a temperatura 4+.** Si contestan pero nunca se calientan, el
   problema es el manejo de objeciones en `prompt_conversacion`.
3. **Cuántas llamadas se agendan.** Si se calientan y no agendan, el problema es
   que estás cerrando por chat en vez de mover a la llamada.
4. **Cuántas bajas.** Más del 5% significa que el mensaje se lee como spam.
   Acorta y hazlo más específico.

Las consultas para sacar estos números están en
[operacion.md](operacion.md#ver-cómo-va).

---

## Cómo iterar sin romperlo

No cambies los tres prompts a la vez: no vas a saber cuál movió el número.

El orden útil es:

1. **`observacion` en los datos.** Es lo que más mueve la aguja, y no requiere
   tocar ningún prompt.
2. **`prompt_apertura`.** Cambia una regla, manda 20 mensajes, compara.
3. **`prompt_conversacion`.** Solo cuando ya tengas conversaciones reales que
   leer. Las objeciones que de verdad te ponen no son las que imaginabas.

Y lee las conversaciones. Todas, al principio:

```sql
select case direccion when 'saliente' then '→' else '←' end, texto
  from mensajes where lead_id = 42 order by creado_en;
```

Los prompts que vienen en `db/02-ajustes.sql` son un punto de partida razonable,
no un resultado medido. El sistema está hecho para que los cambies.
