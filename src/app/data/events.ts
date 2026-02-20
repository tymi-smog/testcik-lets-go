export interface Event {
  id: string;
  title: string;
  category: 'Muzyka' | 'Sport' | 'Teatr' | 'Kabaret' | 'Festiwal' | 'Konferencja';
  Data: string;
  Godzina: string;
  Miejsce: string;
  Lokalizacja: string;
  image: string;
  description: string;
  ticketTypes: TicketType[];
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  available: number;
  description?: string;
}

export const events: Event[] = [
  {
    id: '1',
    title: 'SUN FESIVAL',
    category: 'Festiwal',
    Data: '2026-07-15',
    Godzina: '18:00',
    Miejsce: 'Nadmorski Park Kultury',
    Lokalizacja: 'Kolobrzeg, Polska',
    image: 'https://images.unsplash.com/photo-1760822400484-d7e9e2c6aacc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZXN0aXZhbCUyMG91dGRvb3IlMjBldmVudHxlbnwxfHx8fDE3NzEzMTA2MTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: ' SUMMER SOUND FESTIVAL 2026 Wyobraź sobie ciepły letni wieczór, zachód słońca rozświetlający scenę i tysiące ludzi śpiewających razem swoje ulubione piosenki. Summer Sound Festival to coś więcej niż zwykły koncert — to kilka niezapomnianych dni wypełnionych muzyką, emocjami i czystą energią. Na głównej scenie doświadczysz legendarnych występów oraz koncertów największych gwiazd współczesnej muzyki. Poczuj potężne brzmienie Linkin Park, nocny, miejski klimat Taco Hemingwaya, a także niesamowite show artystów takich jak Imagine Dragons, Dawid Podsiadło, Billie Eilish, PRO8L3M, Bring Me The Horizon i wielu innych. Każdy dzień festiwalu łączy rock, rap, alternatywę i elektronikę w jedno epickie przeżycie. Poza koncertami czekają na Ciebie strefa chilloutu, food trucki serwujące smaki z całego świata, silent disco pod gwiazdami oraz spektakularne pokazy świetlne, które zamienią noc w morze kolorów. To miejsce spotkań ludzi, którzy mają tę samą energię i chcą tworzyć wspomnienia na całe lato. Zbierz ekipę, spakuj najlepszy vibe i przygotuj się na weekend brzmiący jak Twoja idealna playlista. Summer Sound Festival — tu zaczyna się Twoje lato.',
    ticketTypes: [
      { id: 't1-1', name: 'Bilet podstawowy', price: 89, available: 300 },
      { id: 't1-2', name: 'Bilet + Strefa VIP', price: 199, available: 70, description: 'Zawiera wstęp na backstage i umożliwia spotkanie z artystami.' },
      { id: 't1-3', name: 'Strefa Premium Lounge', price: 349, available: 30, description: 'Prywatna strefa lounge, open bar oraz miejsca siedzące w standardzie premium.' },
    ],
  },
  {
    id: '2',
    title: 'Rock Legends Live',
    category: 'Muzyka',
    Data: '2026-05-20',
    Godzina: '20:00',
    Miejsce: 'Tauron Arena',
    Lokalizacja: 'Kraków, Polska',
    image: 'https://images.unsplash.com/photo-1656283384093-1e227e621fad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBtdXNpY3xlbnwxfHx8fDE3NzEzNDM0Njl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'SUMMER SOUND FESTIVAL 2026 – ROCK LEGENDS EDITION. Poczuj, jak ziemia drży pod sceną, światła przecinają ciepłe letnie niebo, a tysiące głosów śpiewa największe rockowe hymny wszech czasów. Summer Sound Festival powraca w głośniejszej i cięższej odsłonie — wypełnionej ryczącymi gitarami, potężnymi bębnami i niepowstrzymaną energią od pierwszej do ostatniej minuty. W tym roku line-up opiera się na prawdziwych ikonach rocka i metalu. Linkin Park, Limp Bizkit, Metallica, AC/DC, System Of A Down oraz Bon Jovi przejmą główną scenę, serwując legendarne koncerty i ponadczasowe hity, które ukształtowały całe pokolenia. Od wybuchowego nu-metalu po klasyczny stadionowy rock — każda chwila została zaprojektowana tak, by była epicka. Ale to doświadczenie wykracza daleko poza samą muzykę. Czekają na Ciebie immersyjne pokazy świetlne, ogromna festiwalowa wioska pełna food trucków z całego świata, strefy chilloutu do złapania oddechu między koncertami oraz nocne afterparty, które podkręcają adrenalinę aż do wschodu słońca. Niezależnie od tego, czy headbangasz pod sceną, czy śpiewasz z przyjaciółmi pod gwiazdami, to właśnie tutaj powstają niezapomniane wspomnienia. Zbierz ekipę, podkręć głośność i przygotuj się na weekend napędzany czystą rockową energią. Summer Sound Festival — tam, gdzie legendy spotykają kolejne pokolenia.',
    ticketTypes: [
      { id: 't2-1', name: 'Miejsce stojące', price: 75, available: 1000 },
      { id: 't2-2', name: 'Golden Cirle', price: 125, available: 500 },
    ],
  },
  {
    id: '3',
    title: 'Finał Mistrzostw Świata',
    category: 'Sport',
    Data: '2026-06-10',
    Godzina: '19:30',
    Miejsce: 'PGE Narodowy',
    Lokalizacja: 'Warszawa, Polska',
    image: 'https://images.unsplash.com/photo-1758227231013-8cff978f1dae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBzdGFkaXVtJTIwZ2FtZXxlbnwxfHx8fDE3NzEzMjk3OTd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Bądź świadkiem tworzącej się historii! Ostateczne starcie o mistrzowski tytuł.',
    ticketTypes: [
      { id: 't3-1', name: 'Górna Trybuna', price: 95, available: 7000 },
      { id: 't3-2', name: 'Środkowa Trybuna', price: 175, available: 13000 },
    ],
  },
  {
    id: '4',
    title: 'Powrót Upiora',
    category: 'Teatr',
    Data: '2026-04-25',
    Godzina: '19:00',
    Miejsce: 'Teatr w Opolu',
    Lokalizacja: 'Opole, Polska',
    image: 'https://images.unsplash.com/photo-1609039504401-47ac3940f378?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGVhdGVyJTIwcGVyZm9ybWFuY2UlMjBzdGFnZXxlbnwxfHx8fDE3NzEyNjc0NzR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Spektakularne teatralne arcydzieło powraca na Broadway. Nie przegap tego wysoko ocenianego przez krytyków przedstawienia.',
    ticketTypes: [
      { id: 't4-1', name: 'Balkon', price: 65, available: 300 },
      { id: 't4-2', name: 'Miejsce siedzące', price: 115, available: 200 },
    ],
  },
  {
    id: '5',
    title: 'Noc Kabaretowa: Gwiazdy Stand-up',
    category: 'Kabaret',
    Data: '2026-03-30',
    Godzina: '20:30',
    Miejsce: 'Klub komedii',
    Lokalizacja: 'Wrocław, Polska',
    image: 'https://images.unsplash.com/photo-1762537132884-cc6bbde0667a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFuZHVwJTIwY29tZWR5JTIwc2hvd3xlbnwxfHx8fDE3NzEzMDgzMjZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Wieczór nieprzerwanego śmiechu z najlepszymi komikami w branży. Kategoria wiekowa: 13+.',
    ticketTypes: [
      { id: 't5-1', name: 'Pojedyncze Siedzenie', price: 45, available: 150 },
      { id: 't5-2', name: 'Miejsce przy Stole', price: 75, available: 50, description: 'Reserved table for up to 4 people' },
    ],
  },
  {
    id: '6',
    title: 'Podsumowanie nowinek Technologicznych 2026',
    category: 'Konferencja',
    Data: '2026-09-12',
    Godzina: '09:00',
    Miejsce: 'Sala Konferencyjna w budynku TechNeo',
    Lokalizacja: 'Kraków, Polska',
    image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25mZXJlbmNlJTIwYnVzaW5lc3MlMjBldmVudHxlbnwxfHx8fDE3NzEzNTI2MTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Dołącz do liderów branży i innowatorów na trzy dni pełne wiedzy, networkingu i spojrzenia w przyszłość technologii.',
    ticketTypes: [
      { id: 't6-1', name: 'Bilet na jeden dzień', price: 299, available: 500 },
      { id: 't6-2', name: 'Bilet na wszystkie dni', price: 799, available: 300 },
      { id: 't6-3', name: 'Pełny dostęp VIP', price: 1499, available: 50, description: 'Ekskluzywne warsztaty, kolacje oraz sesje networkingowe.' },
    ],
  },
  {
  id: '7',
  title: 'Noc Stand-upów',
  category: 'Kabaret',
  Data: '2026-08-10',
  Godzina: '20:30',
  Miejsce: 'Klub Komediowy',
  Lokalizacja: 'Warszawa, Polska',
  image: 'https://images.unsplash.com/photo-1527224538127-2104bb71c51b',
  description:'',
  ticketTypes: [
    {id: 't7-1', name: 'Standardowy', price: 45, available: 200,},
    {id: 't7-2', name: 'VIP', price: 90, available:80},
  ],
},

{
  id: '8',
  title: 'Przyszłość technologii',
  category: 'Konferencja',
  Data: '2026-09-05',
  Godzina: '09:00',
  Miejsce: 'Expo Center',
  Lokalizacja: 'Kraków, Polska',
  image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
  description:'',
  ticketTypes: [
    {id: 't8-1', name: 'Standardowy', price: 45, available: 200,},
    {id: 't8-2', name: 'VIP', price: 90, available:80},
  ],
},

{
  id: '9',
  title: 'Król Lew',
  category: 'Teatr',
  Data: '2026-07-20',
  Godzina: '18:00',
  Miejsce: 'Wielki Theatre',
  Lokalizacja: 'Gdansk, Polska',
  image: 'https://images.unsplash.com/photo-1503095396549-807759245b35',
  description:'',
  ticketTypes: [
    {id: 't9-1', name: 'Standardowy', price: 45, available: 200,},
    {id: 't9-2', name: 'VIP', price: 90, available:80},
  ],
},

{
  id: '10',
  title: 'Festiwal Muzyki Elektronicznej',
  category: 'Muzyka',
  Data: '2026-08-25',
  Godzina: '22:00',
  Miejsce: 'Open Air Arena',
  Lokalizacja: 'Lublin, Polska',
  image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063',
  description:'',
  ticketTypes: [
    {id: 't10-1', name: 'Standardowy', price: 45, available: 200,},
    {id: 't10-2', name: 'VIP', price: 90, available:80},
  ],
},
];
