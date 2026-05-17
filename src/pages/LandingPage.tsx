import { Activity, ArrowRight, Droplets, FileBarChart, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const heroFeatures = [
  {
    title: 'Monitoramento',
    description: 'Visão contínua da rede com alertas e leituras reais.',
    icon: Activity,
  },
  {
    title: 'Manutenção',
    description: 'Gestão de ordens e agenda de intervenções no sistema.',
    icon: Gauge,
  },
  {
    title: 'Vazão e Nível',
    description: 'Controle preciso das medições e evolução de reservatórios.',
    icon: Droplets,
  },
  {
    title: 'Inteligência',
    description: 'Relatórios e indicadores para decisões administrativas.',
    icon: FileBarChart,
  },
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
          <img className="landing-brand-logo" src="/logo.png" alt="Logo SIGHIDRO" />
          <span>
            <strong>SIGHIDRO</strong>
            <small>Gestão hídrica municipal</small>
          </span>
        </Link>
        <nav className="landing-nav" aria-label="Navegação pública">
          <a href="#features">Recursos</a>
          <a href="#overview">Visão</a>
          <Link to={appHref}>{appLabel}</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <motion.div className="landing-hero-content" initial="hidden" animate="show" variants={stagger}>
          <motion.div className="landing-logo-shell" variants={fadeUp}>
            <div className="landing-logo" aria-hidden="true">
              <img src="/logo.png" alt="Logo SIGHIDRO" className="landing-logo-image" />
            </div>
            <div className="landing-logo-label">
              <strong>SIGHIDRO</strong>
              <span>Sistema integrado de gestão hídrica</span>
              <small>do SAAEJ de Jardim</small>
            </div>
          </motion.div>

          <motion.p className="landing-hero-description" variants={fadeUp}>
            Plataforma municipal para cadastrar ativos, acompanhar vazões e níveis, priorizar manutenção e
            transformar dados em inteligência operacional.
          </motion.p>

          <motion.div className="landing-actions" variants={fadeUp}>
            <Link className="landing-primary" to={appHref}>
              {appLabel}
              <ArrowRight size={18} />
            </Link>
            <a className="landing-secondary" href="#features">
              Ver recursos
            </a>
          </motion.div>

          <motion.div className="landing-feature-grid" variants={fadeUp}>
            {heroFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="landing-feature-card">
                  <span>
                    <Icon size={22} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              );
            })}
          </motion.div>

          <motion.p className="landing-tagline" variants={fadeUp}>
            Gestão inteligente. Água para todos.
          </motion.p>
        </motion.div>
      </section>

      <motion.section
        className="landing-section landing-overview"
        id="overview"
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
    </main>
  );
}

export default LandingPage;
