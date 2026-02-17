/*
 * ══════════════════════════════════════════════════════════════════════
 * R221: ADVANCED ECONOMY & FINANCIAL SYSTEM
 * ══════════════════════════════════════════════════════════════════════
 *
 * Five financial instruments available to players:
 *
 * 1. LOANS — Borrow against future BO. Pay 25% interest/season.
 *    Risk: if you can't repay, forced liquidation at penalty.
 *    Available when budget < script cost (desperation loans).
 *
 * 2. INVESTMENTS — Spend money now for passive income over seasons.
 *    Long-game play: break even after 3-4 seasons, profit after.
 *    Available during greenlight phase.
 *
 * 3. MERCHANDISE — % of BO for HIT+ films, scales with franchise.
 *    Auto-calculated post-release. Franchise films earn more merch.
 *
 * 4. STREAMING DEALS — Guaranteed flat income, but caps BO multiplier.
 *    Offered randomly between seasons. Safe but limits upside.
 *
 * 5. INSURANCE — Pay premium to reduce flop damage.
 *    Reduces earnings loss on FLOP from 40% to 15%.
 *
 * Balance philosophy:
 * - Loans are dangerous but sometimes the only way to survive
 * - Investments reward patient play but tie up scarce early capital
 * - Merch is passive reward for making good films
 * - Streaming deals are the "safe" option for risk-averse players
 * - Insurance is expensive peace of mind
 * ══════════════════════════════════════════════════════════════════════
 */

import type { RewardTier, Genre } from './types';

// ─── LOANS ───

export interface Loan {
  id: string;
  amount: number;        // principal borrowed
  interestRate: number;  // per-season (0.25 = 25%)
  remainingBalance: number; // what's still owed (principal + accrued interest)
  seasonTaken: number;   // when the loan was taken
  seasonsDue: number;    // must repay within this many seasons
  seasonsRemaining: number;
}

export function generateLoanOffers(budget: number, season: number): Loan[] {
  // Offer 2-3 loan options scaling with season
  const base = Math.max(8, 5 + season * 3);
  const offers: Loan[] = [
    {
      id: `loan_small_${season}`,
      amount: base,
      interestRate: 0.20,
      remainingBalance: base,
      seasonTaken: season,
      seasonsDue: 3,
      seasonsRemaining: 3,
    },
    {
      id: `loan_med_${season}`,
      amount: Math.round(base * 1.6),
      interestRate: 0.25,
      remainingBalance: Math.round(base * 1.6),
      seasonTaken: season,
      seasonsDue: 2,
      seasonsRemaining: 2,
    },
  ];
  // Season 3+ unlocks a big risky loan
  if (season >= 3) {
    offers.push({
      id: `loan_big_${season}`,
      amount: Math.round(base * 2.5),
      interestRate: 0.30,
      remainingBalance: Math.round(base * 2.5),
      seasonTaken: season,
      seasonsDue: 2,
      seasonsRemaining: 2,
    });
  }
  return offers;
}

/** Accrue interest on all active loans. Called at start of each season. */
export function accrueInterest(loans: Loan[]): Loan[] {
  return loans.map(loan => {
    const interest = Math.round(loan.remainingBalance * loan.interestRate * 10) / 10;
    return {
      ...loan,
      remainingBalance: Math.round((loan.remainingBalance + interest) * 10) / 10,
      seasonsRemaining: loan.seasonsRemaining - 1,
    };
  });
}

/** Check for defaulted loans (seasonsRemaining <= 0 and balance > 0). Returns penalty amount. */
export function checkDefaults(loans: Loan[]): { defaultedLoans: Loan[]; penalty: number; survivingLoans: Loan[] } {
  const defaulted = loans.filter(l => l.seasonsRemaining <= 0 && l.remainingBalance > 0);
  const surviving = loans.filter(l => l.seasonsRemaining > 0 || l.remainingBalance <= 0);
  // Penalty: 150% of remaining balance (forced liquidation)
  const penalty = defaulted.reduce((sum, l) => sum + Math.round(l.remainingBalance * 1.5 * 10) / 10, 0);
  return { defaultedLoans: defaulted, penalty, survivingLoans: surviving };
}

/** Repay a loan (partial or full). Returns updated loan or null if fully paid. */
export function repayLoan(loan: Loan, amount: number): Loan | null {
  const newBalance = Math.round((loan.remainingBalance - amount) * 10) / 10;
  if (newBalance <= 0) return null;
  return { ...loan, remainingBalance: newBalance };
}

