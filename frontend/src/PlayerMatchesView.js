import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import './Main.css';
import './PlayerView.css';
import PlayerHeader from './components/PlayerHeader';

const GAME_MODE = {
    0: 'None', 1: 'All Pick', 2: "Captain's Mode", 3: 'Random Draft',
    4: 'Single Draft', 5: 'All Random', 6: 'Intro', 7: 'Diretide',
    8: "Reverse Captain's Mode", 9: 'The Greeviling', 10: 'Tutorial',
    11: 'Mid Only', 12: 'Least Played', 13: 'New Player Pool',
    14: 'Compendium', 15: 'Co-op vs Bots', 16: 'Captains Draft',
    18: 'Ability Draft', 20: 'All Random Deathmatch',
    21: '1v1 Mid Only',19:'Unknown', 22: 'Ranked / All Pick', 23: 'Turbo'
};

function decodeTeam(slot) {
    return (slot & 0x80) !== 0 ? 'Dire' : 'Radiant';
}

function StatsSummary({ stats }) {
    const {
        totalMatches,
        firstMatch,      // UNIX-timestamp або ISO-строка
        wins,
        losses,
    } = stats;

    const winRate = useMemo(
        () => (totalMatches ? (wins / totalMatches) * 100 : 0).toFixed(2),
        [wins, totalMatches],
    );

    // ▸ квадратні індикатори (по 50 шт, кожен ≈ 2 % прогресу)
    const filledSquares = Math.round((totalMatches / 60) * 60); // 5 000 —«умовна стеля»
    const squares = Array.from({ length: 60 });

    return (
        <div className="stats-grid">
            {/* ——— card 1 ——— */}
            <div className="stat-card">
                <div className="stat-title">
          <span className="stat-value accent">
            {totalMatches.toLocaleString('uk-UA')}
          </span>
                    матчів
                </div>

                <div className="stat-subtitle">
                    Перший матч:&nbsp;
                    {firstMatch
                        ? new Date(firstMatch).toLocaleDateString('uk-UA', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        })
                        : '—'}
                </div>

                <div className="squares-bar">
                    {squares.map((_, i) => (
                        <span
                            key={i}
                            className={`square ${i < filledSquares ? 'filled' : ''}`}
                        />
                    ))}
                </div>
            </div>

            {/* ——— card 2 ——— */}
            <div className="stat-card">
                <div className="stat-title">
                    Відсоток перемог:&nbsp;
                    <span
                        className={`stat-value ${winRate >= 50 ? 'win' : 'lose'}`}
                    >
            {winRate}%
          </span>
                </div>

                <div className="winlose-count">
                    <span className="win-count">{wins.toLocaleString('uk-UA')}</span>{' '}
                    -{' '}
                    <span className="lose-count">{losses.toLocaleString('uk-UA')}</span>
                </div>

                <div className="progress-bar">
                    <div
                        className={`progress-fill ${
                            winRate >= 50 ? 'win' : 'lose'
                        }`}
                        style={{ width: `${winRate}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

const formatDuration = secs => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatStart = dt => new Date(dt).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
});

export default function PlayerMatchesView() {
    const { accountId } = useParams();
    const navigate = useNavigate();

    // Filter state
    const [filterTurbo, setFilterTurbo] = useState(false);
    const [timeRange, setTimeRange] = useState('all_time');
    const [heroFilter, setHeroFilter] = useState('all');
    const [modeFilter, setModeFilter] = useState('all');

    // Dropdown/search state
    const [heroSearch, setHeroSearch] = useState('');
    const [modeSearch, setModeSearch] = useState('');
    const [openHero, setOpenHero] = useState(false);
    const [openMode, setOpenMode] = useState(false);
    const [openTime, setOpenTime] = useState(false);

    const { data: heroesMap = {}, isFetching: heroesLoading } = useQuery({
        queryKey: ['heroes'],
        queryFn: async () => {
            const { data } = await axios.get('/api/heroes');
            const map = {};
            data.forEach(h => map[h.hero_id] = h);
            return map;
        },
        staleTime: 1000 * 60 * 60 * 24,
    });

    const heroesList = useMemo(
        () => Object.values(heroesMap)
            .sort((a, b) => a.name_en.localeCompare(b.name_en))
            .filter(h => h.name_en.toLowerCase().includes(heroSearch.toLowerCase())),
        [heroesMap, heroSearch]
    );

    const modesList = useMemo(
        () => Object.entries(GAME_MODE)
            .map(([id, name]) => ({ id, name }))
            .filter(m => m.name.toLowerCase().includes(modeSearch.toLowerCase())),
        [modeSearch]
    );

    const { data: matches = [], isFetching: loading } = useQuery({
        queryKey: ['matches', accountId],
        queryFn: () => axios
            .get(`/api/players/${accountId}/matches?limit=5000`)
            .then(r => r.data),
        enabled: !!accountId,
        staleTime: 30_000,
    });

    // Відфільтрований масив
    const filtered = useMemo(() =>
            matches
                .filter(m => !filterTurbo || m.gameMode !== 23)
                .filter(m => {
                    if (timeRange === 'last_7_days') {
                        const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
                        return new Date(m.startTime).getTime() >= weekAgo;
                    }
                    if (timeRange === 'last_30_days') {
                        const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
                        return new Date(m.startTime).getTime() >= monthAgo;
                    }
                    return true;
                })
                .filter(m => heroFilter === 'all' || String(m.heroId) === heroFilter)
                .filter(m => modeFilter === 'all' || String(m.gameMode) === modeFilter)
        , [matches, filterTurbo, timeRange, heroFilter, modeFilter]);

    // Нова локальна статистика по відфільтрованих матчах
    const summary = useMemo(() => {
        const totalMatches = filtered.length;
        const wins         = filtered.filter(m => m.win).length;
        const losses       = totalMatches - wins;
        const firstMatch   = totalMatches
            ? filtered.reduce((earliest, m) =>
                    new Date(m.startTime).getTime() < new Date(earliest.startTime).getTime()
                        ? m
                        : earliest
                , filtered[0]).startTime
            : null;

        return { totalMatches, wins, losses, firstMatch };
    }, [filtered]);

    if (loading || heroesLoading) {
        return <div className="loading-ingest">Завантаження...</div>;
    }

    return (
        <div>
            <PlayerHeader accountId={accountId}
                          onSearchSelect={id => navigate(`/players/${id}`)}
            />

            {/* Фільтри */}
            <div className="filters-bar">
                {/* Toggle “Вилучити турбо” */}
                <label className="switch">
                    <input
                        type="checkbox"
                        checked={filterTurbo}
                        onChange={e => setFilterTurbo(e.target.checked)}
                    />
                    <span className="slider">
                    <span className="checkmark">✓</span>
                    </span>
                    <span className="label-text">Вилучити турбо</span>
                </label>

                <div className="filter-group">
                    {/* Час */}
                    <div className="filter-dropdown" tabIndex={0}>
                        <button onClick={() => setOpenTime(o => !o)} className="filter-btn">
                            {timeRange === 'all_time' ? 'Весь час'
                                : timeRange === 'last_30_days' ? '30 днів'
                                    : '7 днів'}
                            <span className="caret">▾</span>
                        </button>
                        {openTime && (
                            <ul className="dropdown-list">
                                <li onMouseDown={e => {
                                    e.preventDefault();
                                    setTimeRange('all_time');
                                    setOpenTime(false);
                                }}>Весь час
                                </li>
                                <li onMouseDown={e => {
                                    e.preventDefault();
                                    setTimeRange('last_30_days');
                                    setOpenTime(false);
                                }}>Останні 30 днів
                                </li>
                                <li onMouseDown={e => {
                                    e.preventDefault();
                                    setTimeRange('last_7_days');
                                    setOpenTime(false);
                                }}>Останні 7 днів
                                </li>
                            </ul>
                        )}
                    </div>

                    {/* Герої */}
                    <div className="filter-dropdown" tabIndex={0}>
                        <button onClick={() => setOpenHero(o => !o)} className="filter-btn">
                            {heroFilter === 'all' ? 'Всі герої' : heroesMap[heroFilter]?.name_en}
                            <span className="caret">▾</span>
                        </button>
                        {openHero && (
                            <div className="dropdown-list search-list">
                                <input
                                    type="text"
                                    placeholder="Шукати героя..."
                                    value={heroSearch}
                                    onChange={e => setHeroSearch(e.target.value)}
                                />
                                <ul>
                                    <li onMouseDown={e => {
                                        e.preventDefault();
                                        setHeroFilter('all');
                                        setOpenHero(false);
                                    }}>Всі герої
                                    </li>
                                    {heroesList.map(h => (
                                        <li
                                            key={h.hero_id}
                                            onMouseDown={e => {
                                                e.preventDefault();
                                                setHeroFilter(String(h.hero_id));
                                                setOpenHero(false);
                                            }}
                                        >
                                            {h.name_en}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Режими */}
                    <div className="filter-dropdown" tabIndex={0}>
                        <button onClick={() => setOpenMode(o => !o)} className="filter-btn">
                            {modeFilter === 'all' ? 'Всі режими' : GAME_MODE[modeFilter]}
                            <span className="caret">▾</span>
                        </button>
                        {openMode && (
                            <div className="dropdown-list search-list">
                                <input
                                    type="text"
                                    placeholder="Шукати режим..."
                                    value={modeSearch}
                                    onChange={e => setModeSearch(e.target.value)}
                                />
                                <ul>
                                    <li onMouseDown={e => {
                                        e.preventDefault();
                                        setModeFilter('all');
                                        setOpenMode(false);
                                    }}>Всі режими
                                    </li>
                                    {modesList.map(m => (
                                        <li
                                            key={m.id}
                                            onMouseDown={e => {
                                                e.preventDefault();
                                                setModeFilter(m.id);
                                                setOpenMode(false);
                                            }}
                                        >
                                            {m.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <StatsSummary stats={summary} />

            <div className="player-view">
                <div className="left-column">
                    <h2 className="matches-title">Усі матчі</h2>
                    <ul className="match-list">
                        {filtered.map(m => {
                            const hero = heroesMap[m.heroId] || {};
                            const portrait = hero.img_portrait || hero.imgPortrait || '';
                            const nameLoc = hero.name_en || 'Hero';
                            const modeName = GAME_MODE[m.gameMode] ?? '—';

                            return (
                                <li
                                    key={m.matchId}
                                    className="match-item clickable"
                                    onClick={() => navigate(`/matches/${m.matchId}`)}
                                >
                                    <div className="match-hero">
                                        <img src={`https://cdn.cloudflare.steamstatic.com${portrait}`} alt={nameLoc}/>

                                    </div>
                                    <div className="match-result">
                                        <span className={m.win ? 'win' : 'lose'}>
                                            {m.win ? 'В' : 'П'}
                                        </span>
                                    </div>
                                    <div className="match-kda">{m.kills}/{m.deaths}/{m.assists}</div>
                                    <div className="match-gpmxpm">
                                        <div>GPM: {m.goldPerMin}</div>
                                        <div>XPM: {m.xpPerMin}</div>
                                    </div>
                                    <div className="match-items-right">
                                        <div className="items-wrap items-inline">
                                            <div className="items-grid">
                                                {Array.from({length: 6}).map((_, idx) => {
                                                    const it = m.items?.find(i => i.slotIndex === idx);
                                                    return it ? (
                                                        <div key={idx} className="item-wrapper">
                                                            <img
                                                                className="item-icon"
                                                                src={`https://cdn.cloudflare.steamstatic.com${it.imgIcon}`}
                                                                alt={it.name}
                                                            />
                                                            <div className="item-tooltip">
                                                                <strong>{it.name}</strong><br/>{it.description}
                                                            </div>
                                                        </div>
                                                    ) : <div key={idx} className="item-empty"/>;
                                                })}
                                            </div>
                                        </div>
                                        <div className="match-time">
                                            <span className="match-mode">{modeName}</span>
                                            <span>{formatStart(m.startTime)}</span>
                                            <span className="duration">{formatDuration(m.durationSec)}</span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
}
