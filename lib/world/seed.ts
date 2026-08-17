/**
 * Genera la región inicial.
 *
 * La regla del generador: no se genera terreno, se genera historia. Cada lugar
 * sale con gente adentro, cada persona con un saber y una agenda propia. Si una
 * región saliera sin nadie que sepa nada, salió mal — y eso se puede testear.
 */
import { db, REGION_SLUG } from '../db.js'

const PLACES = [
  { slug: 'aldea', name: 'Vado Bajo', kind: 'aldea',
    description: 'Doce casas apretadas contra el recodo del río. Huele a humo y a lino mojado.' },
  { slug: 'fragua', name: 'La Fragua de Ilde', kind: 'fragua',
    description: 'El único techo de la región que nunca se apaga del todo.' },
  { slug: 'bosque', name: 'El Sotobosque', kind: 'bosque',
    description: 'Robles viejos, sendas que cambian. La gente entra de a dos o no entra.' },
  { slug: 'ruina', name: 'La Casa Quemada', kind: 'ruina',
    description: 'Se incendió antes de que nadie vivo estuviera acá. Nadie la reconstruye.' },
  { slug: 'camino', name: 'El Camino del Norte', kind: 'camino',
    description: 'Por acá llegan los que llegan. No llega mucha gente.' },
]

const KNOWLEDGE = [
  { slug: 'forja-simple', name: 'Forja simple', kind: 'oficio',
    description: 'Herrar, remachar, enderezar. La base de todo lo que se rompe.' },
  { slug: 'temple-de-rio', name: 'Temple de río', kind: 'oficio',
    description: 'Templar el filo en agua corriente. Sale bien una de cada tres veces, y esa una dura años.' },
  { slug: 'lectura-de-sendas', name: 'Lectura de sendas', kind: 'oficio',
    description: 'Saber por dónde se sale del Sotobosque cuando las sendas cambian.' },
  { slug: 'destilado-de-raiz', name: 'Destilado de raíz', kind: 'receta',
    description: 'Un frasco que sostiene una atadura de más por una noche.' },
  { slug: 'runa-de-brasa', name: 'Runa de brasa', kind: 'magia',
    description: 'Tres trazos. Prende lo que ya estaba seco. Se aprende mirando, no leyendo.' },
  { slug: 'runa-de-quietud', name: 'Runa de quietud', kind: 'magia',
    description: 'Cinco trazos. Aquieta lo que se mueve, un momento. Nadie sabe de dónde salió.' },
]

