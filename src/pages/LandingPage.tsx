import {
  ArrowRight,
  BarChart3,
  Droplets,
  Gauge,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

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

  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="SIGHIDRO">
          <img className="landing-brand-logo" src="/logo.png" alt="Logo SIGHIDRO" />
          <div>
            <strong>SIGHIDRO</strong>
            <small>Sistema Integrado de Gestão Hídrica</small>
          </div>
        </Link>

        <nav className="landing-nav" aria-label="Navegação pública">
          <a href="#features">Funcionalidades</a>
          <a href="#dashboard">Painel</a>
          <Link className="landing-nav-cta" to={appHref}>
            Acessar Sistema
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <motion.div className="landing-hero-copy" initial="hidden" animate="show" variants={stagger}>
          <motion.span className="landing-eyebrow" variants={fadeUp}>
            SIGHIDRO
          </motion.span>
          <motion.h1 className="landing-title" variants={fadeUp}>
            Sistema Integrado de Gestão Hídrica
          </motion.h1>
          <motion.p className="landing-description" variants={fadeUp}>
            Monitoramento inteligente de poços, bombas e abastecimento público do SAAEJ de Jardim.
          </motion.p>

          <motion.div className="landing-actions" variants={fadeUp}>
            <Link className="landing-primary" to={appHref}>
              Acessar Sistema
              <ArrowRight size={18} />
            </Link>
            <a className="landing-secondary" href="#dashboard">
              Painel Operacional
            </a>
          </motion.div>

          <motion.div className="landing-hero-pill" variants={fadeUp}>
            <Sparkles size={18} />
            <span>Governança pública moderna e inteligência hídrica</span>
          </motion.div>
        </motion.div>

        <motion.aside className="landing-hero-visual" initial="hidden" animate="show" variants={stagger}>
          <div className="hero-visual-header">
            <div>
              <small>Dados em tempo real</small>
              <strong>Visão integrada do abastecimento</strong>
            </div>
            <span>Operacional</span>
          </div>

          <div className="hero-visual-panel">
            <div className="hero-visual-line">
              <div>
                <small>Rede ativa</small>
                <strong>246</strong>
              </div>
              <div>
                <small>Operação segura</small>
                <strong>97%</strong>
              </div>
            </div>

            <div className="hero-visual-chart">
              <span className="chart-bar high" />
              <span className="chart-bar medium" />
              <span className="chart-bar low" />
              <span className="chart-bar medium" />
              <span className="chart-bar high" />
              <span className="chart-bar high" />
            </div>
          </div>

          <div className="hero-visual-map">
            <span className="map-marker marker-a" />
            <span className="map-marker marker-b" />
            <span className="map-marker marker-c" />
          </div>
        </motion.aside>
      </section>

      <section className="landing-indicators" id="features">
        <article className="indicator-card">
          <div>
            <strong>32</strong>
            <span>Poços ativos</span>
          </div>
          <small>+4 este mês</small>
        </article>
        <article className="indicator-card">
          <div>
            <strong>28</strong>
            <span>Bombas operacionais</span>
          </div>
          <small>+3 este mês</small>
        </article>
        <article className="indicator-card">
          <div>
            <strong>148 m³/h</strong>
            <span>Vazão monitorada</span>
          </div>
          <small>+12% este mês</small>
        </article>
        <article className="indicator-card">
          <div>
            <strong>97%</strong>
            <span>Ocorrências resolvidas</span>
          </div>
          <small>+8% este mês</small>
        </article>
      </section>

      <section className="landing-modules">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">Módulos do SIGHIDRO</span>
          <h2>Capacidades estratégicas para a gestão hídrica municipal</h2>
        </div>

        <div className="module-grid">
          <article className="module-card">
            <div className="module-icon">
              <Droplets size={24} />
            </div>
            <h3>Monitoramento hídrico</h3>
            <p>Acompanhe níveis de água, vazões, bombas e desempenho de poços em tempo real.</p>
          </article>

          <article className="module-card">
            <div className="module-icon">
              <Gauge size={24} />
            </div>
            <h3>Manutenção preventiva</h3>
            <p>Controle de manutenções, trocas de bombas, obras e serviços técnicos com histórico completo.</p>
          </article>

          <article className="module-card">
            <div className="module-icon">
              <BarChart3 size={24} />
            </div>
            <h3>Inteligência operacional</h3>
            <p>Indicadores e alertas automáticos para decisões mais rápidas e seguras.</p>
          </article>

          <article className="module-card">
            <div className="module-icon">
              <MapPin size={24} />
            </div>
            <h3>Georreferenciamento</h3>
            <p>Mapa interativo dos poços e estruturas com status e informações geográficas detalhadas.</p>
          </article>
        </div>
      </section>

      <section className="landing-dashboard" id="dashboard">
        <div className="dashboard-header">
          <div>
            <span className="landing-eyebrow">Painel de monitoramento</span>
            <h2>Visão integrada e estratégica do sistema hídrico municipal</h2>
          </div>
          <button className="dashboard-action">Abrir painel completo</button>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card dashboard-chart-card">
            <div className="dashboard-card-header">
              <div>
                <small>Vazão diária</small>
                <strong>Litros / hora</strong>
              </div>
              <span>+11%</span>
            </div>
            <div className="dashboard-chart">
              <span className="line-point" />
              <span className="line-point" />
              <span className="line-point" />
              <span className="line-point" />
              <span className="line-point" />
            </div>
          </article>

          <article className="dashboard-card dashboard-map-card">
            <div className="dashboard-card-header">
              <div>
                <small>Mapa operacional</small>
                <strong>SAAEJ Jardim</strong>
              </div>
              <span>Ativos</span>
            </div>
            <div className="dashboard-map"></div>
          </article>

          <article className="dashboard-card dashboard-summary-card">
            <div className="dashboard-card-header">
              <div>
                <small>Distribuição dos poços</small>
                <strong>Operação por setor</strong>
              </div>
            </div>
            <div className="summary-grid">
              <div>
                <strong>68%</strong>
                <span>Operando</span>
              </div>
              <div>
                <strong>22%</strong>
                <span>Atenção</span>
              </div>
              <div>
                <strong>10%</strong>
                <span>Parado</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <p>SAAEJ • Município de Jardim • Gestão Hídrica Inteligente</p>
      </footer>
    </main>
  );
}

export default LandingPage;
