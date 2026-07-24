import { AlertTriangle, Check, Info, Wrench } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { OperationalNotification } from '../hooks/useOperationalNotifications';
import { DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

type NotificationCenterProps = {
  markAllAsRead: () => void;
  markAsRead: (notificationId: string) => void;
  notifications: OperationalNotification[];
  onNavigate: () => void;
  unreadCount: number;
};

const severityIcon = {
  critical: AlertTriangle,
  warning: Wrench,
  info: Info,
} as const;

export function NotificationCenter({
  markAllAsRead,
  markAsRead,
  notifications,
  onNavigate,
  unreadCount,
}: NotificationCenterProps) {
  return (
    <>
      <DialogHeader>
        <div className="notification-dialog-heading">
          <div>
            <DialogTitle>Notificações operacionais</DialogTitle>
            <DialogDescription>
              Atualizadas automaticamente pelos ativos, manutenções e sincronização.
            </DialogDescription>
          </div>
          <button
            className="ghost-action notification-read-all"
            type="button"
            disabled={unreadCount === 0}
            onClick={markAllAsRead}
          >
            <Check size={16} />
            {unreadCount ? 'Marcar todas como lidas' : 'Tudo lido'}
          </button>
        </div>
      </DialogHeader>

      <div className="notification-list" aria-live="polite">
        {notifications.length ? notifications.map((notification) => {
          const SeverityIcon = severityIcon[notification.severity];

          return (
            <article
              className={`notification-item notification-${notification.severity} ${notification.isRead ? 'is-read' : 'is-unread'}`}
              key={notification.id}
            >
              <button
                className="notification-content"
                type="button"
                onClick={() => markAsRead(notification.id)}
                aria-label={`Marcar como lida: ${notification.title}`}
                disabled={notification.isRead}
              >
                <span className="notification-severity-icon">
                  <SeverityIcon size={17} />
                </span>
                <span className="notification-copy">
                  <span className="notification-title-row">
                    <strong>{notification.title}</strong>
                    {!notification.isRead ? <i aria-label="Não lida" /> : null}
                  </span>
                  <span>{notification.description}</span>
                  <time>{notification.time}</time>
                </span>
              </button>
              <NavLink
                className="notification-open-link"
                to={notification.to}
                onClick={() => {
                  markAsRead(notification.id);
                  onNavigate();
                }}
              >
                Abrir
              </NavLink>
            </article>
          );
        }) : (
          <div className="notification-empty" role="status">
            <Check size={20} />
            <strong>Nenhuma pendência operacional</strong>
            <span>Novos alertas aparecerão aqui automaticamente.</span>
          </div>
        )}
      </div>
      <NavLink className="primary-action dialog-action" to="/monitoramento" onClick={onNavigate}>
        Abrir monitoramento
      </NavLink>
    </>
  );
}
