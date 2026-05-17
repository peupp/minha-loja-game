import { Link } from "react-router-dom";
import { useState } from "react";
import { createSession } from "../api";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const highlights = [
    { value: "3 passos", label: "para começar" },
    { value: "Ao vivo", label: "painel em tempo real" },
    { value: "100%", label: "foco em aprendizado" },
  ];

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await createSession();
      localStorage.setItem(
        `facilitator:${data.sessionId}`,
        data.facilitatorToken
      );
      window.location.href = `/facilitador?session=${data.sessionId}&token=${data.facilitatorToken}`;
    } catch {
      setError("Não foi possível criar a sessão. Verifique se a API está rodando.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <header className="landing-topbar">
        <div className="landing-brand">Minha Loja</div>
        <nav className="landing-nav">
          <a href="#como-funciona">Como funciona</a>
          <a href="#resultados">Resultados</a>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <span className="badge">Plataforma de simulação corporativa</span>
          <h1>Transforme decisões em resultado com uma experiência de jogo de negócios.</h1>
          <p className="subtitle">
            Simples de começar, fácil de acompanhar e amigável para todos os participantes.
          </p>
          <div className="landing-hero-actions">
            <button className="btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? "Criando..." : "Criar nova sessão"}
            </button>
            <Link to="/entrar">
              <button className="btn-secondary">Entrar no jogo</button>
            </Link>
          </div>
          {error && <p className="status-error">{error}</p>}
        </div>
        <div className="landing-hero-panel card">
          <h2 className="section-title">Visão geral da operação</h2>
          <p className="muted mb-1">
            Acompanhe fases, adesão das empresas e evolução de indicadores em tempo real.
          </p>
          <div className="landing-highlight-grid">
            {highlights.map((item) => (
              <div key={item.label} className="landing-highlight-item">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="landing-section">
        <div className="landing-section-header">
          <h2>Como funciona</h2>
          <p className="muted">Tudo direto ao ponto para não confundir o usuário.</p>
        </div>
        <div className="landing-results-grid">
          <article className="card">
            <h3>1. Crie a sessão</h3>
            <p className="muted">O facilitador gera a sala e compartilha o PIN.</p>
          </article>
          <article className="card">
            <h3>2. Empresas entram</h3>
            <p className="muted">Cada empresa entra com PIN e define seu plano.</p>
          </article>
          <article className="card">
            <h3>3. Veja os resultados</h3>
            <p className="muted">Acompanhe ranking e indicadores em tempo real.</p>
          </article>
        </div>
      </section>

      <section id="resultados" className="landing-section">
        <div className="landing-section-header">
          <h2>O que você acompanha</h2>
          <p className="muted">Informação essencial, sem excesso.</p>
        </div>
        <div className="landing-results-grid">
          <article className="card">
            <h3>Desempenho por empresa</h3>
            <p className="muted">EBITDA, demanda e evolução por rodada.</p>
          </article>
          <article className="card">
            <h3>Status dos planos</h3>
            <p className="muted">Veja quem enviou e avance de fase com confiança.</p>
          </article>
          <article className="card">
            <h3>Ranking final</h3>
            <p className="muted">Resultado claro para o encerramento da dinâmica.</p>
          </article>
        </div>
      </section>

      <section className="landing-cta card">
        <h2>Pronto para iniciar a próxima simulação?</h2>
        <p className="muted">
          Crie uma sessão em segundos e convide as empresas para começar.
        </p>
        <div className="landing-hero-actions">
          <button className="btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? "Criando..." : "Criar nova sessão"}
          </button>
          <Link to="/entrar">
            <button className="btn-secondary">Entrar com PIN</button>
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Minha Loja © {new Date().getFullYear()} — Simulação de varejo e estratégia.</p>
      </footer>
    </div>
  );
}
