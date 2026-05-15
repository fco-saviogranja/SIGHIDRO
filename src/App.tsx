import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Droplets,
  Gauge,
  Map,
  Menu,
  MoreVertical,
  Settings,
  Users,
  Waves,
} from 'lucide-react';
import {
  alerts,
  assets,
  flowSeries,
  indicators,
  maintenances,
  productionSeries,
  systemModules,
  userContext,
} from './data';
import type { Alert, ChartPoint, Indicator, Maintenance, OperationalStatus, WaterAsset } from './types';

const statusLabel: Record<OperationalStatus, string> = {
  operando: 'Operando',
  atenção: 'Atenção',
  parado: 'Parado',
  manutenção: 'Manutenção',
};

function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="dashboard">
        <section className="hero-strip">
          <div>
            <span className="eyebrow">Centro de Inteligência Hídrica Municipal</span>
            <h1>Operação integrada do abastecimento público</h1>
          </div>
          <div className="hero-actions" aria-label="Indicadores rápidos">
            <span>
              <CheckCircle2 size={18} />
              92% da rede monitorada
            </span>
            <span>
              <CircleGauge size={18} />
              4 alertas em triagem
            </span>
          </div>
        </section>

        <section className="metrics-grid" aria-label="Indicadores operacionais">
          {indicators.map((indicator) => (
            <MetricCard key={indicator.label} indicator={indicator} />
          ))}
        </section>

        <section className="operations-grid">
          <OperationalMap />
          <AlertPanel />
        </section>

        <section className="analytics-grid">
          <LineChart title="Vazão hídrica diária" points={flowSeries} unit="m³/h" />
          <BarChart title="Produção total mensal" points={productionSeries} unit="%" />
          <MaintenancePanel />
        </section>

        <section className="modules-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Estrutura modular</span>
              <h2>Módulos do SIGHIDRO</h2>
            </div>
            <span className="section-note">Base preparada para expansão operacional e administrativa.</span>
          </div>
          <div className="modules-grid">
            {systemModules.map((module) => {
              const Icon = module.icon;
              return (
                <article className={`module-card accent-${module.accent}`} key={module.id}>
                  <div className="module-topline">
                    <span className="module-icon">
                      <Icon size={22} />
                    </span>
                    <span className={`status-pill status-${module.status}`}>{statusLabel[module.status]}</span>
                  </div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                  <div className="module-items">
                    {module.items.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <AssetTable />
      </main>
    </div>
  );
}

function Header() {
  const BadgeIcon = userContext.badgeIcon;

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          <Droplets size={28} />
        </div>
        <div>
          <strong>SIGHIDRO</strong>
          <span>Sistema Integrado de Gestão Hídrica do SAAE de Jardim</span>
        </div>
      </div>

      <nav className="desktop-nav" aria-label="Navegação principal">
        <a className="active" href="#dashboard">
          <Gauge size={18} />
          Dashboard
        </a>
        <a href="#modules">
          <Droplets size={18} />
          Cadastro
        </a>
        <a href="#monitoramento">
          <Waves size={18} />
          Monitoramento
        </a>
        <a href="#mapa">
          <Map size={18} />
          Mapa
        </a>
        <a href="#usuarios">
          <Users size={18} />
          Usuários
        </a>
      </nav>

      <div className="topbar-actions">
        <button className="icon-button" type="button" aria-label="Notificações">
          <Bell size={19} />
          <span className="notification-dot" />
        </button>
        <button className="icon-button" type="button" aria-label="Configurações">
          <Settings size={19} />
        </button>
        <div className="user-chip">
          <BadgeIcon size={19} />
          <span>
            {userContext.name}
            <small>{userContext.role}</small>
          </span>
        </div>
        <button className="menu-button" type="button" aria-label="Abrir menu">
          <Menu size={22} />
        </button>
      </div>
    </header>
  );
}

function MetricCard({ indicator }: { indicator: Indicator }) {
  const TrendIcon = indicator.trend === 'up' ? ArrowUpRight : indicator.trend === 'down' ? ArrowDownRight : CircleGauge;

  return (
    <article className={`metric-card trend-${indicator.trend}`}>
      <div className="card-menu">
        <TrendIcon size={20} />
        <button type="button" aria-label={`Opções de ${indicator.label}`}>
          <MoreVertical size={18} />
        </button>
      </div>
      <span>{indicator.label}</span>
      <strong>{indicator.value}</strong>
      <small>{indicator.detail}</small>
    </article>
  );
}

function OperationalMap() {
  const mapMarkers = [
    { label: 'Poço Brejinho', status: 'atenção', x: 66, y: 34 },
    { label: 'Sítio Serra Boa', status: 'operando', x: 25, y: 52 },
    { label: 'Centro', status: 'operando', x: 49, y: 47 },
    { label: 'São Francisco', status: 'parado', x: 31, y: 72 },
    { label: 'Reservatório', status: 'operando', x: 71, y: 66 },
  ] as const;

  return (
    <section className="panel map-panel" id="mapa">
      <PanelHeader title="Mapa operacional" icon={<Map size={19} />} />
      <div className="map-canvas" role="img" aria-label="Mapa operacional simulado com poços, reservatórios e rede">
        <svg className="pipeline-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="main-pipeline" d="M8 66 C25 55, 36 49, 51 48 S78 41, 94 29" />
          <path className="secondary-pipeline" d="M28 75 C39 67, 45 57, 49 49 S60 38, 67 34" />
          <path className="pressure-line" d="M49 48 C54 57, 61 62, 73 66" />
          <path className="warning-line" d="M31 72 C25 66, 22 59, 25 52" />
        </svg>
        <div className="terrain-label label-north">Serra Boa</div>
        <div className="terrain-label label-center">Jardim Centro</div>
        <div className="terrain-label label-east">Brejinho</div>
        {mapMarkers.map((marker) => (
          <button
            className={`map-marker status-${marker.status}`}
            key={marker.label}
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            type="button"
            aria-label={`${marker.label}: ${statusLabel[marker.status]}`}
          >
            <span />
          </button>
        ))}
        <div className="map-legend">
          <span>
            <i className="legend-dot operando" />
            Operando
          </span>
          <span>
            <i className="legend-dot atenção" />
            Atenção
          </span>
          <span>
            <i className="legend-dot parado" />
            Parado
          </span>
          <span>
            <i className="legend-line" />
            Rede
          </span>
        </div>
      </div>
    </section>
  );
}

function AlertPanel() {
  return (
    <section className="panel alert-panel">
      <PanelHeader title="Alertas críticos" icon={<AlertTriangle size={19} />} />
      <div className="alert-list">
        {alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </div>
    </section>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  return (
    <article className={`alert-row severity-${alert.severity}`}>
      <span className="severity-icon">
        <AlertTriangle size={18} />
      </span>
      <div>
        <strong>{alert.title}</strong>
        <span>{alert.source}</span>
      </div>
      <time>{alert.time}</time>
    </article>
  );
}

function LineChart({ title, points, unit }: { title: string; points: ChartPoint[]; unit: string }) {
  const maxValue = Math.max(...points.map((point) => point.value));
  const polylinePoints = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 96 - (point.value / maxValue) * 82;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <section className="panel chart-panel">
      <PanelHeader title={title} icon={<Waves size={19} />} />
      <div className="line-chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="flowGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.36" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline className="chart-area" points={`0,100 ${polylinePoints} 100,100`} />
          <polyline className="chart-line" points={polylinePoints} />
        </svg>
        <div className="axis-labels">
          {points.map((point) => (
            <span key={point.label}>{point.label}</span>
          ))}
        </div>
      </div>
      <div className="chart-summary">
        <strong>{points.at(-1)?.value} {unit}</strong>
        <span>Última leitura consolidada</span>
      </div>
    </section>
  );
}

function BarChart({ title, points, unit }: { title: string; points: ChartPoint[]; unit: string }) {
  const maxValue = Math.max(...points.map((point) => point.value));

  return (
    <section className="panel chart-panel">
      <PanelHeader title={title} icon={<CircleGauge size={19} />} />
      <div className="bar-chart">
        {points.map((point) => (
          <div className="bar-slot" key={point.label}>
            <span style={{ height: `${(point.value / maxValue) * 100}%` }} />
            <small>{point.label}</small>
          </div>
        ))}
      </div>
      <div className="chart-summary">
        <strong>{points.at(-1)?.value}{unit}</strong>
        <span>Produção acumulada no mês</span>
      </div>
    </section>
  );
}

function MaintenancePanel() {
  return (
    <section className="panel maintenance-panel">
      <PanelHeader title="Manutenção" icon={<ClipboardIcon />} />
      <div className="maintenance-list">
        {maintenances.map((maintenance) => (
          <MaintenanceRow key={maintenance.id} maintenance={maintenance} />
        ))}
      </div>
      <div className="repair-time">
        <span>Tempo médio de reparo</span>
        <strong>4.2h</strong>
      </div>
    </section>
  );
}

function ClipboardIcon() {
  return <Gauge size={19} />;
}

function MaintenanceRow({ maintenance }: { maintenance: Maintenance }) {
  return (
    <article className="maintenance-row">
      <span className={`status-dot status-${maintenance.status}`} />
      <div>
        <strong>{maintenance.service}</strong>
        <span>{maintenance.asset}</span>
      </div>
      <time>{maintenance.dueIn}</time>
    </article>
  );
}

function AssetTable() {
  return (
    <section className="panel table-panel">
      <PanelHeader title="Visão geral dos ativos" icon={<Droplets size={19} />} />
      <div className="asset-table" role="table" aria-label="Visão geral dos ativos hídricos">
        <div className="asset-row table-head" role="row">
          <span>Código</span>
          <span>Nome</span>
          <span>Tipo</span>
          <span>Status</span>
          <span>Vazão</span>
          <span>Última medição</span>
        </div>
        {assets.map((asset) => (
          <AssetRow key={asset.id} asset={asset} />
        ))}
      </div>
    </section>
  );
}

function AssetRow({ asset }: { asset: WaterAsset }) {
  return (
    <div className="asset-row" role="row">
      <span>{asset.id}</span>
      <strong>{asset.name}</strong>
      <span>{asset.type}</span>
      <span>
        <i className={`status-dot status-${asset.status}`} />
        {statusLabel[asset.status]}
      </span>
      <span>{asset.flowRate} m³/h</span>
      <span>{asset.lastReading}</span>
    </div>
  );
}

function PanelHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="panel-header">
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      <button type="button" aria-label={`Abrir detalhes de ${title}`}>
        <ChevronRight size={19} />
      </button>
    </div>
  );
}

export default App;
