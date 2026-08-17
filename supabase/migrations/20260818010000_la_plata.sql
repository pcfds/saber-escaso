-- La plata. Y la otra mitad del pedido: que se pueda vender y comprar.
--
-- Este documento decía que el valle no tenía moneda a propósito. **Era una
-- lectura de quien lo escribió y la dirección la corrigió** (DISENO §9.3b):
--
--   > "No, debe haber economía: vender, poder tener plata de distintos tipos,
--   >  intercambios. El saber es algo más valioso pero nada que ver."
--
-- Y es mejor así, porque un mercado no diluye la tesis del saber escaso: **la
-- afila.** Sin mercado, "el saber es lo único que importa" es una afirmación
-- sin nada contra qué contrastarse. Con mercado es una experiencia:
--
--   Podés comprar una hoja templada. **No podés comprar saber hacerla.**
--
-- El día que se muera Ilde vas a tener la plata en la mano y no va a haber una
-- sola hoja nueva en el valle, ni al doble ni al triple. **Un mercado sabe
-- decir "no hay" de una manera que un menú no.**
--
-- ═════════════════════════════════════════════════════════════
-- LA REGLA DURA, y es la que no se rompe
-- ═════════════════════════════════════════════════════════════
--
-- **Ninguna transacción puede terminar con una fila nueva en `knows`.** Ni
-- comprar, ni vender, ni pagar una lección. Se paga para que alguien te HAGA
-- algo; no se paga para que te lo ENSEÑE. Si alguna vez hay un precio para
-- aprender, este juego dejó de ser el que es.
--
-- Es la misma regla que ya cumple `case 'pedir'` desde la pasada anterior —un
-- select y un update, cero inserts— y por eso el verbo `comprar` salió de
-- copiar ese caso y cambiarle lo que se paga. Ver el comentario largo de
-- `tick.ts` sobre por qué el costo estaba separado del efecto: poner precio fue
-- cambiar una línea, no reescribir el verbo.
--
-- ═════════════════════════════════════════════════════════════
-- Los tres verbos. ESTO NO ES OPCIONAL Y YA MORDIÓ CUATRO VECES.
-- ═════════════════════════════════════════════════════════════
--
-- Si el verbo no está en el CHECK, el insert de `actions` **falla en silencio**
-- —supabase-js no tira excepción cuando un CHECK rechaza un insert—, nadie mira
-- el error, y el jugador lee "se resuelve cuando cierre el día del valle" para
-- siempre. **La lista viva es este CHECK, no el CLAUDE.md.**
--
-- `cambiar` y no `trocar` ni `canjear`: es cambiar plata por plata, nada más.
-- Cambiar una cosa por otra es `vender` y después `comprar`, que es lo que de
-- verdad pasa cuando alguien te dice "te lo cambio".

alter table actions drop constraint if exists actions_verb_check;
alter table actions add constraint actions_verb_check
  check (verb in (
    'ir', 'hablar', 'trabajar', 'aprender', 'ensenar', 'pelear',
    'encargarse', 'buscar', 'dar',
    'preparar', 'lanzar',
    'tomar',
    'soltar', 'levantar',
    'pedir',
    -- La plata.
    'vender', 'comprar', 'cambiar'
  ));

-- ═════════════════════════════════════════════════════════════
-- Plata de distintos tipos. No es un adorno: fue el pedido.
-- ═════════════════════════════════════════════════════════════
--
-- El valle tiene dos pueblos que no son humanos, con lengua propia y un agravio
-- concreto (`peoples`). Lo que acepta la aldea no tiene por qué valer del otro
-- lado. **Una moneda que no sirve del otro lado del valle es geografía, es
-- política y es una razón para viajar — las tres cosas de una.**
--
-- Y ninguna de las tres se acuña acá. El marco lo trajeron las compañías de
-- afuera; la cuenta de hueso y la gota de resina las hacen ellos, no nosotros.
-- Es el mismo principio que `objects.made_by`: una cosa que existe porque
-- alguien la hizo, y el valle no es ese alguien.
--
-- Catálogo GLOBAL, sin `region_id`, igual que `knowledge` y `horarios`: es
-- vocabulario del mundo, no estado de una partida.
create table monedas (
  slug      text primary key,
  -- Cómo se llama una. El plural va aparte porque el cliente escribe "3 gotas
  -- de resina" y no "3 gota de resina", y armar plurales en castellano desde el
  -- singular es cómo se llega a "3 cuenta de huesos".
  singular  text not null,
  plural    text not null,
  -- Quién la acepta, en una línea, para el jugador. NO es una regla: la regla
  -- vive en `mostradores.moneda`. Esto es lo que se lee en la bolsa.
  quien     text not null,
  -- El pueblo que la usa, si es de un pueblo. Null = la usan los humanos del
  -- valle. De acá sale el tipo de cambio: `peoples.aprecio` decide cuánto te
  -- cuesta conseguir la suya, o sea que **la política ES la cotización.**
  pueblo    text
);

