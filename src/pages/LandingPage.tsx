import {
  Activity,
  ArrowRight,
  ClipboardList,
  Database,
  Droplets,
  FileBarChart,
  Gauge,
  LockKeyhole,
  Map,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const moduleHighlights = [
  {
    title: 'Cadastro hídrico',
    description: 'Poços, bombas, reservatórios e localidades em uma base operacional única.',
    icon: Database,
  },
  {
    title: 'Monitoramento',
    description: 'Leituras de vazão, nível, energia e status para decisão diária.',
    icon: Activity,
  },
  {
    title: 'Manutenção',
    description: 'Triagem de ativos em atenção, parados ou com intervenção técnica.',
    icon: ClipboardList,
  },
  {
    title: 'Relatórios',
    description: 'Indicadores para auditoria, prestação de contas e gestão administrativa.',
    icon: FileBarChart,
  },
];

const trustItems = [
  { label: 'Acesso protegido', icon: LockKeyhole },
  { label: 'Perfil administrador', icon: ShieldCheck },
  { label: 'Operação municipal', icon: Gauge },
];

function LandingPage() {
  const { isAuthenticated } = useAuth();
  const appHref = isAuthenticated ? '/dashboard' : '/login';
  const appLabel = isAuthenticated ? 'Abrir painel' : 'Entrar no sistema';

  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="SIGHIDRO">
          <span className="brand-mark" aria-hidden="true">
            <Droplets size={24} />
          </span>
          <span>
            <strong>SIGHIDRO</strong>
            <small>Gestão hídrica municipal</small>
          </span>
        </Link>
        <nav className="landing-nav" aria-label="Navegação pública">
          <a href="#modulos">Módulos</a>
          <a href="#operacao">Operação</a>
          <Link to={appHref}>{appLabel}</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <OperationalScene />
        <div className="landing-hero-content">
          <span className="landing-eyebrow">ERP hídrico para SAAE e gestão pública</span>
          <h1>SIGHIDRO</h1>
          <p>
            Controle institucional para cadastrar ativos, acompanhar a rede, priorizar manutenção
            e consolidar indicadores do abastecimento municipal.
          </p>
          <div className="landing-actions">
            <Link className="landing-primary" to={appHref}>
              {appLabel}
              <ArrowRight size={18} />
            </Link>
            <a className="landing-secondary" href="#modulos">
              Conhecer módulos
            </a>
          </div>
          <div className="landing-trust" aria-label="Recursos institucionais">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <span key={item.label}>
                  <Icon size={16} />
                  {item.label}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-section landing-overview" id="operacao">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">Centro de controle</span>
          <h2>Uma visão objetiva da operação hídrica.</h2>
        </div>
        <div className="landing-metrics" aria-label="Resumo operacional do sistema">
          <article>
            <strong>24h</strong>
            <span>registro contínuo de leituras e ocorrências</span>
          </article>
          <article>
            <strong>4</strong>
            <span>classes de ativos hídricos organizadas</span>
          </article>
          <article>
            <strong>1</strong>
            <span>base única para operação, manutenção e relatórios</span>
          </article>
        </div>
      </section>

      <section className="landing-section" id="modulos">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">Estrutura do sistema</span>
          <h2>Módulos essenciais para uma rotina administrativa enxuta.</h2>
        </div>
        <div className="landing-modules">
          {moduleHighlights.map((module) => {
            const Icon = module.icon;
            return (
              <article key={module.title}>
                <span>
                  <Icon size={22} />
                </span>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-section landing-cta">
        <div>
          <span className="landing-eyebrow">Acesso administrativo</span>
          <h2>Entre com o usuário oficial e comece a operar o SIGHIDRO.</h2>
        </div>
        <Link className="landing-primary" to={appHref}>
          {appLabel}
          <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}

function OperationalScene() {
  return (
    <div className="landing-scene" aria-hidden="true">
      <div className="landing-scene-grid" />
      <div className="landing-network network-a" />
      <div className="landing-network network-b" />
      <div className="landing-network network-c" />
      <span className="landing-node node-a" />
      <span className="landing-node node-b" />
      <span className="landing-node node-c" />
      <span className="landing-node node-d" />
      <div className="landing-watermark">
        <Waves size={34} />
        <span>Rede municipal</span>
      </div>
      <div className="landing-telemetry telemetry-a">
        <small>Vazão cadastrada</small>
        <strong>227 m³/h</strong>
      </div>
      <div className="landing-telemetry telemetry-b">
        <small>Reservatório médio</small>
        <strong>86%</strong>
      </div>
      <div className="landing-map-label label-a">Brejinho</div>
      <div className="landing-map-label label-b">Jardim Centro</div>
    </div>
  );
}

export default LandingPage;