// `disposition` es el carácter en una línea, para el director. `voice` y
// `historia` son otra cosa y por eso están aparte:
//
//   voice    — cómo suena. Registro, largo de frase, muletillas y, lo que más
//              rinde, de qué NO habla nunca. Sin esto el modelo aplica un
//              acento parejo a todo el valle y salen siete porteños iguales.
//   historia — de dónde viene y qué le pasó. Es lo que sostiene la línea entre
//              una charla y la siguiente: si el NPC cambia de idea, tiene que
//              ser porque pasó algo en `events`, no porque el modelo tiró otro
//              dado esta vez.
//
// Se escriben una por una, nunca por oficio. Dos herreras del mismo valle
// tienen que sonar distinto igual.
const PEOPLE = [
  { name: 'Ilde', trade: 'herrera', place: 'fragua', teaches: true,
    disposition: 'Habla poco y trabaja de espaldas a la puerta. Enseña a quien se queda tres días sin pedir nada.',
    voice: 'Frases de tres o cuatro palabras. No saluda, no se despide, no repite lo que ya dijo. Contesta con el oficio: si algo se puede o no se puede, y cuánto tarda. Nunca habla de lo que siente ni de gente que no está presente. Cuando algo le importa se nota en que hace una pregunta corta, una sola. No usa signos de exclamación.',
    historia: 'Aprendió de su padre, que le pegaba, y se quedó con la fragua el día que él se murió. Tuvo un aprendiz antes de Bruno; se fue un invierno y no lo nombra. El yunque se le partió y lo tiene atado con fleje: todo lo que forja mientras tanto le sale peor de lo que ella sabe hacerlo, y eso la tiene de mal humor hace meses.',
    knows: ['forja-simple', 'temple-de-rio'],
    agenda: { goal: 'rehacer el yunque partido antes de que baje el frío', needs: 'forja-simple' } },
  { name: 'Bruno', trade: 'aprendiz', place: 'fragua', teaches: false,
    disposition: 'Ansioso. Quiere el temple de río y todavía no se ganó el derecho a mirarlo.',
    voice: 'Habla de más, y siempre termina pidiendo algo: que le muestren, que lo dejen probar, que le den una mano. Empieza una frase, la corta y arranca otra. Se justifica antes de que nadie lo acuse. Tapa los silencios con "igual", "o sea", "nada" — una muletilla por respuesta, no cuatro. Nunca dice que no sabe algo: dice que todavía no se lo mostraron.',
    historia: 'Llegó a la fragua a los quince porque en su casa eran seis y no entraban. Le debe a Odila un frasco del invierno pasado y hace lo imposible por no cruzarla en la aldea. Está convencido de que si ve el temple de río una sola vez le sale, y ese es exactamente su problema.',
    knows: ['forja-simple'],
    agenda: { goal: 'que Ilde le muestre el temple de río', needs: 'temple-de-rio' } },
  { name: 'Marta', trade: 'cazadora', place: 'bosque', teaches: true,
    disposition: 'Entra al Sotobosque sola y vuelve. Le molesta que se lo pregunten.',
    voice: 'Contesta lo justo y después se queda callada; el silencio lo tiene que romper el otro. Frases sin adjetivos, en pasado, sobre lo que tiene delante. Si le preguntan algo del Sotobosque, contesta otra cosa o no contesta. No pregunta nada de vuelta y nunca usa el nombre de quien le habla. No explica lo que hace ni por qué lo hace.',
    historia: 'Entró al Sotobosque con su hermano hace nueve años y volvió sola. Esa parte no la cuenta. Vio una vez un claro con luz que no venía de arriba y no lo volvió a encontrar; desde entonces entra igual, cada semana, y vuelve. Lee las sendas mejor que nadie del valle y eso la mantiene viva y sola.',
    knows: ['lectura-de-sendas'],
    agenda: { goal: 'encontrar el claro que vio una vez y no volvió a encontrar', needs: null } },
  { name: 'Odila', trade: 'destiladora', place: 'aldea', teaches: true,
    disposition: 'Cobra por adelantado y se acuerda de quién no le pagó. Todos le deben algo.',
    voice: 'Amable como una puerta que se cierra despacio. Empieza por lo cordial y termina en la cuenta. Dice "querido", "mi amor", "tesoro", y le sale más dulce cuanto peor está la deuda. Mide en cosas y no en plata: un frasco, dos jornadas, media raíz. Si le preguntan cómo hace lo que hace, cambia de tema en la misma frase.',
    historia: 'Aprendió a destilar de una mujer que pasó por el valle un verano y se fue sin dejar el nombre. Vive de que todos le deban algo chico: es más seguro que cobrar de una vez. Bruno le debe desde el invierno pasado y lo va a mencionar cada vez que pueda, sonriendo.',
    knows: ['destilado-de-raiz'],
    agenda: { goal: 'cobrarle a Bruno lo del invierno pasado', needs: null } },
  { name: 'Sarn', trade: 'guardia', place: 'aldea', teaches: false,
    disposition: 'Contratado, no leal. Cumple mientras le paguen y lo dice de frente.',
    voice: 'Frases planas, el mismo tono para una amenaza que para el clima. Declara las condiciones antes que nada: qué hace, hasta dónde, y por cuánto. No adorna, no bromea, no se ofende. Dice "no es asunto mío" y lo dice en serio. Cuando está cansado se le repiten las palabras.',
    historia: 'Vino con una compañía que se disolvió tres valles atrás y se quedó acá porque acá todavía le pagaban. No es de ningún lado y no finge que sí. Este mes no le pagaron y hace tres noches que duerme mal; lo dice como un dato, igual que diría que llovió.',
    knows: [],
    agenda: { goal: 'que alguien le pague la guardia de este mes', needs: null } },
  { name: 'La vieja Ren', trade: 'nadie sabe', place: 'ruina', teaches: false,
    disposition: 'Vive en la Casa Quemada y no explica por qué. Es la única que sabe la runa de quietud.',
    voice: 'Habla poco y torcido: contesta con otra cosa, con un refrán, o con una pregunta que no viene al caso. Casi nunca dice que sí ni que no. Mide el tiempo en inviernos, nunca en fechas. Cuando el tema se acerca a las runas, se calla o habla del frío. Trata de usted a todo el mundo, incluso a los chicos.',
    historia: 'Vivía en la Casa Quemada antes del incendio y se quedó adentro después. Le enseñó una runa a alguien, una vez, y lo que pasó después es la razón por la que no piensa volver a hacerlo. Lleva la cuenta de los inviernos que le quedan y no le sobran.',
    knows: ['runa-de-quietud', 'runa-de-brasa'],
    agenda: { goal: 'morirse sin haberle enseñado la runa de quietud a nadie', needs: null } },
  { name: 'Tobio', trade: 'chico del camino', place: 'camino', teaches: false,
    disposition: 'Sabe quién entró y quién salió de la región. Lo cuenta gratis, que es peor.',
    // Una voz no puede pedir un tipo de frase que obligue a inventar hechos:
    // la primera versión de ésta decía "arranca con ayer o el otro día" y el
    // modelo se fabricaba noticias que no estaban en la base para cumplirla.
    voice: 'Habla rápido y encima del otro: arranca una pregunta, la deja por la mitad y termina pidiendo lo que quiere, que siempre es ver algo de cerca. Dos preguntas por vez, no cinco. Se entusiasma con lo que no entiende y lo repite en voz alta. Cuando quiere algo lo pide de una, sin rodeo. Nunca inventa noticias: si no vio nada, pregunta.',
    historia: 'Tiene doce o trece, nadie llevó la cuenta, y vive en el Camino del Norte porque ahí pasa lo único que pasa. Vio a alguien trazar una runa una vez, de lejos, y no se lo pudo sacar más de la cabeza. Reparte gratis todo lo que sabe y todavía no se dio cuenta de que eso le va a costar caro.',
    knows: [],
    agenda: { goal: 'ver de cerca a alguien que sepa magia', needs: 'runa-de-brasa' } },
]