insert into monedas (slug, singular, plural, quien, pueblo) values
  ('marco',  'marco de compañía', 'marcos de compañía',
   'Metal acuñado que trajeron las compañías del otro lado de la cordillera. Es lo que se acepta en la aldea, y del otro lado del valle no es más que un pedazo de metal con la cara de alguien que nadie conoce.',
   null),
  ('hueso',  'cuenta de hueso', 'cuentas de hueso',
   'Pulidas de a una y contadas de a una. Es lo único que aceptan Los de la Ceniza, y no las hace nadie del valle.',
   'ceniza'),
  ('resina', 'gota de resina', 'gotas de resina',
   'Savia endurecida de los robles viejos. Es lo que aceptan Los del Sotobosque, y sale del monte donde entierran a los suyos.',
   'sotobosque')
on conflict (slug) do nothing;

-- ═════════════════════════════════════════════════════════════
-- La bolsa
-- ═════════════════════════════════════════════════════════════
--
-- Polimórfica igual que `knows` y `objects`: vale para un jugador, para una
-- persona y para un pueblo entero. Un pueblo con bolsa es lo que hace que
-- «Los del Sotobosque no tienen con qué pagarte» sea una frase posible.
--
-- ⚠ **`region_id` está a propósito, y no es prolijidad.** `knows` no lo tiene y
--   eso ya costó: es global, es polimórfica, no tiene foreign key, así que
--   **borrar una región no borra sus filas** y quedan huérfanas para siempre —
--   con PostgREST cortando en 1.000 filas sin avisar arriba de todo. La bolsa
--   nace con el `cascade` puesto.
create table bolsas (
  id           uuid primary key default gen_random_uuid(),
  region_id    uuid not null references regions(id) on delete cascade,
  holder_kind  text not null check (holder_kind in ('player', 'person', 'people')),
  holder_id    uuid not null,
  moneda       text not null references monedas(slug),
  -- ⚠ `>= 0` en la base y no sólo en el código. Es la única defensa real contra
  --   que un error de cuenta le invente plata al valle: una resta que deja
  --   negativo revienta acá en vez de imprimir dinero en silencio.
  cantidad     integer not null default 0 check (cantidad >= 0),
  unique (region_id, holder_kind, holder_id, moneda)
);
create index on bolsas (region_id, holder_kind, holder_id);

comment on table bolsas is
  'Lo que tiene cada uno, por tipo de moneda. LA REGLA: la plata de una región sólo AUMENTA cuando llega alguien de afuera (`acunar()` en lib/world/mercado.ts, llamada por `llegaAlguien` y por la creación de un jugador). Todo lo demás es transferencia. Es el mismo principio que `objects.made_by = null`, que sólo lo escribe `case ''buscar''`.';

