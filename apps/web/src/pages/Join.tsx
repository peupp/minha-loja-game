import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { joinStore } from "../api";

export default function Join() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await joinStore(pin.trim().toUpperCase(), companyName, playerName);
      localStorage.setItem(
        `store:${data.sessionId}`,
        JSON.stringify({
          storeId: data.storeId,
          storeToken: data.storeToken,
          companyName,
          playerName,
        })
      );
      navigate(`/loja?session=${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-narrow">
      <Link to="/" className="back-link">
        ← Voltar
      </Link>
      <h1 className="mt-1">Entrar no jogo</h1>
      <p className="subtitle">Uma pessoa por empresa. Use o PIN do facilitador.</p>

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>PIN da sessão</label>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.toUpperCase())}
            placeholder="Ex: ABC123"
            maxLength={6}
            required
          />
        </div>
        <div className="form-group">
          <label>Nome da empresa</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ex: Loja Norte"
            required
          />
        </div>
        <div className="form-group">
          <label>Seu nome</label>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Representante da empresa"
            required
          />
        </div>
        {error && <p className="status-error">{error}</p>}
        <button type="submit" className="btn-primary btn-block mt-1" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
