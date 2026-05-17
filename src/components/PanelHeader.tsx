import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type PanelHeaderProps = {
  title: string;
  icon: ReactNode;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
};

export function PanelHeader({ title, icon, actionLabel, actionTo, onAction }: PanelHeaderProps) {
  const resolvedActionLabel = actionLabel ?? `Abrir detalhes de ${title}`;

  return (
    <div className="panel-header">
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      {actionTo ? (
        <Link className="panel-header-action" to={actionTo} aria-label={resolvedActionLabel} title={resolvedActionLabel}>
          <ChevronRight size={19} />
        </Link>
      ) : null}
      {!actionTo && onAction ? (
        <button type="button" aria-label={resolvedActionLabel} title={resolvedActionLabel} onClick={onAction}>
          <ChevronRight size={19} />
        </button>
      ) : null}
    </div>
  );
}