-- ═════════════════════════════════════════════════════════════
-- El mostrador
-- ═════════════════════════════════════════════════════════════
--
-- La rama de arte decidió, con argumento escrito, que **no había puestos de
-- mercado en el valle porque no había comercio** (`detalles.gd`, "lo que se
-- miró y no entró"): *"un puesto de mercado es exactamente hacer por hacer, y
-- encima MIENTE sobre lo que el mundo tiene"*. Tenía razón entonces. Ahora hay
-- comercio, así que el puesto dejó de mentir y se justifica.
--
-- **`mostradores` y no `puestos`, y el nombre importa.** En el cliente
-- `puesto` YA significa otra cosa desde hace días: el puesto de trabajo de
-- adentro de una casa —el yunque de Ilde, la olla de Odila— que `interiores.gd`
-- encuentra con `puesto_cerca()` y que la E acciona como `trabajar`. Dos cosas
-- con el mismo nombre en el mismo cliente es cómo se llega a que el jugador
-- apriete comprar y se ponga a martillar. Es exactamente la razón por la que el
-- verbo se llamó `levantar` y no `tomar`.
--
-- **El stock NO es una tabla nueva: es el suelo.** `holder_kind = 'place'` ya
-- es "esta cosa está en este lugar y la levanta el que pase", y el stock de un
-- puesto es exactamente eso. Lo que separa la mercadería de la basura tirada es
-- `left_by`: **lo que dejó ahí el que atiende está en el mostrador; lo que dejó
-- cualquier otro está en el piso.** Una columna que ya existía, usada para lo
-- que significa.
--
-- Y de ahí sale gratis el primer delito del valle, que §9.3b pedía conectar "el
-- día que un objeto pueda quedar tirado en el suelo": **levantar del mostrador
-- sin pagar es robar.** Nadie te lo impide físicamente — el castigo no es una
-- celda, es que el que te vio deja de enseñarte, y como el saber vive en gente
-- mortal, perder maestros es lo más caro que hay en este mundo.
create table mostradores (
  id           uuid primary key default gen_random_uuid(),
  region_id    uuid not null references regions(id) on delete cascade,
  place_id     uuid not null references places(id) on delete cascade,
  -- Quién atiende. **Se muere y el mostrador queda cerrado**, y con él se va
  -- del valle la moneda que aceptaba. No se reasigna solo: eso sería un grifo
  -- contra la escasez. Lo reabre el que llega por el Camino del Norte, que es
  -- por donde entra todo lo que entra a este valle.
  person_id    uuid references people(id) on delete set null,
  -- **Qué moneda se acepta ACÁ.** Es el renglón que vuelve la moneda una
  -- geografía en vez de un número: cruzar el valle es cambiar de plata.
  moneda       text not null references monedas(slug),
  abre         integer not null default 8,
  cierra       integer not null default 18,
  unique (region_id, place_id)
);
create index on mostradores (region_id);

comment on column mostradores.person_id is
  'Quién atiende. Null = cerrado. Si se muere, queda cerrado y su moneda deja de circular: eso NO es un bug, es la tesis del juego aplicada a la plata.';

-- ═════════════════════════════════════════════════════════════
-- Los mostradores de las regiones que ya existen
-- ═════════════════════════════════════════════════════════════
--
-- `seed.ts` los pone para las regiones nuevas. Esto es para las dos que ya
-- están vivas, y **no inventa gente**: elige por oficio y por dónde vive, que
-- es de donde salen las tres monedas de este valle.
--
--   · la destiladora, en la aldea, con marcos. Odila "cobra por adelantado y se
--     acuerda de quién no le pagó" y "mide en cosas y no en monedas": el
--     mostrador de la aldea es suyo desde antes de que existiera la palabra.
--   · quien viva en la ruina, con cuentas de hueso. Los de la Ceniza "vivían en
--     la Casa Quemada antes de que se quemara": el que se quedó adentro es el
--     único que tiene lo que ellos aceptan.
--   · la cazadora, en el bosque, con resina. Es la única que entra al
--     Sotobosque y vuelve.
--
-- Si en una región no hay nadie de ese oficio, no hay mostrador. Un valle sin
-- destiladora es un valle donde no se compra nada, y eso está bien.

insert into mostradores (region_id, place_id, person_id, moneda, abre, cierra)
select distinct on (pl.region_id, pl.id)
       pl.region_id, pl.id, pe.id, m.moneda, m.abre, m.cierra
from (values
        ('aldea',  'destiladora', 'marco',  8, 20),
        ('ruina',  null,          'hueso',  9, 17),
        ('bosque', 'cazadora',    'resina', 7, 19)
     ) as m(lugar, oficio, moneda, abre, cierra)
join places pl on pl.slug = m.lugar
join people pe on pe.region_id = pl.region_id and pe.alive
                 and (m.oficio is null or pe.trade = m.oficio)
                 -- Para la ruina no hay oficio: es quien VIVA ahí.
                 and (m.oficio is not null or pe.home_place_id = pl.id)
order by pl.region_id, pl.id, pe.born_tick
on conflict (region_id, place_id) do nothing;

-- ═════════════════════════════════════════════════════════════
-- Con qué arranca cada uno
-- ═════════════════════════════════════════════════════════════
--
-- Nadie arranca rico y nadie arranca en cero. Los números son chicos a
-- propósito: con una hoja templada rondando los veinte marcos, cuarenta marcos
-- son dos hojas y no un catálogo.
--
-- El que atiende un mostrador tiene con qué comprarte lo que le lleves, que es
-- la única forma de que el jugador pueda ganar plata desde el primer día sin
-- que nada aparezca de la nada: **la plata que cobrás sale de una bolsa que ya
-- la tenía.**

insert into bolsas (region_id, holder_kind, holder_id, moneda, cantidad)
select pe.region_id, 'person', pe.id, 'marco',
       case when mo.id is not null then 60 else 12 end
from people pe
left join mostradores mo on mo.person_id = pe.id
where pe.alive
on conflict do nothing;

-- Y el que atiende con moneda de un pueblo tiene además la suya. Es lo que
-- hace posible `cambiar`: sin esto no hay de dónde salga una cuenta de hueso.
insert into bolsas (region_id, holder_kind, holder_id, moneda, cantidad)
select mo.region_id, 'person', mo.person_id, mo.moneda, 40
from mostradores mo
where mo.person_id is not null and mo.moneda <> 'marco'
on conflict do nothing;

-- Los jugadores que ya entraron llegaron por el Camino del Norte igual que los
-- que van a entrar: traen lo puesto y unas monedas de afuera.
insert into bolsas (region_id, holder_kind, holder_id, moneda, cantidad)
select p.region_id, 'player', p.id, 'marco', 15
from players p
on conflict do nothing;

-- Y los pueblos. Empiezan con lo suyo y sin un marco encima: **su plata no es
-- nuestra plata**, que es el renglón entero.
insert into bolsas (region_id, holder_kind, holder_id, moneda, cantidad)
select pu.region_id, 'people', pu.id, m.slug, 50
from peoples pu
join monedas m on m.pueblo = pu.slug
on conflict do nothing;
