/*
 * QUESTION BANK
 *
 * Direction (d):
 *   Economic axis: +1 = agreeing pushes toward the free-market RIGHT, -1 = toward the collective LEFT
 *   Social axis:   +1 = agreeing pushes toward AUTHORITARIAN,          -1 = toward LIBERTARIAN
 *
 * Anti-skew design:
 *   - Every category has the same number of statements in each direction (checked by balanceAudit() and `node test.js`).
 *   - Every statement has equal weight (1).
 *   - Statements describe concrete policies, not slogans, so someone at either extreme can
 *     disagree with a statement without it being "their side's" position in disguise.
 *   - "p" links two statements that are logical opposites, used for the consistency check.
 *   - Order is shuffled per session; answer scale is symmetric (-2..+2).
 */

const AXES = {
  econ: { name: 'Economic', neg: 'Left (collective)', pos: 'Right (free market)', negShort: 'Left', posShort: 'Right' },
  soc:  { name: 'Social',   neg: 'Libertarian',        pos: 'Authoritarian',       negShort: 'Libertarian', posShort: 'Authoritarian' },
};

const CATS = [
  { id: 'mkt', axis: 'econ', name: 'Markets & ownership' },
  { id: 'tax', axis: 'econ', name: 'Taxes & redistribution' },
  { id: 'wel', axis: 'econ', name: 'Welfare & healthcare' },
  { id: 'lab', axis: 'econ', name: 'Labor & wages' },
  { id: 'reg', axis: 'econ', name: 'Regulation & trade' },
  { id: 'prp', axis: 'econ', name: 'Property & resources' },
  { id: 'civ', axis: 'soc',  name: 'Civil liberties & privacy' },
  { id: 'law', axis: 'soc',  name: 'Law & punishment' },
  { id: 'tra', axis: 'soc',  name: 'Family & tradition' },
  { id: 'nat', axis: 'soc',  name: 'Nation & immigration' },
  { id: 'rel', axis: 'soc',  name: 'Religion & morality' },
  { id: 'spe', axis: 'soc',  name: 'Speech & state power' },
  { id: 'sex', axis: 'soc',  name: 'Sex & relationships' },
];

// Test sections, shown in this order. Questions are shuffled within a section, never across sections.
const SECTIONS = [
  { id: 's1', title: 'America and the world', blurb: 'First up: how you see the United States, its borders, and its place in the world.', cats: ['nat'] },
  { id: 's2', title: 'The economy: ownership, taxes & welfare', blurb: "On to the economy. This is about what you think should happen, not how the stock market is doing.", cats: ['mkt', 'tax', 'wel'] },
  { id: 's2b', title: 'The economy: work, regulation & property', blurb: 'More on the economy: jobs, rules for business, and who owns what.', cats: ['lab', 'reg', 'prp'] },
  { id: 's3', title: 'Family, tradition & privacy', blurb: 'Next, family values, tradition, and how much of your private life is your own business.', cats: ['tra', 'civ'] },
  { id: 's4', title: 'Law, order & free speech', blurb: 'Now crime, policing, and what people should be allowed to say.', cats: ['law', 'spe'] },
  { id: 's5', title: 'Religion', blurb: 'A short set on faith and its role in public life.', cats: ['rel'] },
  { id: 's6', title: 'Sex & relationships', blurb: 'Last section: sex, relationships, and what the law should have to say about them.', cats: ['sex'] },
];

