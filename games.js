// Liste aller Spiele im Menü. Neues Spiel: Ordner games/vorlage kopieren und hier einen Eintrag ergänzen.
export const GAMES = [
  {
    id: 'nova-strike', title: 'Nova Strike', icon: '🚀', colors: ['#35e0ff', '#b06bff'], bestKey: 'novaStrikeBest',
    text: 'Space-Shooter mit Gegnerwellen, Bossen und Power-ups.',
    gestures: ['Hand = Schiff', 'Kneifen = Feuer', 'Offene Hand = Schild'],
  },
  {
    id: 'neon-slice', title: 'Neon Slice', icon: '⚔️', colors: ['#7dff9b', '#35e0ff'], bestKey: 'neonSliceBest',
    text: 'Zerschneide fliegende Kristalle mit schnellen Handbewegungen – aber nicht die Bomben.',
    gestures: ['Schnelle Bewegung = Schnitt'],
  },
  {
    id: 'brick-breaker', title: 'Brick Breaker', icon: '🧱', colors: ['#ffd27a', '#ff4fa3'], bestKey: 'brickBreakerBest',
    text: 'Der Klassiker: Dein Schläger folgt der Hand, der Ball räumt die Steine ab.',
    gestures: ['Hand = Schläger', 'Kneifen = Ball starten'],
  },
  {
    id: 'sky-hopper', title: 'Sky Hopper', icon: '🐤', colors: ['#b06bff', '#ff4fa3'], bestKey: 'skyHopperBest',
    text: 'Flattere durch die Tore – jedes Kneifen ist ein Flügelschlag.',
    gestures: ['Kneifen = Flügelschlag'],
  },
];
