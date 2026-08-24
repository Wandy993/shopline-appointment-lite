export const PLAN_LIMITS = Object.freeze({
  free: { activeRules: 1, label: 'Free' },
  pro: { activeRules: 100, label: 'Pro' }
});

export function limitsFor(plan = 'free') {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}
