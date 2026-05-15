import {
  Activity,
  ArrowRight,
  Database,
  Droplets,
  FileBarChart,
  Gauge,
  LockKeyhole,
  Map,
  ShieldCheck,
  Signal,
  Waves,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const moduleHighlights = [
  {
    title: 'Cadastro hídrico',
    description: 'Poços, bombas, reservatórios e localidades em uma base operacional única.',
    icon: Database,
  },
  {
    title: 'Mapa operacional',
    description: 'Ativos distribuídos no território com status, rota e leitura geográfica.',
    icon: Map,
  },
  {
    title: 'Monitoramento',
    description: 'Leituras de vazão, nível, energia e status para decisão diária.',
    icon: Activity,
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

const platformSignals = [
  { label: 'Ativos sincronizados', value: '100%' },
  { label: 'Alertas críticos', value: '0' },
  { label: 'Base operacional', value: 'Única' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

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
        <motion.div
          className="landing-hero-content"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.span className="landing-eyebrow" variants={fadeUp}>
            Centro de inteligência hídrica municipal
          </motion.span>
          <motion.h1 variants={fadeUp}>SIGHIDRO</motion.h1>
          <motion.p variants={fadeUp}>
            Plataforma institucional para cadastrar ativos, acompanhar a rede, priorizar manutenção
            e consolidar indicadores críticos do abastecimento municipal.
          </motion.p>
          <motion.div className="landing-actions" variants={fadeUp}>
            <Link className="landing-primary" to={appHref}>
              {appLabel}
              <ArrowRight size={18} />
            </Link>
            <a className="landing-secondary" href="#modulos">
              Conhecer módulos
            </a>
          </motion.div>
          <motion.div className="landing-trust" aria-label="Recursos institucionais" variants={fadeUp}>
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <span key={item.label}>
                  <Icon size={16} />
                  {item.label}
                </span>
              );
            })}
          </motion.div>
          <motion.div className="landing-status-strip" aria-label="Sinais da plataforma" variants={fadeUp}>
            {platformSignals.map((signal) => (
              <article key={signal.label}>
                <strong>{signal.value}</strong>
                <span>{signal.label}</span>
              </article>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <motion.section
        className="landing-section landing-overview"
        id="operacao"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.28 }}
        variants={fadeUp}
      >
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
      </motion.section>

      <motion.section
        className="landing-section"
        id="modulos"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.24 }}
        variants={fadeUp}
      >
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
      </motion.section>

      <motion.section
        className="landing-section landing-cta"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
        variants={fadeUp}
      >
        <div>
          <span className="landing-eyebrow">Acesso administrativo</span>
          <h2>Entre com o usuário oficial e comece a operar o SIGHIDRO.</h2>
        </div>
        <Link className="landing-primary" to={appHref}>
          {appLabel}
          <ArrowRight size={18} />
        </Link>
      </motion.section>
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
      <div className="landing-scanline" />
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
      <div className="landing-telemetry telemetry-c">
        <small>Sinal da rede</small>
        <strong>
          <Signal size={17} />
          Estável
        </strong>
      </div>
      <div className="landing-route-card">
        <span />
        <div>
          <small>Rota de campo</small>
          <strong>7 ativos vistoriados</strong>
        </div>
      </div>
      <div className="landing-map-label label-a">Brejinho</div>
      <div className="landing-map-label label-b">Jardim Centro</div>
    </div>
  );
}

export default LandingPage;
