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
  ['Karl Marx', -10, -1],
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
  ['Thomas Jefferson', 6, -5],
  ['John McAfee', 8, -8],
  ['Ross Ulbricht', 9, -8.5],

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
    'Karl Marx', 'Noam Chomsky', 'Emma Goldman', 'Peter Kropotkin', 'Rosa Luxemburg',
    'Mahatma Gandhi', 'Martin Luther King Jr.', 'Dalai Lama', 'Ross Ulbricht',
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
  // ---- defaults ----
  'Donald Trump': [['Free trade with minimal tariffs', -2], ['Immigration levels should be sharply reduced', 2], ['Overall taxes should be cut', 2], ['Business regulations should be cut sharply', 2], ['Burning the American flag', 2], ['The death penalty should be available', 2], ['Social Security should be replaced', -2]],
  'Barack Obama': [['Same-sex couples should have exactly', 2], ['paid sick leave and paid parental leave', 2], ['Healthcare should be paid for entirely through taxes', -1], ['Free trade with minimal tariffs', 1], ['Whistleblowers who expose', -1], ['The minimum wage should be set high enough', 1]],
  'Adolf Hitler': [['labor unions are good for the economy', -2], ['Same-sex couples should have exactly', -2], ['Even extremist political parties', -2], ['block websites and media', 2], ['strong leader who can bypass', 2]],
  'Joseph Stalin': [['Religious values should guide', -2], ['Major banks should be publicly owned', 2], ['Privatizing state-owned companies', -2], ['Natural resources such as oil', 2], ['strong leader who can bypass', 2], ['Even extremist political parties', -2], ['Same-sex couples should have exactly', -2], ['Abortion should be illegal in most', 2]],
  'Joe Biden': [['labor unions are good for the economy', 2], ['paid sick leave and paid parental leave', 2], ['cap the prices that pharmaceutical companies', 2], ['invest heavily in public green energy', 2], ['Healthcare should be paid for entirely through taxes', -1], ['The death penalty should be available', -2]],
  'Bernie Sanders': [['Healthcare should be paid for entirely through taxes', 2], ['Public universities should be free', 2], ['The minimum wage should be set high enough', 2], ['Free trade with minimal tariffs', -1], ['yearly tax on the net wealth', 2], ['labor unions are good for the economy', 2], ['small amounts of drugs', 2]],
  'Ronald Reagan': [['Overall taxes should be cut', 2], ['Business regulations should be cut sharply', 2], ['labor unions are good for the economy', -1], ['small amounts of drugs', -2], ['The death penalty should be available', 2]],
  'Martin Luther King Jr.': [['guaranteed basic income', 2], ['labor unions are good for the economy', 2], ['disruptive public protests', 2]],
  'Karl Marx': [['Major banks should be publicly owned', 2], ['Large inheritances should be taxed heavily', 2], ['Income above $1 million', 2], ['Public universities should be free', 2], ['Natural resources such as oil', 2]],
  'Vladimir Putin': [['Same-sex couples should have exactly', -2], ['block websites and media', 2], ['strong leader who can bypass', 2], ['disruptive public protests', -2], ['change their legal gender through self-declaration', -2]],
  'Mahatma Gandhi': [['The death penalty should be available', -2], ['Comprehensive sex education', -2], ['Free trade with minimal tariffs', -2]],
  'Elon Musk': [['Business regulations should be cut sharply', 2], ['deeply offensive should be legal', 2], ['labor unions are good for the economy', -2], ['guaranteed basic income', 1]],
  'Joe Rogan': [['small amounts of drugs', 2], ['Same-sex couples should have exactly', 2], ['deeply offensive should be legal', 2], ['guaranteed basic income', 1]],
  'Hillary Clinton': [['Same-sex couples should have exactly', 2], ['Abortion should be a woman', 2], ['paid sick leave and paid parental leave', 2], ['Healthcare should be paid for entirely through taxes', -1], ['The minimum wage should be set high enough', 1]],
  'John F. Kennedy': [['labor unions are good for the economy', 1], ['Overall taxes should be cut', 1], ['Free trade with minimal tariffs', 2], ['The minimum wage should be set high enough', 1]],
  'Ayn Rand': [['Abortion should be illegal in most', -2], ['Religious values should guide', -2], ['Overall taxes should be cut', 2], ['Privatizing state-owned companies', 2], ['Business regulations should be cut sharply', 2]],
  'Franklin D. Roosevelt': [['labor unions are good for the economy', 2], ['Social Security should be replaced', -2], ['Income above $1 million', 2], ['Banks and financial markets should be tightly regulated', 2], ['The minimum wage should be set high enough', 2]],
  'Thomas Jefferson': [['Religious values should guide', -2], ['strictly neutral between religious', 2]],
  'Fidel Castro': [['Healthcare should be paid for entirely through taxes', 2], ['Public universities should be free', 2], ['Privatizing state-owned companies', -2], ['Even extremist political parties', -2], ['Natural resources such as oil', 2]],
  'Xi Jinping': [['block websites and media', 2], ['Mass surveillance of the general public', -2], ['Facial-recognition cameras', 2], ['Even extremist political parties', -2], ['Natural resources such as oil', 2], ['Religious values should guide', -2]],
  'Tucker Carlson': [['Immigration levels should be sharply reduced', 2], ['Free trade with minimal tariffs', -2], ['Whistleblowers who expose', 2]],
  'Elizabeth Warren': [['yearly tax on the net wealth', 2], ['Banks and financial markets should be tightly regulated', 2], ['labor unions are good for the economy', 2], ['Healthcare should be paid for entirely through taxes', 1]],
  'Noam Chomsky': [['labor unions are good for the economy', 2], ['owned in large part by their workers', 2], ['deeply offensive should be legal', 2], ['Whistleblowers who expose', 2]],
  'Rand Paul': [['need a court warrant before accessing', 2], ['Mass surveillance of the general public', 2], ['Abortion should be illegal in most', 2], ['Overall taxes should be cut', 2]],
  'Saddam Hussein': [['Natural resources such as oil', 2], ['Even extremist political parties', -2], ['strong leader who can bypass', 2], ['The death penalty should be available', 2]],
  'Hugo Chávez': [['Natural resources such as oil', 2], ['Privatizing state-owned companies', -2], ['set maximum prices for essentials', 2], ['block websites and media', 2]],
  'Dwight D. Eisenhower': [['Social Security should be replaced', -2], ['Income above $1 million', 1], ['Free trade with minimal tariffs', 1]],
  'Bill Maher': [['small amounts of drugs', 2], ['Religious values should guide', -2], ['deeply offensive should be legal', 2], ['Same-sex couples should have exactly', 2]],
  'Joseph McCarthy': [['Even extremist political parties', -2]],
  'Augusto Pinochet': [['Privatizing state-owned companies', 2], ['Social Security should be replaced', 2], ['Even extremist political parties', -2], ['strong leader who can bypass', 2], ['labor unions are good for the economy', -2]],
  'John McAfee': [['Overall taxes should be cut', 2], ['small amounts of drugs', 2], ['Mass surveillance of the general public', 2]],
  'Barry Goldwater': [['Overall taxes should be cut', 2], ['opt out of paying union dues', 2], ['Religious values should guide', -2], ['Abortion should be a woman', 1]],
  // ---- others ----
  'Jeremy Corbyn': [['Healthcare should be paid for entirely through taxes', 2]],
  'Margaret Thatcher': [['Privatizing state-owned companies', 2]],
  'Ron Paul': [['small amounts of drugs', 2], ['Mass surveillance of the general public', 2], ['Free trade with minimal tariffs', 2], ['should withdraw from international bodies', 2]],
  'Nelson Mandela': [['The death penalty should be available', -2]],
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
  // In PRIORITY order (most recognizable first). Desktop shows all of them. Narrow screens, where labels
  // must be drawn larger to stay readable, show as many as fit from the top of this list without any
  // label moving. tests.html checks both.
  'Donald Trump', 'Barack Obama', 'Adolf Hitler', 'Joseph Stalin', 'Joe Biden', 'Bernie Sanders',
  'Ronald Reagan', 'Martin Luther King Jr.', 'Karl Marx', 'Vladimir Putin', 'Mahatma Gandhi', 'Elon Musk',
  'Joe Rogan', 'Hillary Clinton', 'John F. Kennedy', 'Ayn Rand', 'Franklin D. Roosevelt', 'Thomas Jefferson',
  'Fidel Castro', 'Xi Jinping', 'Tucker Carlson', 'Elizabeth Warren', 'Noam Chomsky', 'Rand Paul',
  'Saddam Hussein', 'Hugo Chávez', 'Dwight D. Eisenhower', 'Bill Maher', 'Joseph McCarthy',
  'Augusto Pinochet', 'John McAfee', 'Barry Goldwater',
];


