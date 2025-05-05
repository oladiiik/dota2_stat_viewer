// App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavigationBar from './components/NavigationBar';  // ← Імпорт
import HomePage from './pages/HomePage';
import PlayerView from './PlayerView';
import MatchView from './MatchView';
import PlayerMatchesView from './PlayerMatchesView';
import HeroesPage from './pages/HeroesPage';
import PlayersPage from './pages/PlayersPage';
import MatchesPage from './pages/MatchesPage';
export default function App() {
    return (
        <Router>
            {/* Навігаційна панель буде показуватись над усім */}
            <NavigationBar />

            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/heroes" element={<HeroesPage />} />
                <Route path="/players" element={<PlayersPage />} />
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/players/:accountId" element={<PlayerView />} />
                <Route path="/matches/:matchId" element={<MatchView />} />
                <Route path="/players/:accountId/matches" element={<PlayerMatchesView />} />
            </Routes>
        </Router>
    );
}