// ─── INVESTMENTS ───

export interface Investment {
  id: string;
  name: string;
  description: string;
  cost: number;          // upfront cost
  incomePerSeason: number; // passive income each season
  seasonsRemaining: number; // how many more seasons it pays out
  totalSeasons: number;  // original duration
}

const INVESTMENT_TEMPLATES = [
  { name: 'Streaming Platform Stake', desc: 'Minority stake in a rising streamer.', costMult: 1.0, income: 0.35, seasons: 4 },
  { name: 'Theme Park License', desc: 'License your IP for theme park rides.', costMult: 1.4, income: 0.45, seasons: 4 },
  { name: 'Film School Endowment', desc: 'Fund a film school. Talent pipeline pays dividends.', costMult: 0.7, income: 0.25, seasons: 5 },
  { name: 'VFX Studio Acquisition', desc: 'Own the tech. Reduce costs, earn from other studios.', costMult: 1.8, income: 0.55, seasons: 3 },
  { name: 'International Distribution', desc: 'Expand into foreign markets.', costMult: 1.2, income: 0.40, seasons: 4 },
];

export function generateInvestmentOffers(season: number): Investment[] {
  // Offer 2 investments, scaling cost with season
  const baseCost = 6 + season * 2;
  const shuffled = [...INVESTMENT_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2).map((t, i) => ({
    id: `invest_${season}_${i}`,
    name: t.name,
    description: t.desc,
    cost: Math.round(baseCost * t.costMult),
    incomePerSeason: Math.round(baseCost * t.income * 10) / 10,
    seasonsRemaining: t.seasons,
    totalSeasons: t.seasons,
  }));
}

/** Collect income from all active investments. Returns total income and updated investments. */
export function collectInvestmentIncome(investments: Investment[]): { income: number; updated: Investment[] } {
  let income = 0;
  const updated: Investment[] = [];
  for (const inv of investments) {
    if (inv.seasonsRemaining > 0) {
      income += inv.incomePerSeason;
      const next = { ...inv, seasonsRemaining: inv.seasonsRemaining - 1 };
      if (next.seasonsRemaining > 0) updated.push(next);
    }
  }
  return { income: Math.round(income * 10) / 10, updated };
}

// ─── MERCHANDISE ───

export interface MerchStream {
  filmTitle: string;
  genre: Genre;
  tier: RewardTier;
  franchiseLength: number; // 1 = standalone, 2+ = sequel
  incomePerSeason: number;
  seasonsRemaining: number;
}

/** Calculate merch income for a just-released film. Only HIT+ films generate merch. */
export function calculateMerchRevenue(
  filmTitle: string,
  genre: Genre,
  boxOffice: number,
  tier: RewardTier,
  franchiseLength: number,
): MerchStream | null {
  if (tier === 'FLOP') return null;

  // Base merch: % of BO
  const tierMult: Record<RewardTier, number> = {
    FLOP: 0,
    HIT: 0.05,
    SMASH: 0.10,
    BLOCKBUSTER: 0.18,
  };

  // Franchise bonus: each sequel in franchise adds 15% to merch
  const franchiseBonus = 1 + (franchiseLength - 1) * 0.15;

  // Genre bonus: Action and Sci-Fi merchandise better
  const genreBonus = (genre === 'Action' || genre === 'Sci-Fi') ? 1.3 : 1.0;

  const baseIncome = boxOffice * tierMult[tier] * franchiseBonus * genreBonus;
  const perSeason = Math.round(baseIncome * 10) / 10;

  if (perSeason < 0.5) return null;

  // Duration: 2 seasons for HIT, 3 for SMASH/BLOCKBUSTER
  const duration = tier === 'HIT' ? 2 : 3;

  return {
    filmTitle,
    genre,
    tier,
    franchiseLength,
    incomePerSeason: perSeason,
    seasonsRemaining: duration,
  };
}

/** Collect merch income from all active streams. */
export function collectMerchIncome(streams: MerchStream[]): { income: number; updated: MerchStream[] } {
  let income = 0;
  const updated: MerchStream[] = [];
  for (const s of streams) {
    if (s.seasonsRemaining > 0) {
      income += s.incomePerSeason;
      const next = { ...s, seasonsRemaining: s.seasonsRemaining - 1 };
      if (next.seasonsRemaining > 0) updated.push(next);
    }
  }
  return { income: Math.round(income * 10) / 10, updated };
}

