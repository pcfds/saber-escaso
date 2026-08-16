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

const PEOPLE = [
  { name: 'Ilde', trade: 'herrera', place: 'fragua', teaches: true,
    disposition: 'Habla poco y trabaja de espaldas a la puerta. Enseña a quien se queda tres días sin pedir nada.',
    knows: ['forja-simple', 'temple-de-rio'],
    agenda: { goal: 'rehacer el yunque partido antes de que baje el frío', needs: 'forja-simple' } },
  { name: 'Bruno', trade: 'aprendiz', place: 'fragua', teaches: false,
    disposition: 'Ansioso. Quiere el temple de río y todavía no se ganó el derecho a mirarlo.',
    knows: ['forja-simple'],
    agenda: { goal: 'que Ilde le muestre el temple de río', needs: 'temple-de-rio' } },
  { name: 'Marta', trade: 'cazadora', place: 'bosque', teaches: true,
    disposition: 'Entra al Sotobosque sola y vuelve. Le molesta que se lo pregunten.',
    knows: ['lectura-de-sendas'],
    agenda: { goal: 'encontrar el claro que vio una vez y no volvió a encontrar', needs: null } },
  { name: 'Odila', trade: 'destiladora', place: 'aldea', teaches: true,
    disposition: 'Cobra por adelantado y se acuerda de quién no le pagó. Todos le deben algo.',
    knows: ['destilado-de-raiz'],
    agenda: { goal: 'cobrarle a Bruno lo del invierno pasado', needs: null } },
  { name: 'Sarn', trade: 'guardia', place: 'aldea', teaches: false,
    disposition: 'Contratado, no leal. Cumple mientras le paguen y lo dice de frente.',
    knows: [],
    agenda: { goal: 'que alguien le pague la guardia de este mes', needs: null } },
  { name: 'La vieja Ren', trade: 'nadie sabe', place: 'ruina', teaches: false,
    disposition: 'Vive en la Casa Quemada y no explica por qué. Es la única que sabe la runa de quietud.',
    knows: ['runa-de-quietud', 'runa-de-brasa'],
    agenda: { goal: 'morirse sin haberle enseñado la runa de quietud a nadie', needs: null } },
  { name: 'Tobio', trade: 'chico del camino', place: 'camino', teaches: false,
    disposition: 'Sabe quién entró y quién salió de la región. Lo cuenta gratis, que es peor.',
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
