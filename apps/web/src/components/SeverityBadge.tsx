import type { Severity } from '@btfp/shared-types';

const STYLES: Record<Severity, string> = {
  severe: 'bg-alert-100 text-alert-600',
  moderate: 'bg-paw-100 text-paw-600',
  mild: 'bg-leaf-100 text-leaf-600',
  unknown: 'bg-neutral-100 text-neutral-500',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STYLES[severity]}`}
    >
      {severity}
    </span>
  );
}
