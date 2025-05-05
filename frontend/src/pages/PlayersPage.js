// src/pages/PlayersPage.jsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';  // ← Додали
import './PlayersPage.css';

export default function PlayersPage() {
    const navigate = useNavigate();               // ← Хук для навігації

    const { data: players = [], isFetching } = useQuery({
        queryKey: ['playersList'],
        queryFn: () => axios.get('/api/players').then(res => res.data),
        staleTime: 1000 * 60 * 5,
    });

    const [sortConfig, setSortConfig] = useState({
        key: 'games_played',
        direction: 'desc',
    });

    const sortedPlayers = useMemo(() => {
        const arr = [...players];
        const { key, direction } = sortConfig;

        arr.sort((a, b) => {
            if (key === 'personaname') {
                const cmp = a.personaname.localeCompare(b.personaname);
                return direction === 'asc' ? cmp : -cmp;
            }
            const aVal = a[key] ?? 0;
            const bVal = b[key] ?? 0;
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return arr;
    }, [players, sortConfig]);

    const handleSort = key => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key
                ? (prev.direction === 'asc' ? 'desc' : 'asc')
                : 'desc'
        }));
    };

    if (isFetching) {
        return <div className="loading-ingest">Завантаження списку гравців…</div>;
    }
    function getDurationColor(durationSec) {
        if (durationSec <= 1500) {
            return '#43b581'; // повністю зелений до 25 хв
        }
        if (durationSec >= 3000) {
            return '#f04747'; // повністю червоний після 50 хв
        }
        const ratio = (durationSec - 1500) / 1500; // нормалізація
        const from = { r: 67, g: 181, b: 129 };   // зелений
        const to   = { r: 240, g: 71,  b: 71 };   // червоний

        const r = Math.round(from.r + (to.r - from.r) * ratio);
        const g = Math.round(from.g + (to.g - from.g) * ratio);
        const b = Math.round(from.b + (to.b - from.b) * ratio);

        return `rgb(${r}, ${g}, ${b})`;
    }

    return (
        <div className="page players-page">
            <div className="section-card">
                <h2 className="matches-title">Список гравців</h2>
                <div className="table-container">
                    <table className="player-table">
                        <thead>
                        <tr>
                            <th>Аватар</th>
                            <th onClick={() => handleSort('personaname')}>
                                Нікнейм
                                {sortConfig.key === 'personaname' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th onClick={() => handleSort('games_played')}>
                                К-ть матчів
                                {sortConfig.key === 'games_played' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th onClick={() => handleSort('win_rate')}>
                                Win %
                                {sortConfig.key === 'win_rate' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th onClick={() => handleSort('avg_kda')}>
                                K/D/A
                                {sortConfig.key === 'avg_kda' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th onClick={() => handleSort('avg_duration')}>
                                Час
                                {sortConfig.key === 'avg_duration' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th onClick={() => handleSort('avg_gpm')}>
                                ЗЗХ
                                {sortConfig.key === 'avg_gpm' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th onClick={() => handleSort('avg_xpm')}>
                                ДЗХ
                                {sortConfig.key === 'avg_xpm' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {sortedPlayers.map(p => {
                            const minutes = Math.floor(p.avg_duration / 60);
                            const seconds = String(Math.floor(p.avg_duration % 60)).padStart(2, '0');
                            return (
                                <tr
                                    key={p.account_id}
                                    onClick={() => navigate(`/players/${p.account_id}`)} // ← Тут навігація
                                    style={{cursor: 'pointer'}}                      // покажчик руки
                                >
                                    <td>
                                        <img
                                            src={p.avatarfull}
                                            alt={p.personaname}
                                            className="player-avatar"
                                        />
                                    </td>
                                    <td>{p.personaname}</td>
                                    <td>{p.games_played.toLocaleString('uk-UA')}</td>
                                    <td style={{color: p.win_rate >= 50 ? '#43b581' : '#f04747'}}>
                                        {p.win_rate.toFixed(1)}%
                                    </td>
                                    <td>{p.avg_kda.toFixed(2)}</td>
                                    <td style={{color: getDurationColor(p.avg_duration)}}>
                                        {minutes}:{seconds}
                                    </td>
                                    <td>{Math.round(p.avg_gpm)}</td>
                                    <td>{Math.round(p.avg_xpm)}</td>
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
