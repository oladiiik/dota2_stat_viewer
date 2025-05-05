// src/pages/MatchesPage.jsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';  // ← новий імпорт
import './MatchesPage.css';

// Мапа режимів
const GAME_MODE = {
    0: 'None', 1: 'All Pick', 2: "Captain's Mode", 3: 'Random Draft',
    4: 'Single Draft', 5: 'All Random', 6: 'Intro', 7: 'Diretide',
    8: "Reverse Captain's Mode", 9: 'The Greeviling', 10: 'Tutorial',
    11: 'Mid Only', 12: 'Least Played', 13: 'New Player Pool',
    14: 'Compendium', 15: 'Co-op vs Bots', 16: 'Captains Draft',
    18: 'Ability Draft', 20: 'All Random Deathmatch',
    21: '1v1 Mid Only', 22: 'Ranked / All Pick', 23: 'Turbo'
};

export default function MatchesPage() {
    const navigate = useNavigate();  // ← новий хук

    const { data: matches = [], isFetching } = useQuery({
        queryKey: ['allMatches'],
        queryFn: () => axios.get('/api/matches').then(r => r.data),
        staleTime: 1000 * 60 * 5,
    });

    // Сортування за будь-яким ключем
    const [sortConfig, setSortConfig] = useState({
        key: 'startTime',
        direction: 'desc'
    });

    // Допоміжне “збагачення” і сортування
    const sorted = useMemo(() => {
        // Крок 1: enrich
        const enriched = matches.map(m => {
            const modeName   = GAME_MODE[m.gameMode] || m.gameMode;
            const winnerName = m.radiantWin ? 'Radiant' : 'Dire';
            const scoreValue = m.radiantScore - m.direScore; // для сортування
            return { ...m, modeName, winnerName, scoreValue };
        });

        // Крок 2: сортування
        const { key, direction } = sortConfig;
        enriched.sort((a, b) => {
            let aVal = a[key], bVal = b[key];
            // якщо сортуємо по даті — перетворюємо в мс
            if (key === 'startTime') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            }
            // порівняння
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return enriched;
    }, [matches, sortConfig]);

    const handleSort = key => {
        setSortConfig(prev =>
            prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'desc' }
        );
    };

    if (isFetching) {
        return <div className="loading-ingest">Завантаження матчів…</div>;
    }
    function getDurationColor(durationSec) {
        if (durationSec <= 1500) {
            return '#43b581'; // повністю зелений
        }
        if (durationSec >= 3000) {
            return '#f04747'; // повністю червоний
        }

        // інтерполяція між зеленим і червоним
        const ratio = (durationSec - 1500) / 1500; // 0 → 1
        const from = { r: 67, g: 181, b: 129 };   // зелений
        const to   = { r: 240, g: 71,  b: 71 };   // червоний

        const r = Math.round(from.r + (to.r - from.r) * ratio);
        const g = Math.round(from.g + (to.g - from.g) * ratio);
        const b = Math.round(from.b + (to.b - from.b) * ratio);

        return `rgb(${r}, ${g}, ${b})`;
    }



    return (
        <div className="page matches-page">
            <div className="section-card">
                <h2 className="matches-title">Усі матчі</h2>
                <div className="table-container">
                    <table className="matches-table">
                        <thead>
                        <tr>
                            <th onClick={() => handleSort('matchId')}>
                                ID{sortConfig.key==='matchId'&&(sortConfig.direction==='asc'?' ▲':' ▼')}
                            </th>
                            <th onClick={() => handleSort('startTime')}>
                                Дата{sortConfig.key==='startTime'&&(sortConfig.direction==='asc'?' ▲':' ▼')}
                            </th>
                            <th onClick={() => handleSort('durationSec')}>
                                Час{sortConfig.key==='durationSec'&&(sortConfig.direction==='asc'?' ▲':' ▼')}
                            </th>
                            <th onClick={() => handleSort('modeName')}>
                                Режим{sortConfig.key==='modeName'&&(sortConfig.direction==='asc'?' ▲':' ▼')}
                            </th>
                            <th onClick={() => handleSort('winnerName')}>
                                Переможець{sortConfig.key==='winnerName'&&(sortConfig.direction==='asc'?' ▲':' ▼')}
                            </th>
                            <th onClick={() => handleSort('scoreValue')}>
                                Рахунок{sortConfig.key==='scoreValue'&&(sortConfig.direction==='asc'?' ▲':' ▼')}
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {sorted.map(m => {
                            const date = new Date(m.startTime)
                                .toLocaleDateString('uk-UA', {
                                    day: '2-digit', month: '2-digit', year: 'numeric'
                                });
                            const mm = Math.floor(m.durationSec / 60);
                            const ss = String(m.durationSec % 60).padStart(2, '0');

                            return (
                                <tr
                                    key={m.matchId}
                                    onClick={() => navigate(`/matches/${m.matchId}`)}  // ← навігація
                                    style={{ cursor: 'pointer' }}                    // стрілка-покажчик
                                >
                                    <td>{m.matchId}</td>
                                    <td>{date}</td>
                                    <td style={{color: getDurationColor(m.durationSec)}}>
                                        {mm}:{ss}
                                    </td>
                                    <td>{m.modeName}</td>
                                    <td className={m.radiantWin ? 'winner win' : 'winner lose'}>
                                         {m.winnerName}
                                    </td>
                                    <td>
                                         <span className="score win">{m.radiantScore}</span>
                                         :
                                         <span className="score lose">{m.direScore}</span>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
