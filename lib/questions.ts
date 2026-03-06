export type QuestionPack = {
  id: string
  naam: string
  emoji: string
  vragen: string[]
}

export const PACKS: QuestionPack[] = [
  {
    id: 'algemeen',
    naam: 'Algemeen',
    emoji: '🌶️',
    vragen: [
      'Ananas hoort op pizza',
      'Geld maakt gelukkig',
      'Eerste indrukken kloppen altijd',
      'Duurzaamheid heeft voorrang boven eigen comfort',
      'Een goede film heeft een happy ending nodig',
      'Sociale media heeft meer nadelen dan voordelen',
      'Ontbijt overslaan is prima',
      'Je beste vrienden ken je al meer dan 10 jaar',
      'Een goede kok kookt altijd zonder recept',
      'Stiltecoupés in de trein zijn een goed idee',
    ],
  },
  {
    id: 'werk',
    naam: 'Werk & Ambities',
    emoji: '💼',
    vragen: [
      'Thuiswerken is productiever dan kantoor',
      'Weekenden zijn heilig — geen werkmails',
      'Je mag altijd iemand vragen wat ze verdienen',
      'Een eigen bedrijf starten is voor iedereen weggelegd',
      'Overwerk moet altijd betaald worden',
      'Netwerken is de sleutel tot succes',
      'Je droombaan bestaat niet',
      'Feedback geven is altijd zinvol',
      'Een manager moet inhoudelijk beter zijn dan zijn team',
      'Carrière gaat vóór work-life balance in je twintiger jaren',
    ],
  },
  {
    id: 'relaties',
    naam: 'Relaties & Liefde',
    emoji: '❤️',
    vragen: [
      'Jaloezie is een vorm van liefde',
      'Seks op de eerste date kan prima zijn',
      'Je moet altijd eerlijk zijn, ook als het pijn doet',
      'Vriendschap na een relatie werkt nooit echt',
      'Spitten in iemands telefoon is nooit oké',
      'Leeftijdsverschil is onbelangrijk in een relatie',
      'Je ouders moeten je partner mogen keuren',
      'Een open relatie is voor niemand echt fijn',
      'Kinderloos zijn is een even geldige levenskeuze',
      'Je kunt verliefd zijn op meer dan één persoon tegelijk',
    ],
  },
  {
    id: 'controversieel',
    naam: 'Controversieel',
    emoji: '🔥',
    vragen: [
      'Rijke mensen verdienen hun geld niet',
      'Politiek en vriendschap gaan niet samen',
      'Je ouders verdienen altijd respect, ongeacht de situatie',
      'Vlees eten is moreel onjuist',
      'Gratis openbaar vervoer is een goed idee',
      'De overheid mag niet bepalen wat je eet',
      'Iedereen is op zijn minst een beetje bevooroordeeld',
      'Kunst zonder boodschap heeft geen waarde',
      'Het welzijn van dieren gaat boven menselijk gemak',
      'Anonimiteit op internet doet meer kwaad dan goed',
    ],
  },
]

export function getVraag(packId: string, index: number): string {
  const pack = PACKS.find(p => p.id === packId)
  if (!pack) return '?'
  return pack.vragen[index % pack.vragen.length] ?? '?'
}

// Mooie kleuren voor spelers (emoji + hex)
export const SPELER_KLEUREN = [
  { emoji: '🔴', hex: '#ef4444', naam: 'Rood' },
  { emoji: '🔵', hex: '#3b82f6', naam: 'Blauw' },
  { emoji: '🟢', hex: '#22c55e', naam: 'Groen' },
  { emoji: '🟡', hex: '#eab308', naam: 'Geel' },
  { emoji: '🟣', hex: '#a855f7', naam: 'Paars' },
  { emoji: '🟠', hex: '#f97316', naam: 'Oranje' },
  { emoji: '🩷', hex: '#ec4899', naam: 'Roze' },
  { emoji: '🩵', hex: '#06b6d4', naam: 'Cyan' },
]
