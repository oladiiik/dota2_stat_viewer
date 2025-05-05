import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import './MatchView.css';
const MODE_LABEL = {
    0: 'None', 1: 'All Pick', 2: "Captain's Mode", 3: 'Random Draft',
    4: 'Single Draft', 5: 'All Random', 6: 'Intro', 7: 'Diretide',
    8: "Reverse Captain's Mode", 9: 'The Greeviling', 10: 'Tutorial',
    11: 'Mid Only', 12: 'Least Played', 13: 'New Player Pool',
    14: 'Compendium', 15: 'Co-op vs Bots', 16: 'Captains Draft',
    18: 'Ability Draft', 20: 'All Random Deathmatch',
    21: '1v1 Mid Only',19:'Unknown', 22: 'Ranked / All Pick', 23: 'Turbo'
};

const RADIANT_ICON = 'https://cdn.stratz.com/images/dota2/radiant_square.png';
const DIRE_ICON    = 'https://cdn.stratz.com/images/dota2/dire_square.png';

export default function MatchView() {
    const { matchId } = useParams();
    const navigate    = useNavigate();

    const [match,  setMatch]  = useState(null);
    const [heroes, setHeroes] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            axios.get(`/api/matches/${matchId}`),
            axios.get('/api/heroes'),
        ])
            .then(([mRes, hRes]) => {
                setMatch(mRes.data);
                const map = {};
                hRes.data.forEach(h => (map[h.hero_id] = h));
                setHeroes(map);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [matchId]);

    if (loading) return <div className="loading">Завантаження…</div>;
    if (!match)   return <div className="error">Матч не знайдено.</div>;

    /* ───── розрахунки ───── */
    const {
        players = [],
        radiantWin,
        radiant_score,
        dire_score,
        startTime,
        durationSec,
        game_mode,
    } = match;
    /* ─── день/ніч у Dota 2: перша фаза — ніч, потім міняється кожні 5 хв  */
    const phaseIdx   = Math.floor(match.durationSec / 300);   // 0‒299 c, 300‒599 c …
    const isNight    = phaseIdx % 2 === 0;                    // парні індекси — день
    const phaseIcon  = isNight ? '🌞' : '🌙';
    const phaseLabel = isNight ? 'День'  : 'Ніч';
    const radiantCap = players.filter(p => p.radiant)
        .reduce((s,p)=>s+p.net_worth,0);
    const direCap    = players.filter(p => !p.radiant)
        .reduce((s,p)=>s+p.net_worth,0);

    const modeTitle  = MODE_LABEL[game_mode] ?? 'Unknown';

    /* ───── render ───── */
    return (
        <div className="match-view-container">

            {/* ───────── HEADER ───────── */}
            <header className="match-topbar">

                {/* Radiant */}
                <div className="team-box radiant">
                    <img className="team-logo" src={RADIANT_ICON} alt="Radiant"/>
                    <div className="team-name">Сяйво</div>
                    <span className={`team-result ${radiantWin ? 'win' : 'lose'}`}>
            {radiantWin ? 'Перемога' : 'Поразка'}
          </span>
                    <div className="team-cap">💰 {radiantCap.toLocaleString()}</div>
                </div>

                {/* Center score block */}
                <div className="score-box">
                <div className="score-stat">
                    <span className="score-num">{radiant_score}</span>
                    <span className="score-icon" title={phaseLabel}>{phaseIcon}</span>
                    <span className="score-num">{dire_score}</span>
                </div>
                <div className="score-info">
                    <div className="match-time">{Math.floor(durationSec/60)}:{String(durationSec%60).padStart(2,'0')}</div>
                    <div className="match-mode">{modeTitle}</div>
                    <div className="match-datetime">
                        {dayjs(startTime).format('D MMM YYYY, HH:mm')}
                    </div>
                </div>
                </div>

                {/* Dire */}
                <div className="team-box dire">
                    <img className="team-logo" src={DIRE_ICON} alt="Dire"/>
                    <div className="team-name">Пітьма</div>
                    <span className={`team-result ${!radiantWin ? 'win' : 'lose'}`}>
            {!radiantWin ? 'Перемога' : 'Поразка'}
          </span>
                    <div className="team-cap">💰 {direCap.toLocaleString()}</div>
                </div>

            </header>

            {/* ───────── PLAYER CARDS ───────── */}
            <div className="opposition-grid">
                <div className="team-column">
                    {players.filter(p => p.radiant).map(p =>
                        <PlayerCard key={p.id} hero={heroes[p.heroId]} player={p} isRadiant />
                    )}
                </div>

                <div className="vs-column">VS</div>

                <div className="team-column">
                    {players.filter(p => !p.radiant).map(p =>
                        <PlayerCard key={p.id} hero={heroes[p.heroId]} player={p} />
                    )}
                </div>
            </div>
        </div>
    );
}
/** Показує рівень у вигляді числа + кругового прогресу (1‒30). */
function LevelBadge({ level }) {
    const pct = Math.min(level, 30) / 30;             // 0‒1
    const deg = pct * 360;                            // 0‒360°
    const style = {
        background: `conic-gradient(#4cc26e ${deg}deg, #2b2b2b 0deg)`,
    };
    return (
        <div className="level-badge" style={style}>
            <span>{level}</span>
        </div>
    );
}

function PlayerCard({ player, hero, isRadiant }) {
    return (
        <div className={`player-card ${isRadiant ? 'radiant' : 'dire'}`}>
            <div className="player-header playerHeader">
                 {/* блок з авою та ім’ям героя/акаунта (зліва) */}
                 <div className="player-info">
                     <div className="hero-portrait">
                         <img src={`https://cdn.cloudflare.steamstatic.com${hero?.img_portrait}`} alt={hero?.name_loc}/>
                         {player.networthDelta > 0 && (
                             <div className="networth-delta">+{player.networthDelta}</div>
                         )}
                     </div>
                     <div className="info-text">
                         <div className="player-hero-name">{hero?.name_loc || hero?.name_en}</div>
                         <div className="player-account">{player.accountName}</div>
                     </div>
                 </div>

                {/* бейдж рівня тепер окремим елементом справа */}
                <LevelBadge level={player.level}/>
            </div>
            <div className="player-stats">
                <div className="stat-item">
                    <div className="stat-label">В / С / П</div>
                    <div className="stat-value">
                        {player.kills} / {player.deaths} / {player.assists}
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">ЗЗХ / ДЗХ</div>
                    <div className="stat-value">
                        {player.gpm} / {player.xpm}
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">Капітал</div>
                    <div className="stat-value">{player.net_worth}</div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">ШГ / ШБ / ЛГ</div>
                    <div
                        className="stat-value">{player.hero_damage} / {player.tower_damage} / {player.hero_healing}</div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">ОУ / ДК</div>
                    <div className="stat-value">
                        {player.last_hits} / {player.denies}
                    </div>
                </div>
            </div>
            {/* ─── ITEMS ─── */}
            <div className="items-wrap">
                <div className="items-grid">
                    {Array.from({length: 6}).map((_, idx) => {
                        const it = player.items?.find(i => i.slotIndex === idx);
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
        </div>
    );
}
