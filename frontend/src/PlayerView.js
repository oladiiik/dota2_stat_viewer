import React, {useEffect, useMemo, useState} from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
    const isDire = (slot & 0x80) !== 0;
    return isDire ? 'Dire' : 'Radiant';
}
function StatsSummary({ stats }) {
    const {
        totalMatches,
        firstMatch,
        wins,
        losses,
    } = stats;

    const winRate = useMemo(
        () => (totalMatches ? (wins / totalMatches) * 100 : 0).toFixed(2),
        [wins, totalMatches],
    );

    const filledSquares = Math.round((totalMatches / 60) * 60);
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


function TeamWidget({ mates }) {
    if (!mates?.length) return null;

    const getWinColor = pct =>
        pct >= 50
            ? `hsl(${120 - (pct - 50) * 2.4} 55% 45%)`
            : `hsl(${0 + pct * 1.2} 70% 45%)`;

    const maxGames = Math.max(...mates.map(m => m.games));

    return (
        <div className="team-widget">
            <div className="team-header">
                <h2 className="matches-title">Команда</h2>
                <span className="team-total">
          {maxGames.toLocaleString('uk-UA')} ігор&nbsp;
        </span>
            </div>

            <ul className="team-list">
                {mates.map(m => {
                    const winrate = (m.wins / m.games) * 100;
                    const winBarW = `${winrate.toFixed(1)}%`;
                    const gamesBarW = `${(m.games / maxGames) * 100}%`;

                    return (
                        <li key={m.accountId}>
                            <Link to={`/players/${m.accountId}`} className="team-item">
                                <img src={m.avatar} alt={m.name} className="team-avatar" />

                                <div className="team-name" title={m.name}>{m.name}</div>

                                <div className="team-winrate">
                                    {winrate.toFixed(1)}%
                                    <div className="team-bar">
                                        <div
                                            className="bar-fill"
                                            style={{ width: winBarW, background: getWinColor(winrate) }}
                                        />
                                    </div>
                                </div>

                                <div className="team-games">
                                    {m.games}
                                    <div className="team-bar">
                                        <div
                                            className="bar-fill"
                                            style={{ width: gamesBarW }}
                                        />
                                    </div>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
export default function PlayerView() {
    const { accountId } = useParams();
    const navigate = useNavigate();

    const [loadingIngest, setLoadingIngest] = useState(false);

    const {
        data: heroesMap = {},
        isFetching: heroesLoading,
    } = useQuery({
        queryKey: ['heroes'],
        queryFn: async () => {
            const { data } = await axios.get('/api/heroes');
            const map = {};
            data.forEach(h => (map[h.hero_id] = h));
            return map;
        },
        staleTime: 1000 * 60 * 60 * 24,   // кеш добу
    });

    const {
        data: matches = [],
        isFetching: loading,
        refetch: refetchMatches,   //  ← додаємо
    } = useQuery({
        queryKey: ['matches', accountId],
        queryFn : () =>
            axios
                .get(`/api/players/${accountId}/matches?limit=5000`)
                .then(r => r.data),
        enabled: !!accountId,
        staleTime: 15_000,
        refetchInterval: 30_000,
    });

    const { data: stats, isPending: statsLoading,refetch: refetchStats } = useQuery({
        queryKey: ['stats', accountId],
        queryFn: () => axios
            .get(`/api/players/${accountId}/stats?limit=5000`)
            .then(r => r.data),
        enabled: !!accountId,
    });

    const ingestAllMatches = async () => {
        if (loadingIngest) return;
        setLoadingIngest(true);
        try {
            await axios.post(`/api/admin/ingest/full/${accountId}`);
            // перший рефетч одразу
            await Promise.all([
                         refetchMatches(),
                         refetchStats()
                       ]);
        } finally {
            setLoadingIngest(false);
        }
    };
    useEffect(() => {
        if (!accountId || loadingIngest) return;

        const intervalId = setInterval(() => {
            console.log('Auto-ingest triggered');
            setLoadingIngest(true);
            axios.post(`/api/admin/ingest/${accountId}?limit=20`)
                .then(() => Promise.all([
                    axios.get(`/api/players/${accountId}/matches?limit=5000`),
                    axios.get(`/api/players/${accountId}/stats?limit=5000`)
                ]))
                .then(() => {
                    refetchMatches();
                    refetchStats();
                })
                .catch(console.error)
                .finally(() => setLoadingIngest(false));
        }, 10 * 60 * 1000); // 10 хвилин

        return () => clearInterval(intervalId);
    }, [accountId, loadingIngest, refetchMatches, refetchStats]);

    // Автоінжест якщо немає матчів
    useEffect(() => {
        if (!accountId || loading || loadingIngest) return;
        if (matches.length < 100) {
            setLoadingIngest(true);
            axios.post(`/api/admin/ingest/${accountId}?limit=200`)
                .then(() => Promise.all([
                    axios.get(`/api/players/${accountId}/matches?limit=5000`),
                    axios.get(`/api/players/${accountId}/stats?limit=5000`)
                ]))
                .then(() => {
                    refetchMatches();
                    refetchStats();
                })
                .catch(console.error)
                .finally(() => setLoadingIngest(false));
        }
    }, [accountId, matches, loading, loadingIngest, refetchMatches, refetchStats]);

    const formatDuration = secs => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const formatStart = dt => new Date(dt).toLocaleString('uk-UA', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    function getKdaColor(avgKills, avgDeaths, avgAssists) {
        if (avgDeaths === 0) avgDeaths = 1;
        const kdaRatio = (avgKills + avgAssists) / avgDeaths;
        if (kdaRatio < 2) return '#e74c3c';
        if (kdaRatio < 3) return '#e67e22';
        if (kdaRatio < 4) return '#f1c40f';
        return '#2ecc71';
    }

    function getWinrateGradientColor(winrate) {
        winrate = Math.max(0, Math.min(100, winrate));

        const red = { r: 231, g: 76, b: 60 };    // #e74c3c
        const yellow = { r: 241, g: 196, b: 15 }; // #f1c40f
        const green = { r: 46, g: 204, b: 113 };  // #2ecc71

        let r, g, b;

        if (winrate < 50) {
            const ratio = winrate / 50;
            r = Math.round(red.r + (yellow.r - red.r) * ratio);
            g = Math.round(red.g + (yellow.g - red.g) * ratio);
            b = Math.round(red.b + (yellow.b - red.b) * ratio);
        } else {
            const ratio = (winrate - 50) / 50;
            r = Math.round(yellow.r + (green.r - yellow.r) * ratio);
            g = Math.round(yellow.g + (green.g - yellow.g) * ratio);
            b = Math.round(yellow.b + (green.b - yellow.b) * ratio);
        }

        return `rgb(${r},${g},${b})`;
    }
    const dayKey = d => {
        const y  = d.getFullYear();
        const m  = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    };

    function getMatchesGradientColor(ratio) {
        const t = Math.min(Math.max(ratio, 0), 1);
        const r = Math.round(241 + (52 - 241) * t);
        const g = Math.round(196 + (152 - 196) * t);
        const b = Math.round(15 + (219 - 15) * t);
        return `rgb(${r}, ${g}, ${b})`;
    }

    const computeHeroStats = () => {
        const stats = {};
        matches.forEach(m => {
            if (!stats[m.heroId]) {
                stats[m.heroId] = {
                    heroId: m.heroId,
                    matches: 0,
                    wins: 0,
                    kills: 0,
                    deaths: 0,
                    assists: 0
                };
            }
            const entry = stats[m.heroId];
            entry.matches += 1;
            if (m.win) entry.wins += 1;
            entry.kills += m.kills;
            entry.deaths += m.deaths;
            entry.assists += m.assists;
        });

        return Object.values(stats)
            .sort((a, b) => b.matches - a.matches)
            .slice(0, 5);
    };

    const heroStats = computeHeroStats();

    const matchesPerDay = matches.reduce((acc, match) => {
        const date = new Date(match.startTime);
        const key  = dayKey(date);

        if (!acc[key]) {
            acc[key] = { total: 0, wins: 0, losses: 0 };
        }

        acc[key].total += 1;
        if (match.win) {
            acc[key].wins += 1;
        } else {
            acc[key].losses += 1;
        }

        return acc;
    }, {});

    // Згенерувати дні розбиті по тижнях
    const generateWeeks = () => {
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Стартувати з понеділка 14 тижнів тому
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (7 * 14));

        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }

        const weeks = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }

        return weeks;
    };

    const weeks = generateWeeks();
    const { data: mates = [] } = useQuery({
                queryKey: ['teammates', accountId],
                queryFn : () =>
                    axios.get(`/api/players/${accountId}/teammates?limit=10`)
                         .then(r => r.data),
                enabled: !!accountId,
                staleTime: 15_000,
            });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (7 * 14)); // 14 тижнів

    const activeMatches = matches.filter(m => {
        const matchDate = new Date(m.startTime);
        return matchDate >= startDate && matchDate <= today;
    });

    return (
        <div>
            <PlayerHeader
                accountId={accountId}
                onLoadAll={ingestAllMatches}
                ingestLoading={loadingIngest}
                onSearchSelect={id => navigate(`/players/${id}`)}
            />
            {loadingIngest && <div className="loading-ingest">Завантаження останніх матчів з Steam...</div>}

            {/* Головна розкладка */}
            <div className="player-view">
                {/* Ліва колонка */}
                <div className="left-column">

                                    {stats && <StatsSummary
                                       stats={{
                                         totalMatches: stats.gamesPlayed,
                                         wins:         stats.wins,
                                         losses:       stats.gamesPlayed - stats.wins,
                                         firstMatch:   stats.firstMatch
                                       }}
                                    />}

                    <div className="section-header">
                        <h2 className="matches-title">Останні матчі</h2>
                        <Link
                            to={`/players/${accountId}/matches`}
                            className="view-all-button"
                        >
                            Усі матчі ›
                        </Link>
                    </div>
                    <ul className="match-list">
                        {matches.slice(0, 10).map(m => {
                            const hero = heroesMap[m.heroId] || {};
                            const portrait = hero.img_portrait || hero.imgPortrait || '';
                            const nameLoc = hero.name_en || hero.nameLoc || 'Hero';
                            const team = decodeTeam(m.playerSlot);
                            const modeName = GAME_MODE[m.gameMode] ?? '—'

                            return (
                                <li
                                    key={m.matchId}
                                    className="match-item clickable"
                                    onClick={() => navigate(`/matches/${m.matchId}`)}
                                >
                                    <div className="match-hero">
                                        <img src={`https://cdn.cloudflare.steamstatic.com${portrait}`} alt={nameLoc}/>
                                    </div>
                                    <div className="match-result"><span
                                        className={m.win ? 'win' : 'lose'}>{m.win ? 'В' : 'П'}</span></div>
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
                                                                <strong>{it.name}</strong>
                                                                <br/>
                                                                {it.description}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div key={idx} className="item-empty"/>
                                                    );
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

                    {/* Топ 5 Героїв */}
                    <h2 className="matches-title">Топ 5 Героїв</h2>
                    <ul className="top-heroes-list">
                        {heroStats.length > 0 && (() => {
                            const maxMatches = Math.max(...heroStats.map(h => h.matches));
                            return heroStats.map(h => {
                                const hero = heroesMap[h.heroId] || {};
                                const portrait = hero.img_portrait || hero.imgPortrait || '';
                                const nameLoc = hero.name_en || 'Hero';
                                const avgKills = h.kills / h.matches;
                                const avgDeaths = h.deaths / h.matches;
                                const avgAssists = h.assists / h.matches;
                                const winrate = (h.wins / h.matches) * 100;

                                const winrateWidth = `${winrate}%`;
                                const matchesWidth = `${(h.matches / maxMatches) * 100}%`;

                                return (
                                    <li key={h.heroId} className="top-hero-item">
                                        <img
                                            src={`https://cdn.cloudflare.steamstatic.com${portrait}`}
                                            alt={nameLoc}
                                            title={nameLoc}
                                            className="top-hero-img"
                                        />
                                        <div className="top-hero-stats">
                                            <div className="top-hero-name">{nameLoc}</div>

                                            <div className="top-bar-container">
                                                <div className="top-bar-label">{winrate.toFixed(1)}%</div>
                                                <div className="top-bar">
                                                    <div
                                                        className="top-bar-fill"
                                                        style={{
                                                            width: winrateWidth,
                                                            backgroundColor: getWinrateGradientColor(winrate)
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div className="top-bar-container">
                                                <div className="top-bar-label">{h.matches}</div>
                                                <div className="top-bar">
                                                    <div
                                                        className="top-bar-fill"
                                                        style={{
                                                            width: matchesWidth,
                                                            backgroundColor: getMatchesGradientColor(h.matches / maxMatches)
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div
                                                className="top-kda-text"
                                                style={{color: getKdaColor(avgKills, avgDeaths, avgAssists)}}
                                            >
                                                Середнє
                                                KDA: {avgKills.toFixed(1)}/{avgDeaths.toFixed(1)}/{avgAssists.toFixed(1)}
                                            </div>
                                        </div>
                                    </li>
                                );
                            });
                        })()}
                    </ul>
                </div>
                {/* Права колонка */}
                <div className="activity-panel-wrapper">
                    <div className="right-column">
                        <div className="activity-header">
                            <h2 className="matches-title">Активність</h2>
                            <span className="activity-count">{activeMatches.length} матчів</span>
                        </div>

                        {/* Контейнер для підписів і сітки */}
                        <div className="activity-wrapper">
                            <div className="weekdays">
                                {['Пн', 'Ср', 'Нд'].map((day, idx) => (
                                    <div key={idx} className="weekday-label">{day}</div>
                                ))}
                            </div>

                            <div className="activity-grid">
                                {weeks.map((week, weekIdx) => (
                                    <div key={weekIdx} className="week-column">
                                        {week.map((date, dayIdx) => {
                                            const key = dayKey(date);
                                            const dayStats = matchesPerDay[key] || {total: 0, wins: 0, losses: 0};

                                            const totalMatches = dayStats.total;
                                            const winrate = totalMatches > 0 ? Math.round((dayStats.wins / totalMatches) * 100) : 0;

                                            const color = totalMatches > 0 ? getWinrateGradientColor(winrate) : '#2f2f2f';
                                            const isToday = key === dayKey(new Date());

                                            const maxMatchesForScaling = 5;
                                            const scale = 0.4 + Math.min(totalMatches, maxMatchesForScaling) * 0.12;
                                            const clampedScale = Math.min(scale, 1.0);
                                            const daysOfWeek = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота'];
                                            const weekdayName = daysOfWeek[date.getDay()];
                                            const full = date.toLocaleDateString('uk-UA', {
                                                day: 'numeric',
                                                month: 'long'
                                            });
                                            const monthGenitive = full.replace(/^\d+\s*/, '');
                                            const dayNum = date.getDate();
                                            const formattedDate = `${weekdayName}, ${dayNum} ${monthGenitive}`;

                                            return (
                                                <div key={dayIdx} className="activity-cell-wrapper">
                                                    <div className="activity-cell-base">
                                                        {totalMatches > 0 && (
                                                            <div
                                                                className="activity-cell-colored"
                                                                style={{
                                                                    backgroundColor: color,
                                                                    transform: `scale(${clampedScale})`
                                                                }}
                                                            ></div>
                                                        )}
                                                        {isToday && <div className="today-marker"></div>}
                                                    </div>

                                                    {totalMatches > 0 && (
                                                        <div className="tooltip">
                                                            <div className="tooltip-date">
                                                                {formattedDate}
                                                            </div>
                                                            <div className="tooltip-stat">
                                                                Перемог: <span
                                                                style={{color: 'limegreen'}}>{winrate}%</span>
                                                            </div>
                                                            <div className="tooltip-stat">
                                                                Матчі: <span
                                                                style={{color: 'limegreen'}}>{dayStats.wins}</span> -
                                                                <span
                                                                    style={{color: 'crimson'}}>{dayStats.losses}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Місяці знизу! */}
                        <div className="months">
                            {weeks.map((week, weekIdx) => {
                                const firstDay = week[0];
                                const isFirstOfMonth = firstDay.getDate() <= 7;

                                return (
                                    <div key={weekIdx} className="month-label">
                                        {isFirstOfMonth ? firstDay.toLocaleDateString('uk-UA', {month: 'short'}) : ''}
                                    </div>
                                );
                            })}
                        </div>

                        <TeamWidget mates={mates}/>
                    </div>
                </div>
                </div>
            </div>
            )
            ;
            }