// [category, direction, statement, pairKey?]
const RAW = [
  // ---------- ECONOMIC ----------
  // Markets & ownership
  ['mkt', -1, 'Electricity, water, and rail networks should be owned by the public rather than by private companies.', 'utility'],
  ['mkt', -1, 'Major banks should be publicly owned rather than privately owned.', 'state-biz'],
  ['mkt', -1, 'Companies above a certain size should be legally required to be owned in large part by their workers.'],
  ['mkt', -1, 'The government should set maximum prices for essentials such as basic foods, rent, and fuel.', 'price-control'],
  ['mkt', +1, 'Privatizing state-owned companies usually makes them better run.', 'utility'],
  ['mkt', +1, 'The government should not own or operate any business that a private company could operate.', 'state-biz'],
  ['mkt', +1, 'Prices for essentials like food, rent, and fuel should be set by supply and demand, with no government price controls.', 'price-control'],
  ['mkt', +1, 'Private companies should be allowed to run prisons, schools, and highways for profit.'],

  // Taxes & redistribution
  ['tax', -1, 'Income above $1 million a year should be taxed at 60% or more.', 'tax-rate'],
  ['tax', -1, 'A yearly tax on the net wealth of the very rich is justified.'],
  ['tax', -1, 'Large inheritances should be taxed heavily.', 'inherit'],
  ['tax', -1, 'Narrowing the gap between rich and poor should be one of the government\'s main goals.', 'inequality'],
  ['tax', +1, 'Everyone should pay the same percentage of their income in tax, no matter how much they earn.', 'tax-rate'],
  ['tax', +1, 'Overall taxes should be cut, even if that means fewer government services.'],
  ['tax', +1, 'Inheritance and estate taxes should be abolished.', 'inherit'],
  ['tax', +1, 'Large income differences are fair because they mostly reflect differences in talent and effort.', 'inequality'],

  // Welfare & healthcare
  ['wel', -1, 'Healthcare should be paid for entirely through taxes and free at the point of use.', 'health'],
  ['wel', -1, 'Every adult should receive a guaranteed basic income from the government.', 'ubi-work'],
  ['wel', -1, 'Public universities should be free for all students.', 'tuition'],
  ['wel', -1, 'The government should guarantee housing to everyone who cannot afford it.'],
  ['wel', +1, 'People should pay for their own healthcare through private insurance or savings, not through taxes.', 'health'],
  ['wel', +1, 'Welfare benefits should be time-limited and conditional on working or looking for work.', 'ubi-work'],
  ['wel', +1, 'Students and their families, not taxpayers, should pay the cost of university tuition.', 'tuition'],
  ['wel', +1, 'Social Security should be replaced with mandatory private retirement savings accounts.'],

  // Labor & wages
  ['lab', -1, 'The minimum wage should be set high enough to cover the living costs of a full-time worker.', 'minwage'],
  ['lab', -1, 'Strong, powerful labor unions are good for the economy overall.'],
  ['lab', -1, 'Employers should be legally required to provide paid sick leave and paid parental leave.', 'work-terms'],
  ['lab', +1, 'There should be no legal minimum wage.', 'minwage'],
  ['lab', +1, 'Employers should be free to hire and fire anyone without government restrictions.', 'work-terms'],
  ['lab', +1, 'Workers in a unionized workplace should be able to opt out of paying union dues.'],

  // Regulation & trade
  ['reg', -1, 'Banks and financial markets should be tightly regulated, even if that slows economic growth.', 'reg-vs-comp'],
  ['reg', -1, 'Gig and platform workers (e.g. delivery drivers) should be legally treated as employees.'],
  ['reg', -1, 'The government should cap the prices that pharmaceutical companies can charge.'],
  ['reg', -1, 'Strict environmental and consumer-safety rules for business are worth some cost to growth.', 'regulation'],
  ['reg', +1, 'Free trade with minimal tariffs benefits ordinary people.'],
  ['reg', +1, 'Business regulations should be cut sharply, even where this raises some risks.', 'regulation'],
  ['reg', +1, 'Licensing requirements for jobs like hairdressing and taxi driving should be removed.'],
  ['reg', +1, 'Market competition protects consumers from corporate abuse better than government regulation does.', 'reg-vs-comp'],

  // Property & resources
  ['prp', -1, 'People should not be allowed to own large numbers of rental homes.'],
  ['prp', -1, 'The government should directly invest heavily in public green energy, even at a high cost to taxpayers.', 'green'],
  ['prp', -1, 'Patent protection on medicines should be limited so that treatments can be produced cheaply.', 'patents'],
  ['prp', -1, 'Natural resources such as oil and minerals should be publicly owned.', 'resources'],
  ['prp', +1, 'The government should never take private land from an owner, even for an important public project.'],
  ['prp', +1, 'Environmental problems are better solved by market incentives and private innovation than by government mandates.', 'green'],
  ['prp', +1, 'Strong, long-lasting patents and copyrights are essential for innovation.', 'patents'],
  ['prp', +1, 'Landowners should be free to extract resources from their own land without government restriction.', 'resources'],

  // ---------- SOCIAL ----------
  // Civil liberties & privacy
  ['civ', +1, 'The government should be allowed to read private communications without a warrant when it suspects terrorism.', 'warrant'],
  ['civ', +1, 'All citizens should be required to carry a national ID card at all times.'],
  ['civ', +1, 'Terror suspects should be detainable for months without charge.'],
  ['civ', +1, 'Facial-recognition cameras should be installed in all public spaces to deter crime.', 'mass-surv'],
  ['civ', -1, 'The government should need a court warrant before accessing anyone\'s phone or online data.', 'warrant'],
  ['sex', -1, 'Sex work between consenting adults should be legal.'],
  ['civ', -1, 'Mass surveillance of the general public can never be justified.', 'mass-surv'],
  ['civ', -1, 'Terminally ill adults should have the legal right to assisted dying.'],
  ['civ', -1, 'Police should not be able to stop and search anyone without reasonable suspicion.'],

  // Law & punishment
  ['law', +1, 'The death penalty should be available for the worst murders.'],
  ['law', +1, 'Long mandatory minimum prison sentences are an effective deterrent.'],
  ['law', +1, 'Police should be given broader powers and fewer restrictions.'],
  ['law', +1, 'People convicted of three serious crimes should receive life sentences.'],
  ['law', -1, 'Prison should focus primarily on rehabilitating offenders rather than on punishing them.'],
  ['law', -1, 'Possession of small amounts of drugs for personal use should not be a criminal offense.'],
  ['law', -1, 'Police officers should be unarmed during routine duty.'],
  ['law', -1, 'The government should not be able to seize property from people who have not been convicted of a crime.'],

  // Family & tradition
  ['tra', +1, 'Respect for authority is the most important thing children should learn.'],
  ['sex', +1, 'Marriage should be legally defined as a union between one man and one woman.', 'marriage'],
  ['sex', +1, 'Abortion should be illegal in most circumstances.', 'abortion'],
  ['tra', +1, 'Schools should enforce strict discipline, including uniforms and formal punishments.'],
  ['tra', +1, 'The law should give married couples advantages that unmarried couples do not get.', 'marriage-priv'],
  ['tra', +1, 'Divorce should be made harder to obtain.'],
  ['sex', -1, 'Same-sex couples should have exactly the same legal right to marry as other couples.', 'marriage'],
  ['sex', -1, 'Abortion should be a woman\'s legal choice during early pregnancy.', 'abortion'],
  ['tra', -1, 'Adults should be able to change their legal gender through self-declaration.'],
  ['tra', -1, 'Children should be encouraged to question authority rather than obey it.'],
  ['tra', -1, 'Unmarried couples should have the same legal rights and benefits as married couples.', 'marriage-priv'],
  ['tra', -1, "Traditions should be dropped or changed when they no longer serve people's needs."],

  // Nation & immigration
  ['nat', +1, 'Immigration levels should be sharply reduced.', 'immig'],
  ['nat', +1, 'The U.S. should withdraw from international bodies whenever their rules conflict with American law.'],
  ['nat', +1, 'Immigrants should be expected to learn English and adopt American culture to be fully accepted.'],
  ['nat', +1, 'All young Americans should be required to complete a period of national service (military or civilian).'],
  ['nat', -1, 'Anyone who wants to live and work in another country should be free to do so, subject only to security checks.', 'immig'],
  ['nat', -1, 'People fleeing war or persecution should always be admitted.'],
  ['nat', -1, 'International human rights law should override U.S. law when the two conflict.'],
  ['nat', -1, 'People owe no more loyalty to their own country than to people in other countries.'],

  // Religion & morality
  ['rel', +1, 'Religious values should guide the country\'s laws.'],
  ['rel', +1, 'Public schools should include daily prayer or religious instruction.'],
  ['sex', +1, 'Adult pornography should be illegal.'],
  ['rel', +1, 'Society should legally prohibit behavior it considers immoral, even if it harms only the person doing it.', 'moral-law'],
  ['rel', -1, 'Government should be strictly neutral between religious and non-religious beliefs and should not fund religious institutions.'],
  ['rel', -1, 'The law should not enforce moral codes on private behavior between consenting adults.', 'moral-law'],
  ['rel', -1, "Federal holidays and school calendars should not be built around any one religion's calendar."],
  ['sex', -1, 'Comprehensive sex education, including contraception and sexuality, should be taught in schools.', 'sexed'],
  ['sex', +1, 'Sex education in schools should teach abstinence until marriage rather than contraception.', 'sexed'],

  // Speech & state power
  ['spe', +1, 'Hate speech against groups should be a criminal offense.', 'speech'],
  ['spe', +1, 'In a crisis, a strong leader who can bypass the legislature is better than slow democratic debate.'],
  ['spe', +1, 'The government should be able to block websites and media it considers dangerous or false.'],
  ['spe', +1, 'Burning the American flag should be illegal.'],
  ['spe', -1, 'Speech that most people find deeply offensive should be legal unless it incites imminent violence.', 'speech'],
  ['spe', -1, 'Whistleblowers who expose government secrets should be protected rather than prosecuted.'],
  ['spe', -1, 'Citizens should be able to hold disruptive public protests without prior police permission.'],
  ['spe', -1, 'Even extremist political parties should be allowed to operate legally.'],
];