// ─── STREAMING DEALS ───

export interface StreamingDeal {
  id: string;
  platformName: string;
  guaranteedIncome: number; // flat payment regardless of BO
  boMultiplierCap: number;  // caps BO multiplier (e.g. 0.6 = 60% of normal)
  description: string;
}

const PLATFORM_NAMES = ['StreamMax', 'CineCloud', 'FilmVault', 'PrimeScreen', 'WatchNow', 'FlixDirect'];

export function generateStreamingDeal(season: number): StreamingDeal | null {
  // 40% chance of getting an offer each season
  if (Math.random() > 0.40) return null;

  const platform = PLATFORM_NAMES[Math.floor(Math.random() * PLATFORM_NAMES.length)];
  const baseGuarantee = 10 + season * 5;
  const variance = Math.round((Math.random() * 6 - 3) * 10) / 10;

  return {
    id: `stream_${season}_${Date.now()}`,
    platformName: platform,
    guaranteedIncome: Math.round((baseGuarantee + variance) * 10) / 10,
    boMultiplierCap: 0.55 + Math.random() * 0.15, // 0.55-0.70
    description: `${platform} offers $${Math.round(baseGuarantee + variance)}M guaranteed for exclusive streaming rights. Box office reduced to ${Math.round((0.55 + Math.random() * 0.15) * 100)}% of normal.`,
  };
}

// ─── INSURANCE ───

export interface InsurancePolicy {
  id: string;
  premium: number;      // cost per season
  flopProtection: number; // reduces flop earnings loss (0.15 = only lose 15% instead of 40%)
  active: boolean;
  description: string;
}

export function generateInsuranceOffer(season: number): InsurancePolicy {
  const premium = Math.round((3 + season * 0.8) * 10) / 10;
  return {
    id: `insurance_${season}`,
    premium,
    flopProtection: 0.85, // earn 85% of BO on flop instead of 60%
    active: false,
    description: `Pay $${premium}M/season. On FLOP, keep 85% of BO instead of 60%.`,
  };
}

// ─── CASH FLOW SUMMARY ───

export interface CashFlowBreakdown {
  boxOfficeIncome: number;
  merchIncome: number;
  investmentIncome: number;
  streamingIncome: number;
  seasonStipend: number;
  loanProceeds: number;
  totalIncome: number;

  scriptCosts: number;
  talentCosts: number;
  loanRepayments: number;
  loanInterest: number;
  insurancePremium: number;
  investmentCosts: number;
  perkCosts: number;
  totalExpenses: number;

  netCashFlow: number;
}

export function buildCashFlowBreakdown(
  seasonHistory: { boxOffice: number; tier: RewardTier }[],
  merchStreams: MerchStream[],
  investments: Investment[],
  loans: Loan[],
  insurance: InsurancePolicy | null,
  streamingDealIncome: number,
  seasonStipend: number,
): CashFlowBreakdown {
  const lastSeason = seasonHistory[seasonHistory.length - 1];
  const boxOfficeIncome = lastSeason?.boxOffice || 0;
  const merchIncome = merchStreams.reduce((sum, s) => sum + (s.seasonsRemaining > 0 ? s.incomePerSeason : 0), 0);
  const investmentIncome = investments.reduce((sum, inv) => sum + (inv.seasonsRemaining > 0 ? inv.incomePerSeason : 0), 0);
  const loanInterest = loans.reduce((sum, l) => sum + Math.round(l.remainingBalance * l.interestRate * 10) / 10, 0);
  const insurancePremium = insurance?.active ? insurance.premium : 0;

  const totalIncome = Math.round((boxOfficeIncome + merchIncome + investmentIncome + streamingDealIncome + seasonStipend) * 10) / 10;
  const totalExpenses = Math.round((loanInterest + insurancePremium) * 10) / 10;

  return {
    boxOfficeIncome,
    merchIncome: Math.round(merchIncome * 10) / 10,
    investmentIncome: Math.round(investmentIncome * 10) / 10,
    streamingIncome: streamingDealIncome,
    seasonStipend,
    loanProceeds: 0,
    totalIncome,
    scriptCosts: 0,
    talentCosts: 0,
    loanRepayments: 0,
    loanInterest: Math.round(loanInterest * 10) / 10,
    insurancePremium,
    investmentCosts: 0,
    perkCosts: 0,
    totalExpenses,
    netCashFlow: Math.round((totalIncome - totalExpenses) * 10) / 10,
  };
}
