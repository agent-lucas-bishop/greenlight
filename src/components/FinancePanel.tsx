/*
 * R221: Financial Dashboard — accessible during greenlight/casting phases
 * Shows cash flow, loans, investments, merch, streaming deals, insurance
 */

import { GameState } from '../types';
import {
  toggleFinancePanel, takeLoan, makeRepayment, buyInvestment,
  acceptStreamingDeal, declineStreamingDeal, buyInsurance, cancelInsurance,
} from '../gameStore';
import type { Loan, Investment, MerchStream, StreamingDeal, InsurancePolicy } from '../economy';
import { useState } from 'react';
import { sfx } from '../sound';

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
        <span style={{ color: '#ccc' }}>{label}</span>
        <span style={{ color }}>${value}M</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ color: 'var(--gold)', margin: '0 0 8px', fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4 }}>
        {emoji} {title}
      </h4>
      {children}
    </div>
  );
}

export default function FinancePanel({ state }: { state: GameState }) {
  const [repayId, setRepayId] = useState<string | null>(null);
  const [repayAmt, setRepayAmt] = useState('');

  const totalDebt = state.activeLoans.reduce((s, l) => s + l.remainingBalance, 0);
  const totalInvestValue = state.activeInvestments.reduce((s, i) => s + i.incomePerSeason * i.seasonsRemaining, 0);
  const totalMerchIncome = state.merchStreams.reduce((s, m) => s + (m.seasonsRemaining > 0 ? m.incomePerSeason : 0), 0);
  const maxIncome = Math.max(state.budget, totalDebt, totalInvestValue, totalMerchIncome, 20);

  return (
    <div className="modal-overlay" onClick={() => toggleFinancePanel()}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580, maxHeight: '85vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={() => toggleFinancePanel()} aria-label="Close">✕</button>
        <h2 style={{ color: 'var(--gold)', marginBottom: 12, fontSize: '1.1rem' }}>💰 Financial Dashboard</h2>

        {/* Cash Flow Overview */}
        <Section title="Cash Flow" emoji="📊">
          <Bar value={state.budget} max={maxIncome} color="#2ecc71" label="Cash on Hand" />
          {totalDebt > 0 && <Bar value={totalDebt} max={maxIncome} color="#e74c3c" label="Total Debt" />}
          {totalMerchIncome > 0 && <Bar value={totalMerchIncome} max={maxIncome} color="#9b59b6" label="Merch/Season" />}
          {state.lastInvestmentIncome > 0 && <span ref={el => { if (el && !el.dataset.sounded) { el.dataset.sounded = '1'; sfx.investmentPayout(); } }}><Bar value={state.lastInvestmentIncome} max={maxIncome} color="#3498db" label="Investment Income (this season)" /></span>}
          {state.lastMerchIncome > 0 && <span ref={el => { if (el && !el.dataset.sounded) { el.dataset.sounded = '1'; sfx.merchIncome(); } }}><Bar value={state.lastMerchIncome} max={maxIncome} color="#9b59b6" label="Merch Income (this season)" /></span>}
        </Section>

        {/* Active Loans */}
        <Section title={`Loans (${state.activeLoans.length}/2)`} emoji="🏦">
          {state.activeLoans.length === 0 && <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>No active loans</p>}
          {state.activeLoans.map(loan => (
            <div key={loan.id} style={{ background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#e74c3c' }}>Owed: <strong>${loan.remainingBalance}M</strong></span>
                <span style={{ color: '#e67e22' }}>{loan.interestRate * 100}% interest · {loan.seasonsRemaining} seasons left</span>
              </div>
              {repayId === loan.id ? (
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <input
                    type="number"
                    value={repayAmt}
                    onChange={e => setRepayAmt(e.target.value)}
                    placeholder="$M"
                    style={{ width: 60, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '0.8rem' }}
                  />
                  <button className="btn btn-small" onClick={() => {
                    const amt = parseFloat(repayAmt);
                    if (amt > 0) { sfx.loanRepaid(); makeRepayment(loan.id, amt); setRepayId(null); setRepayAmt(''); }
                  }}>Pay</button>
                  <button className="btn btn-small" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => { setRepayId(null); setRepayAmt(''); }}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-small" style={{ marginTop: 4, fontSize: '0.7rem' }} onClick={() => { setRepayId(loan.id); setRepayAmt(String(Math.min(state.budget, loan.remainingBalance))); }}>
                  Repay
                </button>
              )}
            </div>
          ))}
          {/* Loan offers */}
          {state.loanOffers.length > 0 && state.activeLoans.length < 2 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ color: '#f39c12', fontSize: '0.75rem', margin: '0 0 6px' }}>Available Loans:</p>
              {state.loanOffers.map(offer => (
                <div key={offer.id} style={{ background: 'rgba(243,156,18,0.06)', border: '1px solid rgba(243,156,18,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                  <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong style={{ color: '#2ecc71' }}>${offer.amount}M</strong></span>
                    <span style={{ color: '#e67e22' }}>{offer.interestRate * 100}% rate · {offer.seasonsDue} seasons</span>
                  </div>
                  <button className="btn btn-small" style={{ marginTop: 4, fontSize: '0.7rem' }} onClick={() => { sfx.loanTaken(); takeLoan(offer.id); }}>
                    Borrow ${offer.amount}M
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Investments */}
        <Section title={`Investments (${state.activeInvestments.length}/3)`} emoji="📈">
          {state.activeInvestments.length === 0 && state.investmentOffers.length === 0 && (
            <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>No investments available</p>
          )}
          {state.activeInvestments.map(inv => (
            <div key={inv.id} style={{ background: 'rgba(52,152,219,0.06)', border: '1px solid rgba(52,152,219,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: '0.8rem' }}>
              <div style={{ color: '#3498db', fontWeight: 'bold' }}>{inv.name}</div>
              <div style={{ color: '#999', fontSize: '0.75rem' }}>{inv.description}</div>
              <div style={{ marginTop: 4, display: 'flex', gap: 12 }}>
                <span style={{ color: '#2ecc71' }}>+${inv.incomePerSeason}M/season</span>
                <span style={{ color: '#ccc' }}>{inv.seasonsRemaining}/{inv.totalSeasons} seasons left</span>
              </div>
            </div>
          ))}
          {state.investmentOffers.length > 0 && state.activeInvestments.length < 3 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ color: '#3498db', fontSize: '0.75rem', margin: '0 0 6px' }}>Available Investments:</p>
              {state.investmentOffers.map(inv => {
                const canAfford = state.budget >= inv.cost;
                const totalReturn = Math.round(inv.incomePerSeason * inv.totalSeasons * 10) / 10;
                const roi = Math.round(((totalReturn / inv.cost) - 1) * 100);
                return (
                  <div key={inv.id} style={{ background: 'rgba(52,152,219,0.06)', border: '1px solid rgba(52,152,219,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#3498db' }}>{inv.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#999' }}>{inv.description}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ color: '#e74c3c' }}>Cost: ${inv.cost}M</span>
                      <span style={{ color: '#2ecc71' }}>+${inv.incomePerSeason}M/season × {inv.totalSeasons}</span>
                      <span style={{ color: roi > 0 ? '#2ecc71' : '#e74c3c' }}>ROI: {roi > 0 ? '+' : ''}{roi}%</span>
                    </div>
                    <button className="btn btn-small" style={{ marginTop: 4, fontSize: '0.7rem', opacity: canAfford ? 1 : 0.4 }} disabled={!canAfford} onClick={() => { sfx.investmentPurchased(); buyInvestment(inv.id); }}>
                      Invest ${inv.cost}M
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Merchandise */}
        <Section title="Merchandise" emoji="🎪">
          {state.merchStreams.length === 0 && (
            <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>No merch streams yet — make a HIT film!</p>
          )}
          {state.merchStreams.filter(m => m.seasonsRemaining > 0).map((m, i) => (
            <div key={i} style={{ background: 'rgba(155,89,182,0.06)', border: '1px solid rgba(155,89,182,0.15)', borderRadius: 8, padding: '6px 12px', marginBottom: 4, fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>
                <span style={{ color: '#9b59b6' }}>{m.filmTitle}</span>
                {m.franchiseLength > 1 && <span style={{ color: '#f39c12', fontSize: '0.7rem' }}> 🎬×{m.franchiseLength}</span>}
              </span>
              <span>
                <span style={{ color: '#2ecc71' }}>+${m.incomePerSeason}M</span>
                <span style={{ color: '#888', fontSize: '0.7rem' }}> · {m.seasonsRemaining}s left</span>
              </span>
            </div>
          ))}
        </Section>

        {/* Streaming Deal */}
        <Section title="Streaming Deals" emoji="📺">
          {state.activeStreamingDeal && (
            <div style={{ background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: '0.8rem' }}>
              <div style={{ color: '#2ecc71', fontWeight: 'bold' }}>Active: {state.activeStreamingDeal.platformName}</div>
              <div style={{ color: '#999', fontSize: '0.75rem' }}>
                Guaranteed ${state.activeStreamingDeal.guaranteedIncome}M · BO capped at {Math.round(state.activeStreamingDeal.boMultiplierCap * 100)}%
              </div>
            </div>
          )}
          {state.streamingDealOffer && !state.activeStreamingDeal && (
            <div ref={el => { if (el && !el.dataset.sounded) { el.dataset.sounded = '1'; sfx.streamingDealOffer(); } }} style={{ background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
              <div style={{ color: '#2ecc71', fontWeight: 'bold' }}>📨 Offer from {state.streamingDealOffer.platformName}</div>
              <div style={{ color: '#ccc', fontSize: '0.75rem', margin: '4px 0' }}>
                Guaranteed <strong>${state.streamingDealOffer.guaranteedIncome}M</strong> for next film.
                Box office capped at {Math.round(state.streamingDealOffer.boMultiplierCap * 100)}%.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button className="btn btn-small" onClick={() => { sfx.click(); acceptStreamingDeal(); }}>Accept Deal</button>
                <button className="btn btn-small" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={declineStreamingDeal}>Decline</button>
              </div>
            </div>
          )}
          {!state.activeStreamingDeal && !state.streamingDealOffer && (
            <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>No deals available this season</p>
          )}
        </Section>

        {/* Insurance */}
        <Section title="Insurance" emoji="🛡️">
          {state.insurancePolicy?.active ? (
            <div style={{ background: 'rgba(241,196,15,0.06)', border: '1px solid rgba(241,196,15,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#f1c40f' }}>Active — FLOP keeps 85% BO</span>
                <span style={{ color: '#e74c3c' }}>-${state.insurancePolicy.premium}M/season</span>
              </div>
              <button className="btn btn-small" style={{ marginTop: 4, fontSize: '0.7rem', background: 'rgba(231,76,60,0.2)' }} onClick={() => { sfx.insuranceToggle(); cancelInsurance(); }}>
                Cancel Policy
              </button>
            </div>
          ) : state.insuranceOffer ? (
            <div style={{ background: 'rgba(241,196,15,0.06)', border: '1px solid rgba(241,196,15,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
              <div style={{ color: '#f1c40f', marginBottom: 4 }}>{state.insuranceOffer.description}</div>
              <button className="btn btn-small" style={{ fontSize: '0.7rem' }} disabled={state.budget < state.insuranceOffer.premium} onClick={() => { sfx.insuranceToggle(); buyInsurance(); }}>
                Buy Insurance (${state.insuranceOffer.premium}M)
              </button>
            </div>
          ) : (
            <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>No insurance available</p>
          )}
        </Section>
      </div>
    </div>
  );
}
