import {
  Activity,
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  Droplets,
  Gauge,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Waves,
  Wrench,
} from 'lucide-react';
import { useEffect } from 'react';
import type { LatLngExpression } from 'leaflet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useAuth } from '../AuthContext';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const navLinks = [
  { label: 'Início', href: '#inicio' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Funcionalidades', href: '#funcionalidades' },
  { label: 'Painel', href: '#painel' },
  { label: 'Contato', href: '#contato' },
];

const indicators = [
  {
    label: 'Poços ativos',
    value: '32',
    delta: '+4 este mês',
    icon: Droplets,
    tone: 'cyan',
    spark: 'M2 33 L18 25 L30 28 L45 18 L61 24 L78 12',
  },
  {
    label: 'Bombas operacionais',
    value: '28',
    delta: '+3 este mês',
    icon: Gauge,
    tone: 'green',
    spark: 'M2 34 L18 27 L31 19 L46 24 L61 14 L78 3',
  },
  {
    label: 'Vazão monitorada',
    value: '148 mil L/h',
    delta: '+12% este mês',
    icon: Waves,
    tone: 'blue',
    spark: 'M2 35 L17 27 L32 30 L47 18 L62 24 L78 9',
  },
  {
    label: 'Ocorrências resolvidas',
    value: '97%',
    delta: '+8% este mês',
    icon: ShieldCheck,
    tone: 'green',
    spark: 'M2 35 L18 29 L31 22 L47 26 L62 16 L78 6',
  },
];

const modules = [
  {
    title: 'Monitoramento hídrico',
    description: 'Acompanhe níveis de água, vazões, horas de funcionamento e produção dos poços em tempo real.',
    icon: Droplets,
    tone: 'blue',
  },
  {
    title: 'Manutenção preventiva',
    description: 'Controle de manutenções, trocas de bombas, cordas, cabos e serviços técnicos com histórico completo.',
    icon: Wrench,
    tone: 'green',
  },
  {
    title: 'Inteligência operacional',
    description: 'Indicadores inteligentes, alertas automáticos e análises para melhor tomada de decisão.',
    icon: BarChart3,
    tone: 'cyan',
  },
  {
    title: 'Georreferenciamento',
    description: 'Mapa interativo dos poços e estruturas com status operacional e informações geográficas detalhadas.',
    icon: MapPin,
    tone: 'emerald',
  },
];

const governanceItems = [
  {
    title: 'Transparência',
    description: 'Dados confiáveis e acessíveis',
    icon: Activity,
  },
  {
    title: 'Eficiência',
    description: 'Processos otimizados e monitorados',
    icon: ClipboardCheck,
  },
  {
    title: 'Planejamento',
    description: 'Decisões baseadas em dados',
    icon: BarChart3,
  },
  {
    title: 'Segurança hídrica',
    description: 'Abastecimento seguro para todos',
    icon: ShieldCheck,
  },
];

const sidebarItems = [
  'Dashboard',
  'Poços',
  'Bombas',
  'Vazões',
  'Manutenções',
  'Ocorrências',
  'Relatórios',
  'Mapa',
  'Configurações',
];

const referenceMapPoints = [
  { id: 'brejinho', label: 'POC-001', position: [-7.5748, -39.3042] as LatLngExpression, status: 'operando' },
  { id: 'serra-boa', label: 'POC-014', position: [-7.6119, -39.2533] as LatLngExpression, status: 'operando' },
  { id: 'centro', label: 'LOC-001', position: [-7.576, -39.2826] as LatLngExpression, status: 'operando' },
  { id: 'sao-francisco', label: 'RES-003', position: [-7.5632, -39.2684] as LatLngExpression, status: 'atenção' },
  { id: 'estacao-centro', label: 'BMB-012', position: [-7.5812, -39.282] as LatLngExpression, status: 'parado' },
];

const referenceMapLine = referenceMapPoints.map((point) => point.position);

const referenceMapStatusColor: Record<string, string> = {
  operando: '#27d66f',
  atenção: '#f4c245',
  parado: '#ef684d',
};

