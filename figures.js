/*
 * POLITICAL FIGURES — editable data.
 *
 * IMPORTANT: these are rough editorial estimates, NOT measurements. They are not derived from
 * this test's questions and are not taken from politicalcompass.org. Many figures changed positions
 * over their careers, and placing anyone is a judgment call. Correct anything that looks off.
 *
 * Format: ['Name', economic, social]   -- same -10..+10 scale as the results
 *   economic: -10 = far Left (collective),      +10 = far Right (free market)
 *   social:   -10 = far Libertarian,            +10 = far Authoritarian
 */
const FIGURES_RAW = [
  // Authoritarian Left
  ['Joseph Stalin', -9, 9.5],
  ['Mao Zedong', -8.5, 9.5],
  ['Vladimir Lenin', -9, 8],
  ['Fidel Castro', -8, 7.5],
  ['Kim Jong-un', -8, 9.5],
  ['Ho Chi Minh', -8, 7],
  ['Che Guevara', -8.5, 5.5],
  ['Hugo Chávez', -7, 5.5],
  ['Nicolás Maduro', -6.5, 6.5],
  ['Xi Jinping', -3, 8.5],
  ['Mikhail Gorbachev', -4, 3],
  ['Marine Le Pen', -2, 5.5],

  // Authoritarian Right
  ['Adolf Hitler', 2, 10],
  ['Benito Mussolini', 0.5, 9.5],
  ['Francisco Franco', 4, 8.5],
  ['Augusto Pinochet', 8.5, 8],
  ['Joseph McCarthy', 6.5, 8.5],
  ['J. Edgar Hoover', 5, 9],
  ['Nayib Bukele', 4, 8],
  ['Mohammed bin Salman', 4.5, 9],
  ['Vladimir Putin', 3.5, 7.5],
  ['Recep Tayyip Erdoğan', 3, 6.5],
  ['Viktor Orbán', 3, 6],
  ['Jair Bolsonaro', 5.5, 6],
  ['Charles de Gaulle', 2, 6],
  ['Narendra Modi', 2, 5.5],
  ['Giorgia Meloni', 4, 5.5],
  ['Benjamin Netanyahu', 6, 5],
  ['Donald Trump', 5.5, 4.5],
  ['George W. Bush', 6, 4.5],
  ['Richard Nixon', 4, 4.5],
  ['Winston Churchill', 3.5, 4.5],
  ['Margaret Thatcher', 8, 3.5],
  ['Ronald Reagan', 8, 3],
  ['Nigel Farage', 6.5, 2.5],
  ['Rishi Sunak', 6, 2.5],
  ['Boris Johnson', 4.5, 2.5],

  // Near the center / mainstream centrists
  ['Franklin D. Roosevelt', -4, 2.5],
  ['Joe Biden', -1, 1.5],
  ['Keir Starmer', -2.5, 1.5],
  ['Kamala Harris', -2, 1],
  ['Barack Obama', -1.5, 1],
  ['Bill Clinton', 1.5, 1],
  ['Tony Blair', 2, 2],
  ['Angela Merkel', 2.5, 0.5],
  ['Emmanuel Macron', 4, 0.5],

  // Libertarian Left
  ['Elizabeth Warren', -3.5, -0.5],
  ['Jacinda Ardern', -3.5, -1.5],
  ['Justin Trudeau', -2, -2.5],
  ['Nelson Mandela', -3, -3.5],
  ['Bernie Sanders', -5.5, -2],
  ['Alexandria Ocasio-Cortez', -5.5, -3.5],
  ['Jeremy Corbyn', -6, -3],
  ['Martin Luther King Jr.', -4.5, -5],
  ['Rosa Luxemburg', -8.5, -4.5],
  ['Mahatma Gandhi', -5, -7.5],
  ['Dalai Lama', -3, -7.5],
  ['Noam Chomsky', -7, -8.5],
  ['Emma Goldman', -9, -9.5],
  ['Peter Kropotkin', -9.5, -9.5],

  // Libertarian Right
  ['Adam Smith', 6.5, -3.5],
  ['Javier Milei', 9, -3.5],
  ['Friedrich Hayek', 8, -4.5],
  ['Rand Paul', 7.5, -5],
  ['Ayn Rand', 9.5, -6],
  ['Milton Friedman', 8.5, -6.5],
  ['Gary Johnson', 7.5, -6.5],
  ['Ron Paul', 9, -8],
  ['Murray Rothbard', 10, -9.5],

  // Online personalities, podcasters & commentators
  // (right / conservative)
  ['Nick Fuentes', 1, 8.5],
  ['Steve Bannon', 0.5, 7],
  ['Matt Walsh', 5, 6.5],
  ['Andrew Tate', 6, 6],
  ['Tucker Carlson', 2, 5.5],
  ['Candace Owens', 5, 5.5],
  ['Charlie Kirk', 6.5, 5],
  ['Ben Shapiro', 7, 4.5],
  ['Steven Crowder', 6.5, 4],
  ['Alex Jones', 4, 3],
  ['Jordan Peterson', 5, 2.5],
  ['Elon Musk', 6.5, 1.5],
  ['Dave Rubin', 6, 1],
  ['Tim Pool', 0.5, 1.5],
  // (libertarian / heterodox)
  ['Joe Rogan', 1.5, -2.5],
  ['Dave Smith', 9, -7],
  ['Glenn Greenwald', -3, -5],
  // (left / progressive)
  ['Rachel Maddow', -3, 0.5],
  ['Destiny', -2, 0],
  ['Cenk Uygur', -5, -0.5],
  ['David Pakman', -3.5, -2],
  ['Sam Seder', -5, -2],
  ['Jon Stewart', -3.5, -2.5],
  ['John Oliver', -4, -2.5],
  ['Hasan Piker', -7.5, -3.5],
  ['Kyle Kulinski', -6, -5],
  ['ContraPoints', -5.5, -5],
  ['Vaush', -8, -5],
];

