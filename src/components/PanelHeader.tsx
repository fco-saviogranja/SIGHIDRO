import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

type PanelHeaderProps = {
  title: string;
  icon: ReactNode;
  actionLabel?: string;
};

export function PanelHeader({ title, icon, actionLabel }: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      <button
        type="button"
        aria-label={actionLabel ?? `Abrir detalhes de ${title}`}
        title={actionLabel ?? `Abrir detalhes de ${title}`}
      >
        <ChevronRight size={19} />
      </button>
    </div>
  );
}
