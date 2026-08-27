export type WorkSignals = {
  overdueMinutes: number;
  riskScore: number;
  opportunityScore: number;
  isCallback: boolean;
  isNewProspect: boolean;
};

export function calculateWorkPriority(s: WorkSignals): number {
  const overdue = Math.min(Math.max(s.overdueMinutes, 0), 720) * 0.15;
  const risk = Math.min(Math.max(s.riskScore, 0), 100) * 0.4;
  const opportunity = Math.min(Math.max(s.opportunityScore, 0), 100) * 0.3;
  const callback = s.isCallback ? 20 : 0;
  const newProspect = s.isNewProspect ? 10 : 0;
  return Math.round(overdue + risk + opportunity + callback + newProspect);
}