/*
 * FIGURE TYPES (used by the picker's type filter). Anyone not listed here is a politician / leader.
 */
const FIGURE_KINDS = {
  thinker: [
    'Adam Smith', 'Friedrich Hayek', 'Milton Friedman', 'Ayn Rand', 'Murray Rothbard',
    'Noam Chomsky', 'Emma Goldman', 'Peter Kropotkin', 'Rosa Luxemburg',
    'Mahatma Gandhi', 'Martin Luther King Jr.', 'Dalai Lama',
  ],
  media: [
    'Nick Fuentes', 'Steve Bannon', 'Matt Walsh', 'Andrew Tate', 'Tucker Carlson', 'Candace Owens',
    'Charlie Kirk', 'Ben Shapiro', 'Steven Crowder', 'Alex Jones', 'Jordan Peterson', 'Elon Musk',
    'Dave Rubin', 'Tim Pool', 'Joe Rogan', 'Dave Smith', 'Glenn Greenwald', 'Rachel Maddow', 'Destiny',
    'Cenk Uygur', 'David Pakman', 'Sam Seder', 'Jon Stewart', 'John Oliver', 'Hasan Piker',
    'Kyle Kulinski', 'ContraPoints', 'Vaush',
  ],
};
const KIND_LABEL = { politician: 'Politicians & leaders', thinker: 'Thinkers & activists', media: 'Commentators & media' };
const kindOf = name => FIGURE_KINDS.thinker.includes(name) ? 'thinker' : FIGURE_KINDS.media.includes(name) ? 'media' : 'politician';

const FIGURES = FIGURES_RAW.map(([name, econ, soc]) => ({ name, econ, soc, kind: kindOf(name) }));
for (const n of [...FIGURE_KINDS.thinker, ...FIGURE_KINDS.media])
  if (!FIGURES_RAW.some(r => r[0] === n)) console.warn('figures.js: FIGURE_KINDS names unknown figure', n);

/*
 * MANUALLY SET STANCES (optional, override the position-based guess in the hover box).
 * Format: 'Name': [ ['text that appears in the statement', answer], ... ]
 * answer: +2 strongly agree, +1 agree, -1 disagree, -2 strongly disagree.
 * Only add stances you're confident are documented; anything not listed is inferred from the
 * figure's estimated compass position and clearly marked as inferred.
 */
const FIG_STANCES_RAW = {
  'Donald Trump': [['Free trade with minimal tariffs', -2], ['Immigration levels should be sharply reduced', 2]],
  'Bernie Sanders': [['Healthcare should be paid for entirely through taxes', 2], ['Public universities should be free', 2], ['The minimum wage should be set high enough', 2], ['Free trade with minimal tariffs', -1]],
  'Jeremy Corbyn': [['Healthcare should be paid for entirely through taxes', 2]],
  'Margaret Thatcher': [['Privatizing state-owned companies', 2]],
  'Ron Paul': [['Possession of small amounts of drugs', 2], ['Mass surveillance of the general public', 2], ['Free trade with minimal tariffs', 2], ['should withdraw from international bodies', 2]],
  'Nelson Mandela': [['The death penalty should be available', -2]],
  'Mahatma Gandhi': [['The death penalty should be available', -2]],
  'Ayn Rand': [['Abortion should be illegal in most', -2], ['Religious values should guide', -2]],
  'Joseph Stalin': [['Religious values should guide', -2]],
  'Mao Zedong': [['Religious values should guide', -2]],
};
for (const f of FIGURES) {
  f.stance = {};
  for (const [sub, v] of (FIG_STANCES_RAW[f.name] || [])) {
    const q = QUESTIONS.find(q => q.t.includes(sub));
    if (q) f.stance[q.id] = v; else console.warn('figures.js: no statement matches', JSON.stringify(sub));
  }
}

/*
 * DEFAULT CHART FIGURES: ticked on first visit (and by the "Best known" button).
 * Chosen for name recognition and spread across all four quadrants so the labels don't cluster.
 */
const DEFAULT_FIGURES = [
  'Joseph Stalin', 'Xi Jinping', 'Adolf Hitler', 'Vladimir Putin', 'Donald Trump',
  'Ronald Reagan', 'Barack Obama', 'Bernie Sanders', 'Nelson Mandela', 'Mahatma Gandhi',
  'Ayn Rand', 'Ron Paul',
];