// Build the final question list with ids, axes and split-half assignment
const QUESTIONS = (() => {
  const catAxis = Object.fromEntries(CATS.map(c => [c.id, c.axis]));
  const counters = {};       // per cat+dir, for split-half
  const idCounters = {};
  return RAW.map(([c, d, t, p]) => {
    idCounters[c] = (idCounters[c] || 0) + 1;
    const gk = c + d;
    counters[gk] = (counters[gk] || 0);
    const half = counters[gk] < 2 ? 'A' : 'B';
    counters[gk]++;
    return { id: `${c}-${idCounters[c]}`, n: 0, axis: catAxis[c], cat: c, d, t, p: p || null, half };
  }).map((q, i) => ({ ...q, n: i + 1, sec: SECTIONS.findIndex(sc => sc.cats.includes(q.cat)) }));
})();

/*
 * PLAIN-ENGLISH EXPLANATIONS for statements that use jargon. Shown behind "What does this mean?" in the quiz.
 * Key = text that appears in exactly one statement (node test.js checks this).
 * Keep these strictly descriptive: say what the term means, never why it is good or bad.
 */
const STATEMENT_HELP = {
  'Major banks should be publicly owned': 'Publicly owned means the government owns and runs the bank, rather than private shareholders.',
  'owned in large part by their workers': 'For example, a law requiring employees of large companies to hold a big share of the ownership, instead of only outside investors.',
  'yearly tax on the net wealth': 'A wealth tax is charged every year on the total value of what someone owns (stocks, property, businesses) minus their debts, rather than on their income.',
  'Large inheritances should be taxed heavily': 'An inheritance or estate tax is paid on money and property passed on when someone dies. The U.S. federal estate tax currently applies only to estates worth many millions of dollars.',
  'same percentage of their income in tax': 'This is called a flat tax. The U.S. currently uses a progressive income tax, where higher slices of income are taxed at higher rates.',
  'guaranteed basic income': 'Often called universal basic income (UBI): a regular cash payment to every adult, whether or not they work.',
  'Social Security should be replaced': 'Social Security pays retirement benefits funded by payroll taxes on current workers. The alternative is requiring each worker to save in their own investment account.',
  'opt out of paying union dues': 'Laws allowing this are called right-to-work laws. Without them, a unionized workplace can require the workers it bargains for to pay fees to the union.',
  'Gig and platform workers': 'Gig workers are usually classed as independent contractors, so minimum wage, overtime and benefit rules generally do not apply to them. Being classed as employees would change that.',
  'cap the prices that pharmaceutical companies': 'A price cap sets a maximum price for a drug, for example through government negotiation with drug makers.',
  'Licensing requirements for jobs': 'Occupational licensing means needing a government license, often with required training hours and fees, to work legally in a job.',
  'Free trade with minimal tariffs': 'A tariff is a tax on imported goods. Free trade means few tariffs or other barriers to buying and selling across borders.',
  'Patent protection on medicines': 'A patent gives a drug’s maker the exclusive right to sell it for a set period (about 20 years from filing), which keeps cheaper generic versions off the market until it expires.',
  'never take private land': 'Today the government can take private property for public use, such as a road, if it pays fair compensation. This is called eminent domain.',
  'Environmental problems are better solved by market': 'Market incentives include things like tradable pollution permits or rewards for cleaner technology, as opposed to rules requiring specific standards.',
  'Terror suspects should be detainable': 'Detention without charge means being held in custody without being formally accused of a crime or put on trial.',
  'mandatory minimum prison sentences': 'A mandatory minimum is a prison term set by law for certain crimes that a judge cannot go below.',
  'three serious crimes': 'Often called three-strikes laws: a third conviction for a serious crime brings an automatic very long or life sentence.',
  'seize property from people who have not been convicted': 'This practice is called civil asset forfeiture: police can seize cash or property they suspect is linked to a crime, even if the owner is never charged.',
  'change their legal gender through self-declaration': 'Self-declaration means changing the sex or gender on legal documents by personal statement, without a medical diagnosis or treatment.',
  'International human rights law should override': 'For example, an international human rights treaty or court taking priority over a U.S. law that conflicts with it.',
  'withdraw from international bodies': 'International bodies include organizations such as the United Nations, the World Health Organization and the World Trade Organization.',
  'Hate speech against groups': 'Hate speech means speech attacking people because of traits such as race, religion or sexuality. Under the First Amendment it is currently mostly legal in the U.S. unless it is a true threat or incites imminent violence.',
  'Comprehensive sex education': 'Comprehensive sex education covers contraception, consent and sexuality, as opposed to programs focused mainly on abstinence.',
  'assisted dying': 'Assisted dying lets a terminally ill adult get a doctor’s help to end their own life. It is legal in some U.S. states.',
  'Whistleblowers who expose government secrets': 'A whistleblower is an insider who reveals wrongdoing; here, someone who discloses classified or secret government information to the public.',
  'Police officers should be unarmed': 'Routine duty means everyday patrol work, with armed specialist units called in for dangerous situations, as in the U.K.',
  'strong leader who can bypass the legislature': 'Bypassing the legislature means governing by decree, without Congress passing laws.',
};

// Balance audit (also shown in the UI)
function balanceAudit() {
  const rows = [];
  let ok = true;
  for (const c of CATS) {
    const qs = QUESTIONS.filter(q => q.cat === c.id);
    const pos = qs.filter(q => q.d > 0).length;
    const neg = qs.filter(q => q.d < 0).length;
    if (pos !== neg) ok = false;
    rows.push({ cat: c, pos, neg });
  }
  for (const a of Object.keys(AXES)) {
    const qs = QUESTIONS.filter(q => q.axis === a);
    if (qs.filter(q => q.d > 0).length !== qs.filter(q => q.d < 0).length) ok = false;
  }
  return { ok, rows };
}

if (typeof module !== 'undefined') module.exports = { AXES, CATS, SECTIONS, QUESTIONS, STATEMENT_HELP, balanceAudit };
