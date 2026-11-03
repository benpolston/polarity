/*
 * POLITICAL FIGURES — editable data.
 *
 * IMPORTANT: these are rough editorial estimates, NOT measurements. They are not derived from
 * this test's questions and are not taken from politicalcompass.org. Many figures changed positions
 * over their careers, and placing anyone is a judgment call. Correct anything that looks off.
 *
 * Calibration rule: place each figure where they would most likely land if they answered THIS test's
 * statements (unions, paid leave, surveillance, abortion, flag burning, ...), not by general reputation.
 * For leaders, judge their record in office; for commentators, their stated positions.
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
  ['Kim Jong-un', -9, 10],
  ['Ho Chi Minh', -8, 7],
  ['Che Guevara', -9, 7],
  ['Hugo Chávez', -7, 5.5],
  ['Nicolás Maduro', -6.5, 7.5],
  ['Xi Jinping', -3, 8.5],
  ['Mikhail Gorbachev', -4, 2],
  ['Marine Le Pen', -2, 5.5],

  // Authoritarian Right
  ['Adolf Hitler', 2, 10],
  ['Benito Mussolini', 0.5, 9.5],
  ['Francisco Franco', 3, 9],
  ['Augusto Pinochet', 8.5, 9],
  ['Joseph McCarthy', 6, 7.5],
  ['J. Edgar Hoover', 4, 8.5],
  ['Nayib Bukele', 3, 8],
  ['Mohammed bin Salman', 2.5, 9.5],
  ['Vladimir Putin', 2, 9],
  ['Recep Tayyip Erdoğan', 1.5, 7.5],
  ['Viktor Orbán', 1.5, 7],
  ['Jair Bolsonaro', 6, 7],
  ['Charles de Gaulle', 2, 6],
  ['Narendra Modi', 2.5, 7],
  ['Giorgia Meloni', 4, 5.5],
  ['Benjamin Netanyahu', 6, 5],
  ['Donald Trump', 4, 6.5],
  ['George W. Bush', 6, 6],
  ['Richard Nixon', 2, 6],
  ['Winston Churchill', 3.5, 4.5],
  ['Margaret Thatcher', 8, 5],
  ['Ronald Reagan', 7.5, 4.5],
  ['Nigel Farage', 5, 5],
  ['Rishi Sunak', 5, 4],
  ['Boris Johnson', 3.5, 3],

  // Near the center / mainstream centrists
  ['Franklin D. Roosevelt', -6, 4],
  ['Joe Biden', -3.5, -1],
  ['Keir Starmer', -2, 3],
  ['Kamala Harris', -4, -1.5],
  ['Barack Obama', -3, 0],
  ['Bill Clinton', 0.5, 2],
  ['Tony Blair', 1, 4],
  ['Angela Merkel', 1, 1],
  ['Emmanuel Macron', 3.5, 2.5],

  // Libertarian Left
  ['Elizabeth Warren', -5.5, -2],
  ['Jacinda Ardern', -3, 1],
  ['Justin Trudeau', -3, 0.5],
  ['Nelson Mandela', -3, -3.5],
  ['Bernie Sanders', -7, -3],
  ['Alexandria Ocasio-Cortez', -7, -4],
  ['Jeremy Corbyn', -7, -3],
  ['Martin Luther King Jr.', -6, -5],
  ['Rosa Luxemburg', -8.5, -4.5],
  ['Mahatma Gandhi', -5, -4],
  ['Dalai Lama', -4, -5],
  ['Noam Chomsky', -8, -8.5],
  ['Emma Goldman', -9, -9.5],
  ['Peter Kropotkin', -9.5, -9.5],

  // Libertarian Right
  ['Adam Smith', 6.5, -3.5],
  ['Javier Milei', 9, -2],
  ['Friedrich Hayek', 8, -4.5],
  ['Rand Paul', 7.5, -3],
  ['Ayn Rand', 9.5, -6],
  ['Milton Friedman', 8.5, -6.5],
  ['Gary Johnson', 7.5, -6.5],
  ['Ron Paul', 9, -6],
  ['Murray Rothbard', 10, -9.5],

  // More politicians & leaders
  // (US: current)
  ['JD Vance', 1.5, 7],
  ['Ron DeSantis', 6, 6.5],
  ['Marjorie Taylor Greene', 3, 7],
  ['Robert F. Kennedy Jr.', -1, 3],
  ['Hillary Clinton', -2, 1.5],
  ['Pete Buttigieg', -3, -2],
  ['Zohran Mamdani', -7.5, -3.5],
  ['Thomas Massie', 8, -3.5],
  // (US: historic)
  ['John F. Kennedy', -2, 2.5],
  ['Lyndon B. Johnson', -5, 3],
  ['Dwight D. Eisenhower', 1, 3.5],
  ['Jimmy Carter', -1.5, 0.5],
  ['George H. W. Bush', 5, 3.5],
  ['Barry Goldwater', 8, -1],
  // (world)
  ['Volodymyr Zelensky', 2, 4],
  ['Lula da Silva', -5, -1],
  ['Mark Carney', 2, 0],
  ['Ali Khamenei', -2, 10],
  ['Pol Pot', -10, 10],
  ['Saddam Hussein', -4, 9.5],
  ['Muammar Gaddafi', -6, 9],

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
  ['Elon Musk', 6.5, 2.5],
  ['Dave Rubin', 6, 1],
  ['Tim Pool', 0.5, 1.5],
  // (libertarian / heterodox)
  ['Joe Rogan', 1.5, -2.5],
  ['Dave Smith', 9, -7],
  ['Glenn Greenwald', -3, -5],
  // (left / progressive)
  ['Rachel Maddow', -4, -1],
  ['Destiny', -2, 0],
  ['Cenk Uygur', -5, -0.5],
  ['David Pakman', -3.5, -2],
  ['Sam Seder', -5, -2],
  ['Jon Stewart', -3.5, -2.5],
  ['John Oliver', -4, -2.5],
  ['Hasan Piker', -8, -3],
  ['Kyle Kulinski', -6, -5],
  ['ContraPoints', -5.5, -5],
  ['Vaush', -8, -5],
  // (more commentators)
  ['Sean Hannity', 6.5, 5],
  ['Megyn Kelly', 5, 3.5],
  ['Glenn Beck', 7, 3],
  ['Saagar Enjeti', 1, 4],
  ['Lex Fridman', 2, -2],
  ['Bill Maher', -2.5, -3],
  ['Krystal Ball', -5, -2],
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
    'Sean Hannity', 'Megyn Kelly', 'Glenn Beck', 'Saagar Enjeti', 'Lex Fridman', 'Bill Maher', 'Krystal Ball',
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
 * DEFAULT CHART FIGURES: shown until the visitor changes the selection in the picker.
 * Chosen for name recognition and spread across all four quadrants so the labels don't cluster.
 * Rule: no default's label may be displaced by another default (check after moving any figure).
 */
const DEFAULT_FIGURES = [
  'Joseph Stalin', 'Xi Jinping', 'Adolf Hitler', 'Vladimir Putin', 'Donald Trump',
  'Ronald Reagan', 'Barack Obama', 'Bernie Sanders', 'Mahatma Gandhi',
  'Ayn Rand',
];
