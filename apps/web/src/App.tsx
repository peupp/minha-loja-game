import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Join from "./pages/Join";
import StorePage from "./pages/StorePage";
import FacilitatorPage from "./pages/FacilitatorPage";
import DisplayPage from "./pages/DisplayPage";
import QuizPage from "./pages/QuizPage";
import RankingPage from "./pages/RankingPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/entrar" element={<Join />} />
      <Route path="/loja" element={<StorePage />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/facilitador" element={<FacilitatorPage />} />
      <Route path="/telao" element={<DisplayPage />} />
      <Route path="/ranking" element={<RankingPage />} />
    </Routes>
  );
}