function LandingPage() {
  const { isAuthenticated } = useAuth();
  const appHref = isAuthenticated ? '/dashboard' : '/login';

  return (
    <main className="landing-page reference-landing">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="Página inicial do SIGHIDRO">
          <img className="landing-brand-logo" src="/logo.png" alt="Logo SIGHIDRO" />
          <div>
            <strong>SIGHIDRO</strong>
            <small>Sistema Integrado de Gestão Hídrica</small>
          </div>
        </Link>

        <nav className="landing-nav" aria-label="Navegação pública">
          {navLinks.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
          <Link className="landing-nav-cta" to={appHref}>
            Acessar Sistema
          </Link>
        </nav>
      </header>

      <section className="reference-hero" id="inicio">
        <div className="reference-hero-media" aria-hidden="true">
          <img src="/sighidro-hero.png" alt="" />
          <div className="reference-hero-vignette" />
          <div className="reference-hud-panel hud-left">
            <span>Vazão atual</span>
            <strong>148 mil L/h</strong>
            <div className="hud-bars">
              {[74, 58, 38, 64, 63, 86].map((height, index) => (
                <i key={`bar-${index}`} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
          <div className="reference-hud-panel hud-right">
            <span>Nível de água</span>
            <strong>18,6 m</strong>
            <MiniSparkline path="M2 28 L13 23 L25 25 L36 17 L48 22 L60 11 L72 16 L84 8" />
          </div>
          <div className="reference-hud-ring">
            <Droplets size={44} />
          </div>
        </div>

        <motion.div className="reference-hero-copy" initial="hidden" animate="show" variants={stagger}>
          <motion.h1 variants={fadeUp}>SIGHIDRO</motion.h1>
          <motion.h2 variants={fadeUp}>Sistema Integrado de Gestão Hídrica</motion.h2>
          <motion.p variants={fadeUp}>
            Monitoramento inteligente de poços, bombas e abastecimento público do SAAEJ de Jardim.
          </motion.p>

          <motion.div className="reference-hero-actions" variants={fadeUp}>
            <Link className="reference-primary-button" to={appHref}>
              <LockKeyhole size={17} />
              Acessar Sistema
            </Link>
            <a className="reference-secondary-button" href="#painel">
              <BarChart3 size={17} />
              Painel Operacional
            </a>
          </motion.div>
        </motion.div>
      </section>

      <section className="reference-indicators" id="sobre" aria-label="Indicadores operacionais">
        {indicators.map((indicator) => (
          <IndicatorCard key={indicator.label} indicator={indicator} />
        ))}
      </section>

      <section className="reference-modules" id="funcionalidades">
        <div className="reference-section-heading">
          <h2>
            Módulos do <span>SIGHIDRO</span>
          </h2>
          <i />
        </div>

        <div className="reference-module-grid">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <motion.article
                className={`reference-module-card module-${module.tone}`}
                key={module.title}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.18 }}
              >
                <span className="reference-module-icon">
                  <Icon size={40} />
                </span>
                <div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                  <a href="#painel">
                    Saiba mais
                    <ArrowRight size={15} />
                  </a>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="reference-monitoring" id="painel">
        <header>
          <h2>Painel de monitoramento</h2>
          <p>Visão integrada e estratégica do sistema hídrico municipal.</p>
        </header>

        <div className="reference-console">
          <aside className="reference-sidebar" aria-label="Menu do painel demonstrativo">
            {sidebarItems.map((item, index) => (
              <span className={index === 0 ? 'active' : ''} key={item}>
                <i />
                {item}
              </span>
            ))}
          </aside>

          <article className="reference-console-card reference-line-card">
            <span>Vazão diária (litros/hora)</span>
            <FlowChart />
          </article>

          <article className="reference-console-card reference-donut-card">
            <span>Distribuição dos poços</span>
            <div className="reference-donut-wrap">
              <div className="reference-donut" />
              <div className="reference-donut-legend">
                <span><i className="operando" />Operando 28 (70%)</span>
                <span><i className="atencao" />Atenção 7 (18%)</span>
                <span><i className="parado" />Parado 5 (12%)</span>
              </div>
            </div>
          </article>

          <article className="reference-console-card reference-map-card">
            <span>Mapa operacional</span>
            <ReferenceMapPreview />
          </article>
        </div>
      </section>

      <section className="reference-governance" id="contato">
        <div className="reference-governance-summary">
          <ShieldCheck size={86} />
          <p>
            O SIGHIDRO fortalece a governança hídrica municipal através da rastreabilidade operacional,
            transparência administrativa e inteligência de dados aplicada ao abastecimento público.
          </p>
        </div>

        <div className="reference-governance-grid">
          {governanceItems.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title}>
                <Icon size={31} />
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="reference-footer">
        <div className="reference-saaej">
          <strong>SAAEJ</strong>
          <span>Serviço Autônomo de Água e Esgoto de Jardim</span>
        </div>
        <div className="reference-footer-title">
          <strong>SIGHIDRO - Sistema Integrado de Gestão Hídrica</strong>
          <span>SAAEJ • Município de Jardim • Gestão Hídrica Inteligente</span>
        </div>
        <small>© 2026 SAAEJ. Todos os direitos reservados.</small>
      </footer>
    </main>
  );
}

function ReferenceMapPreview() {
  return (
    <div className="reference-map reference-real-map" aria-label="Mapa operacional demonstrativo">
      <MapContainer
        attributionControl
        boxZoom={false}
        center={[-7.584, -39.281]}
        className="reference-leaflet-map"
        doubleClickZoom={false}
        dragging={false}
        keyboard={false}
        scrollWheelZoom={false}
        touchZoom={false}
        zoom={13}
        zoomControl={false}
      >
        <ReferenceMapSizer />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline pathOptions={{ color: '#1fe5ef', opacity: 0.78, weight: 4 }} positions={referenceMapLine} />
        {referenceMapPoints.map((point) => (
          <CircleMarker
            center={point.position}
            fillColor={referenceMapStatusColor[point.status]}
            fillOpacity={0.96}
            key={point.id}
            pathOptions={{ color: '#021326', weight: 2 }}
            radius={7}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
              {point.label}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="reference-map-legend">
        <span><i className="operando" />Operando</span>
        <span><i className="atencao" />Atenção</span>
        <span><i className="parado" />Parado</span>
      </div>
    </div>
  );
}

function ReferenceMapSizer() {
  const map = useMap();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    return () => window.cancelAnimationFrame(frame);
  }, [map]);

  return null;
}

function IndicatorCard({
  indicator,
}: {
  indicator: (typeof indicators)[number];
}) {
  const Icon = indicator.icon;

  return (
    <motion.article
      className={`reference-kpi-card kpi-${indicator.tone}`}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      variants={fadeUp}
    >
      <span className="reference-kpi-icon">
        <Icon size={40} />
      </span>
      <div>
        <span>{indicator.label}</span>
        <strong>{indicator.value}</strong>
        <small>{indicator.delta}</small>
      </div>
      <MiniSparkline path={indicator.spark} />
    </motion.article>
  );
}

function MiniSparkline({ path }: { path: string }) {
  return (
    <svg className="reference-sparkline" viewBox="0 0 80 40" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function FlowChart() {
  return (
    <div className="reference-flow-chart" aria-hidden="true">
      <svg viewBox="0 0 520 208" preserveAspectRatio="none">
        <defs>
          <linearGradient id="referenceFlowArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="flow-area"
          d="M0 176 L35 142 L70 118 L105 96 L140 134 L175 112 L210 76 L245 42 L280 98 L315 126 L350 88 L385 116 L420 122 L455 54 L490 44 L520 18 L520 208 L0 208 Z"
        />
        <path
          className="flow-line"
          d="M0 176 L35 142 L70 118 L105 96 L140 134 L175 112 L210 76 L245 42 L280 98 L315 126 L350 88 L385 116 L420 122 L455 54 L490 44 L520 18"
        />
      </svg>
      <div className="reference-flow-axis">
        {['01', '05', '10', '15', '20', '25', '30'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
    </div>
  );
}

export default LandingPage;
