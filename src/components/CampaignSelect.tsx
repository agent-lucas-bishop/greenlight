/**
 * R235: Campaign Selection Screen
 * Card layout with locked/unlocked states, progress tracking, and celebration.
 */

import { useState, useEffect } from 'react';
import {
  CAMPAIGNS,
  loadCampaignData,
  saveCampaignData,
  isCampaignUnlocked,
  startCampaign,
  getActiveCampaign,
  type Campaign,
  type CampaignProgress,
  type CampaignSaveData,
} from '../campaigns';
import { sfx } from '../sound';

function DifficultyStars({ rating }: { rating: number }) {
  return (
    <span style={{ letterSpacing: 2 }} aria-label={`Difficulty ${rating} of 5`}>
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

function ObjectiveItem({ description, completed }: { description: string; completed: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
      color: completed ? '#2ecc71' : '#999', fontSize: '0.75rem',
    }}>
      <span style={{ fontSize: '0.85rem' }}>{completed ? '✅' : '⬜'}</span>
      <span style={{ textDecoration: completed ? 'line-through' : 'none' }}>{description}</span>
    </div>
  );
}

function CampaignCard({
  campaign,
  progress,
  unlocked,
  isActive,
  justCompleted,
  onStart,
}: {
  campaign: Campaign;
  progress?: CampaignProgress;
  unlocked: boolean;
  isActive: boolean;
  justCompleted: boolean;
  onStart: () => void;
}) {
  const completed = progress?.completedAt != null;
  const objectivesDone = progress?.completedObjectiveIds?.length ?? 0;
  const totalObjectives = campaign.objectives.length;

  const borderColor = justCompleted ? '#ffd700' :
    completed ? 'rgba(46,204,113,0.5)' :
    isActive ? 'rgba(212,168,67,0.5)' :
    unlocked ? 'rgba(255,255,255,0.1)' :
    'rgba(255,255,255,0.05)';

  return (
    <div
      className="card"
      style={{
        padding: 20,
        flex: '1 1 260px',
        maxWidth: 320,
        textAlign: 'left',
        borderColor,
        opacity: unlocked ? 1 : 0.5,
        position: 'relative',
        overflow: 'hidden',
        cursor: unlocked && !isActive && !completed ? 'pointer' : 'default',
        transition: 'transform 0.2s, border-color 0.2s',
      }}
      onClick={() => {
        if (unlocked && !isActive && !completed) {
          sfx.campaignSelect();
          onStart();
        }
      }}
      onMouseEnter={e => {
        if (unlocked && !isActive && !completed) {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.borderColor = borderColor;
      }}
    >
      {/* Completion celebration overlay */}
      {justCompleted && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'comboAppear 0.6s ease',
        }} />
      )}

      {/* Locked overlay */}
      {!unlocked && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem' }}>🔒</div>
            <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>
              Complete previous campaign to unlock
            </div>
          </div>
        </div>
      )}

      {/* Status badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {completed && (
          <span style={{
            fontSize: '0.6rem', color: '#2ecc71', background: 'rgba(46,204,113,0.15)',
            border: '1px solid rgba(46,204,113,0.3)', borderRadius: 4, padding: '2px 8px',
          }}>
            ✅ COMPLETED
          </span>
        )}
        {isActive && !completed && (
          <span style={{
            fontSize: '0.6rem', color: 'var(--gold)', background: 'rgba(212,168,67,0.15)',
            border: '1px solid rgba(212,168,67,0.3)', borderRadius: 4, padding: '2px 8px',
            animation: 'comboAppear 0.4s ease',
          }}>
            ▶ ACTIVE
          </span>
        )}
        <span style={{
          fontSize: '0.6rem', color: campaign.difficulty >= 4 ? '#e74c3c' : campaign.difficulty >= 3 ? '#f39c12' : '#2ecc71',
        }}>
          <DifficultyStars rating={campaign.difficulty} />
        </span>
      </div>

      {/* Campaign name */}
      <h3 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: 1, margin: '0 0 4px' }}>
        {campaign.name}
      </h3>

      {/* Description */}
      <p style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.5, margin: '0 0 12px' }}>
        {campaign.description}
      </p>

      {/* Art description */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px',
        marginBottom: 12, borderLeft: '3px solid rgba(212,168,67,0.3)',
      }}>
        <div style={{ color: '#666', fontSize: '0.65rem', fontStyle: 'italic' }}>
          🎨 {campaign.artDescription}
        </div>
      </div>

      {/* Starting conditions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {campaign.startingConditions.budgetMod !== 0 && (
          <span style={{
            fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4,
            color: campaign.startingConditions.budgetMod > 0 ? '#2ecc71' : '#e74c3c',
            background: campaign.startingConditions.budgetMod > 0 ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
          }}>
            💰 {campaign.startingConditions.budgetMod > 0 ? '+' : ''}{campaign.startingConditions.budgetMod}M budget
          </span>
        )}
        {campaign.startingConditions.reputationMod !== 0 && (
          <span style={{
            fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4,
            color: campaign.startingConditions.reputationMod > 0 ? '#2ecc71' : '#e74c3c',
            background: campaign.startingConditions.reputationMod > 0 ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
          }}>
            ⭐ {campaign.startingConditions.reputationMod > 0 ? '+' : ''}{campaign.startingConditions.reputationMod} reputation
          </span>
        )}
      </div>

      {/* Objectives */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: '#777', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Objectives ({objectivesDone}/{totalObjectives})
        </div>
        {campaign.objectives.map(obj => (
          <ObjectiveItem
            key={obj.id}
            description={obj.description}
            completed={progress?.completedObjectiveIds?.includes(obj.id) ?? false}
          />
        ))}
      </div>

      {/* Progress bar */}
      {progress && !completed && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 6, overflow: 'hidden' }}>
            <div style={{
              background: 'linear-gradient(90deg, var(--gold), #f39c12)',
              height: '100%', width: `${(objectivesDone / totalObjectives) * 100}%`,
              borderRadius: 3, transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.6rem', color: '#888' }}>
            <span>{progress.films.length} films · {progress.roundsPlayed} rounds</span>
            <span>${progress.totalBoxOffice.toFixed(1)}M earned</span>
          </div>
        </div>
      )}

      {/* Rewards preview */}
      <div>
        <div style={{ color: '#777', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Rewards
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {campaign.rewards.map(r => (
            <span key={r.id} style={{
              fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4,
              background: completed ? 'rgba(46,204,113,0.1)' : 'rgba(255,255,255,0.05)',
              color: completed ? '#2ecc71' : '#888',
              border: `1px solid ${completed ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              {r.emoji} {r.name}
            </span>
          ))}
        </div>
      </div>

      {/* Action button */}
      {unlocked && !isActive && !completed && (
        <button
          className="btn btn-primary"
          style={{ marginTop: 12, width: '100%', fontSize: '0.8rem' }}
          onClick={e => { e.stopPropagation(); sfx.campaignSelect(); onStart(); }}
        >
          🎬 Start Campaign
        </button>
      )}
    </div>
  );
}

// ─── Campaign Completion Celebration Modal ───

function CampaignCompletionModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  useEffect(() => { sfx.campaignComplete(); }, []);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: 8 }}>🎉</div>
        <h2 style={{ color: '#ffd700', fontFamily: 'Bebas Neue', fontSize: '2rem', letterSpacing: 3, marginBottom: 8 }}>
          CAMPAIGN COMPLETE!
        </h2>
        <div style={{ color: 'var(--gold)', fontSize: '1.2rem', fontFamily: 'Bebas Neue', letterSpacing: 1, marginBottom: 16 }}>
          {campaign.name}
        </div>
        <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 20 }}>
          You've conquered every objective. Your rewards have been unlocked!
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          {campaign.rewards.map(r => (
            <div key={r.id} style={{
              background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: 8, padding: '10px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem' }}>{r.emoji}</div>
              <div style={{ color: '#ffd700', fontSize: '0.8rem', fontWeight: 600 }}>{r.name}</div>
              <div style={{ color: '#888', fontSize: '0.65rem' }}>{r.description}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={onClose}>🎬 Continue</button>
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function CampaignSelect({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<CampaignSaveData>(loadCampaignData);
  const [celebrateCampaign, setCelebrateCampaign] = useState<Campaign | null>(null);

  // Refresh data on mount
  useEffect(() => {
    setData(loadCampaignData());
  }, []);

  const activeCampaign = getActiveCampaign(data);

  const handleStart = (campaignId: string) => {
    const updated = startCampaign(campaignId, { ...data });
    setData(updated);
  };

  return (
    <div className="fade-in" style={{ padding: '20px', maxWidth: 1100, margin: '0 auto' }}>
      {celebrateCampaign && (
        <CampaignCompletionModal
          campaign={celebrateCampaign}
          onClose={() => setCelebrateCampaign(null)}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button className="btn" onClick={onBack} style={{ fontSize: '0.8rem' }}>← Back</button>
        <h2 style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.8rem', letterSpacing: 2, margin: 0 }}>
          🎬 Campaigns
        </h2>
        <div style={{ color: '#888', fontSize: '0.75rem' }}>
          {data.completedCampaignIds.length}/{CAMPAIGNS.length} Complete
        </div>
      </div>

      {/* Active campaign banner */}
      {activeCampaign && (
        <div style={{
          background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.3)',
          borderRadius: 12, padding: '12px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: 1 }}>
              ▶ Active: {activeCampaign.campaign.name}
            </span>
            <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: 12 }}>
              {activeCampaign.progress.completedObjectiveIds.length}/{activeCampaign.campaign.objectives.length} objectives
            </span>
          </div>
          <div style={{ color: '#999', fontSize: '0.7rem' }}>
            {activeCampaign.progress.films.length} films · ${activeCampaign.progress.totalBoxOffice.toFixed(1)}M
          </div>
        </div>
      )}

      {/* Campaign cards grid */}
      <div style={{
        display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap',
      }}>
        {CAMPAIGNS.map(campaign => {
          const progress = data.progress[campaign.id];
          const unlocked = isCampaignUnlocked(campaign, data.completedCampaignIds);
          const isActive = activeCampaign?.campaign.id === campaign.id;
          const justCompleted = false; // Could be set from a completion event

          return (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              progress={progress}
              unlocked={unlocked}
              isActive={isActive}
              justCompleted={justCompleted}
              onStart={() => handleStart(campaign.id)}
            />
          );
        })}
      </div>

      {/* All campaigns complete celebration */}
      {data.completedCampaignIds.length === CAMPAIGNS.length && (
        <div style={{
          textAlign: 'center', marginTop: 24, padding: '20px',
          background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,107,107,0.08) 100%)',
          border: '2px solid rgba(255,215,0,0.4)', borderRadius: 16,
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>👑</div>
          <div style={{ color: '#ffd700', fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: 3 }}>
            ALL CAMPAIGNS COMPLETE
          </div>
          <div style={{ color: '#ccc', fontSize: '0.85rem', marginTop: 8 }}>
            You've mastered every narrative challenge. You are a true Hollywood Legend.
          </div>
        </div>
      )}
    </div>
  );
}