async function main() {
  const { data: existing } = await db.from('regions').select('id').eq('slug', REGION_SLUG).maybeSingle()
  if (existing) {
    console.error(`La región "${REGION_SLUG}" ya existe. Borrala antes de re-sembrar.`)
    process.exit(1)
  }

  const { data: region, error: regionError } = await db
    .from('regions')
    .insert({ slug: REGION_SLUG, name: 'El Valle Primero', tick: 0 })
    .select('id')
    .single()
  if (regionError || !region) throw regionError

  const { data: places, error: placesError } = await db
    .from('places')
    .insert(PLACES.map((p) => ({ ...p, region_id: region.id })))
    .select('id, slug')
  if (placesError || !places) throw placesError
  const placeBySlug = new Map(places.map((p) => [p.slug, p.id]))

  const { data: knowledge, error: knowledgeError } = await db
    .from('knowledge')
    .upsert(KNOWLEDGE, { onConflict: 'slug' })
    .select('id, slug')
  if (knowledgeError || !knowledge) throw knowledgeError
  const knowledgeBySlug = new Map(knowledge.map((k) => [k.slug, k.id]))

  for (const spec of PEOPLE) {
    const { data: person, error } = await db
      .from('people')
      .insert({
        region_id: region.id,
        place_id: placeBySlug.get(spec.place),
        name: spec.name,
        trade: spec.trade,
        disposition: spec.disposition,
        voice: spec.voice,
        historia: spec.historia,
        teaches: spec.teaches,
      })
      .select('id')
      .single()
    if (error || !person) throw error

    if (spec.knows.length > 0) {
      await db.from('knows').insert(
        spec.knows.map((slug) => ({
          holder_kind: 'person',
          holder_id: person.id,
          knowledge_id: knowledgeBySlug.get(slug),
          how: 'origen',
          learned_tick: 0,
        })),
      )
    }

    await db.from('agendas').insert({
      person_id: person.id,
      goal: spec.agenda.goal,
      needs_kind: spec.agenda.needs ? 'knowledge' : null,
      needs_id: spec.agenda.needs ? knowledgeBySlug.get(spec.agenda.needs) : null,
      started_tick: 0,
    })
  }

  await db.from('events').insert({
    region_id: region.id,
    tick: 0,
    kind: 'fundacion',
    summary: 'El valle existe. Doce casas, una fragua encendida y una casa que nadie reconstruye.',
  })

  // Chequeo del generador: una región sin nadie que sepa nada salió mal.
  const { count } = await db
    .from('knows')
    .select('id', { count: 'exact', head: true })
    .eq('holder_kind', 'person')
  if (!count) throw new Error('La región salió sin ningún saber. El generador está roto.')

  console.log(`Sembrado: ${PEOPLE.length} personas, ${PLACES.length} lugares, ${count} saberes repartidos.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