/*
 * WHY EACH FIGURE IS PLACED WHERE THEY ARE: one line, shown in the hover box.
 * node test.js checks that every figure has one.
 */
const FIGURE_WHY = {
  // Authoritarian Left
  "Joseph Stalin": "Abolished private enterprise and collectivized farming; one-party state with mass purges and censorship.",
  "Mao Zedong": "Collectivized the economy; one-party rule, the Cultural Revolution and mass persecution.",
  "Vladimir Lenin": "Led the revolution to state ownership (with a brief market period, the NEP); one-party rule.",
  "Fidel Castro": "Nationalized industry; free state healthcare and education; one-party state without a free press.",
  "Kim Jong-un": "Almost entirely state-run economy; hereditary one-party dictatorship with near-total control of information.",
  "Ho Chi Minh": "Communist revolutionary leader; collectivization and one-party rule in North Vietnam.",
  "Che Guevara": "Marxist revolutionary; nationalization and central planning; oversaw revolutionary tribunals and executions.",
  "Hugo Chávez": "Nationalized oil and other industries, imposed price controls; weakened courts and closed a critical TV network.",
  "Nicolás Maduro": "Kept state control and price controls; jailed opponents and held disputed elections.",
  "Xi Jinping": "State-directed economy that still allows private business; heavy censorship and mass surveillance; ended term limits.",
  "Mikhail Gorbachev": "Reformed the Soviet command economy; opened up speech and press (glasnost) within a one-party state.",
  "Marine Le Pen": "Protectionist, pro-welfare economics; hardline on immigration and national identity.",
  "Pol Pot": "Abolished money, markets and private property; mass killings under the Khmer Rouge.",
  "Saddam Hussein": "Nationalized oil and much of industry; one-party dictatorship with brutal repression.",
  "Muammar Gaddafi": "State-controlled economy under his own socialist ideology; absolute personal rule.",
  "Ali Khamenei": "Supreme Leader of a theocracy; state and religious foundations dominate the economy.",
  "Franklin D. Roosevelt": "New Deal: Social Security, union rights, minimum wage, very high top tax rates; Japanese-American internment.",
  "Lyndon B. Johnson": "Great Society: Medicare, Medicaid, anti-poverty programs and the Civil Rights Act; escalated the Vietnam War.",
  "John F. Kennedy": "Tax cuts and pro-union policies; Cold War national-security focus.",
  "Hillary Clinton": "Center-left economics; socially liberal but hawkish on national security.",
  "Robert F. Kennedy Jr.": "Critical of corporations and regulators alike, with mixed social views; hard to place on either axis.",
  "Keir Starmer": "Center-left but fiscally cautious; tough on immigration and protest groups, strict online-safety rules.",
  "Jimmy Carter": "Moderate: deregulated airlines and trucking; devout evangelical but socially moderate.",
  "Jacinda Ardern": "Center-left economics; strict gun laws, strict COVID lockdowns and online-content rules.",
  "Justin Trudeau": "Center-left economics and carbon pricing; legalized cannabis but used emergency powers against protests.",
  "Barack Obama": "Affordable Care Act and financial regulation; backed same-sex marriage; expanded drone strikes and surveillance.",
  "Destiny": "Liberal streamer; center-left, pro-institution positions.",
  // Authoritarian Right
  "Adolf Hitler": "Kept private ownership under heavy state direction and abolished unions; totalitarian dictatorship and genocide.",
  "Benito Mussolini": "Corporatist economy blending private business and state control; founded fascist one-party rule.",
  "Francisco Franco": "State-led economy, liberalized later; Catholic traditionalist dictatorship with censorship and repression.",
  "Augusto Pinochet": "Free-market reforms and privatized pensions; military dictatorship that dissolved Congress and disappeared opponents.",
  "Joseph McCarthy": "Pro-business Republican senator; led anti-communist investigations targeting people for their speech and associations.",
  "J. Edgar Hoover": "FBI director for 48 years; surveillance and disruption of activists (COINTELPRO); economically conservative.",
  "Nayib Bukele": "Business-friendly policies and Bitcoin adoption; mass detention under a state of emergency, weakened courts.",
  "Mohammed bin Salman": "Market reforms inside a state-dominated oil economy; absolute monarchy with no elections.",
  "Vladimir Putin": "Economy with powerful state energy firms; restricted media, protest and opposition; anti-LGBT laws.",
  "Recep Tayyip Erdoğan": "State-directed, unorthodox economics; jailed journalists and opponents after 2016; Islamist social policy.",
  "Viktor Orbán": "Flat income tax alongside state intervention; control over media and courts; Christian-nationalist social policy.",
  "Jair Bolsonaro": "Market-liberal economic team; socially conservative and praised Brazil's former military dictatorship.",
  "Charles de Gaulle": "State-guided planning with private enterprise; a strong presidency and national sovereignty.",
  "Narendra Modi": "Pro-business reforms plus welfare programs; Hindu nationalism, internet shutdowns and pressure on the press.",
  "Giorgia Meloni": "Moderately pro-market; conservative on immigration, family and national identity.",
  "Benjamin Netanyahu": "Market-liberal economic reforms; security-focused nationalist who sought to curb judicial power.",
  "Donald Trump": "Tax cuts and deregulation but high tariffs; hardline immigration policy and expanded executive power.",
  "George W. Bush": "Tax cuts and an attempt to privatize Social Security; Patriot Act, warrantless wiretapping, Guantánamo.",
  "Richard Nixon": "Imposed wage and price controls and created the EPA; war on drugs, wiretapping and Watergate.",
  "Winston Churchill": "Broadly pro-market Conservative; wartime leader, imperialist, socially traditional.",
  "Margaret Thatcher": "Privatization, tax cuts and curbing unions; strong policing and socially conservative laws.",
  "Ronald Reagan": "Large tax cuts and deregulation; war on drugs and socially conservative positions.",
  "Nigel Farage": "Low-tax and pro-business; central figure for Brexit and sharply reduced immigration.",
  "Rishi Sunak": "Fiscally conservative; tougher immigration policy and some public-health restrictions.",
  "Boris Johnson": "Moderate on economics with high public spending; Brexit and national sovereignty.",
  "Bill Clinton": "Welfare reform, NAFTA and deregulation; tough-on-crime laws and the Defense of Marriage Act.",
  "Tony Blair": "Market-friendly Third Way Labour; CCTV expansion, ID-card plans and anti-terror detention.",
  "Angela Merkel": "Center-right social market economy; welcomed refugees in 2015.",
  "Emmanuel Macron": "Pro-business and pension reforms; firm policing of protests and strict secularism.",
  "Dwight D. Eisenhower": "Kept very high top tax rates and expanded Social Security; built the interstates; Cold War security state.",
  "George H. W. Bush": "Pro-market though he raised taxes; tough on crime and socially conservative.",
  "JD Vance": "Economic populist (tariffs, pro-worker rhetoric); socially conservative and hardline on immigration.",
  "Ron DeSantis": "Pro-business and low-tax; culture-war laws on education and immigration.",
  "Marjorie Taylor Greene": "Populist right; strongly socially conservative and nationalist.",
  "Volodymyr Zelensky": "Market reforms; under wartime martial law, banned some parties and merged TV news.",
  "Mark Carney": "Former central banker; centrist and market-friendly with climate policy.",
  "Nick Fuentes": "Christian nationalist, anti-immigration and anti-democratic; mixed, populist economic views.",
  "Steve Bannon": "Economic nationalist (tariffs, anti-globalization); hardline nationalist on immigration.",
  "Matt Walsh": "Socially conservative commentator; traditional views on gender, family and religion.",
  "Andrew Tate": "Promotes wealth and hustle culture; strongly traditional, male-dominant social views.",
  "Tucker Carlson": "Populist critic of free trade and big business; hardline on immigration; has defended some whistleblowers.",
  "Candace Owens": "Conservative commentator; socially traditional and nationalist.",
  "Charlie Kirk": "Free-market conservative activist; socially conservative with Christian-nationalist themes.",
  "Ben Shapiro": "Free-market conservative; socially conservative and religious.",
  "Steven Crowder": "Free-market conservative comedian; socially conservative.",
  "Alex Jones": "Anti-government conspiracy broadcaster; socially conservative and nationalist.",
  "Jordan Peterson": "Free-market leaning; emphasizes traditional roles and order, opposes compelled speech.",
  "Elon Musk": "Strongly pro-business and anti-regulation; calls himself a free-speech absolutist; hardline on illegal immigration.",
  "Dave Rubin": "Classical liberal turned conservative; free-market.",
  "Tim Pool": "Self-described moderate with populist economics; increasingly socially conservative.",
  "Sean Hannity": "Free-market conservative host; hawkish and socially conservative.",
  "Megyn Kelly": "Conservative-leaning host; pro-market with mixed social views.",
  "Glenn Beck": "Conservative host with libertarian leanings; religious, small government.",
  "Saagar Enjeti": "Right populist: skeptical of free trade and big tech, restrictionist on immigration.",
  // Libertarian Left
  "Joe Biden": "Pro-union, drug-price negotiation and large green investment; generally socially liberal.",
  "Kamala Harris": "Higher taxes on the rich, paid leave and abortion rights; a former prosecutor.",
  "Elizabeth Warren": "Wealth tax, financial regulation and consumer protection; socially liberal.",
  "Nelson Mandela": "Social-democratic economics in practice; reconciliation, constitutional rights, abolished the death penalty.",
  "Bernie Sanders": "Democratic socialist: Medicare for All, free college, a wealth tax and stronger unions.",
  "Alexandria Ocasio-Cortez": "Democratic socialist: Green New Deal and Medicare for All; socially progressive.",
  "Jeremy Corbyn": "Socialist: public ownership of rail and utilities, higher taxes; anti-war and civil-libertarian.",
  "Martin Luther King Jr.": "Called for a guaranteed income and economic justice; nonviolent civil disobedience for civil rights.",
  "Rosa Luxemburg": "Revolutionary Marxist who criticized Lenin's dictatorship and defended free expression.",
  "Karl Marx": "Called for abolishing private ownership of production; his views on the state are debated, so he sits near the middle socially.",
  "Mahatma Gandhi": "Village self-reliance and simple living; nonviolent resistance to state power, but religious and socially traditional.",
  "Dalai Lama": "Has called himself a Marxist on economics; advocates nonviolence and compassion; a religious leader.",
  "Noam Chomsky": "Anarcho-syndicalist: worker control of industry and deep skepticism of state and corporate power.",
  "Emma Goldman": "Anarchist: abolish capitalism and the state; championed free speech and birth control.",
  "Peter Kropotkin": "Anarcho-communist: common ownership through voluntary cooperation, with no state.",
  "Pete Buttigieg": "Center-left on economics; socially liberal.",
  "Zohran Mamdani": "Democratic socialist: rent freezes, city-owned grocery stores and higher taxes on the rich.",
  "Lula da Silva": "Social programs and state-led development; democratic and moderate socially.",
  "Glenn Greenwald": "Civil-liberties journalist (the Snowden files); critical of surveillance and state power; left-leaning economics.",
  "Rachel Maddow": "Progressive news host; center-left economics, socially liberal.",
  "Cenk Uygur": "Progressive populist: Medicare for All, against corporate money in politics.",
  "David Pakman": "Progressive commentator; center-left economics, socially liberal.",
  "Sam Seder": "Progressive host; social-democratic economics.",
  "Jon Stewart": "Satirist; center-left, critical of both corporations and government overreach.",
  "John Oliver": "Satirist; progressive, pro-regulation and socially liberal.",
  "Hasan Piker": "Socialist streamer; strongly left on economics, socially progressive.",
  "Kyle Kulinski": "Left-populist social libertarian: Medicare for All, anti-war, strong on civil liberties.",
  "ContraPoints": "Leftist video essayist; socialist-leaning and socially progressive.",
  "Vaush": "Libertarian-socialist streamer; favors worker ownership, socially progressive.",
  "Bill Maher": "Liberal comedian; pro-legalization, anti-religion, critical of restrictive speech norms.",
  "Krystal Ball": "Left populist: pro-labor and anti-corporate.",
  // Libertarian Right
  "Adam Smith": "Founder of classical economics: free markets with limited government, though he backed some public works.",
  "Javier Milei": "Radical free-market libertarian; opposes abortion, which pulls him toward the center socially.",
  "Friedrich Hayek": "Free-market economist who warned against central planning; supported a basic safety net.",
  "Rand Paul": "Low taxes, limited government, privacy and anti-surveillance; opposes abortion.",
  "Ayn Rand": "Laissez-faire capitalism and individualism; atheist and pro-choice.",
  "Milton Friedman": "Free-market economist; backed drug legalization and school choice, opposed the draft.",
  "Gary Johnson": "Libertarian presidential nominee: low taxes, legal cannabis, socially liberal.",
  "Ron Paul": "Libertarian: end the Fed, low taxes, non-interventionism; opposes abortion and favors tighter immigration.",
  "Murray Rothbard": "Anarcho-capitalist: would replace the state entirely with private markets.",
  "Thomas Jefferson": "Limited federal government and religious freedom; a slaveholder, which complicates his libertarian image.",
  "John McAfee": "Anti-tax, anti-surveillance libertarian; sought the Libertarian Party's presidential nomination.",
  "Ross Ulbricht": "Built an anonymous online marketplace to operate outside government control; a libertarian cause, pardoned in 2025.",
  "Thomas Massie": "Libertarian-leaning Republican: limited spending and anti-surveillance; opposes abortion.",
  "Barry Goldwater": "Small-government conservative; later backed abortion rights and gays in the military, and opposed the religious right.",
  "Joe Rogan": "Socially liberal on drugs and speech and skeptical of government; mixed economic views.",
  "Dave Smith": "Libertarian comedian and podcaster: anti-war, anti-state, free markets.",
  "Lex Fridman": "Podcaster; broadly centrist with libertarian leanings on speech and technology.",
};
