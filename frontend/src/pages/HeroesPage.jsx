// src/pages/HeroesPage.jsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import './HeroesPage.css';

export default function HeroesPage() {
    const { data: heroStats = [], isFetching } = useQuery({
        queryKey: ['heroStats'],
        queryFn: () => axios.get('/api/heroes/stats').then(res => res.data),
        staleTime: 1000 * 60 * 5
    });

    // Стан для сортування
    const [sortConfig, setSortConfig] = useState({
        key: 'games',      // початковий ключ сортування
        direction: 'desc'  // 'asc' або 'desc'
    });

    // Нарощуємо масив з обчисленими метриками і сортуємо його
    const sortedStats = useMemo(() => {
        // 1) Підготовка масиву з метриками
        const enriched = heroStats.map(h => {
            const games   = h.games_played || 0;
            const wins    = h.wins || 0;
            const winRate = games > 0 ? (wins / games) * 100 : 0;
            const avgDur  = h.avg_duration || 0;
            const avgKDA  = h.avg_kda || 0;
            const avgGPM  = h.avg_gpm || 0;
            const avgXPM  = h.avg_xpm || 0;
            return {
                ...h,
                metrics: { games, winRate, avgDur, avgKDA, avgGPM, avgXPM }
            };
        });

        // 2) Сортування
        const { key, direction } = sortConfig;
        enriched.sort((a, b) => {
            // обробка текстового поля
            if (key === 'name_en') {
                const aName = (a.name_en || '').toLowerCase();
                const bName = (b.name_en || '').toLowerCase();
                const cmp = aName.localeCompare(bName);
                return direction === 'asc' ? cmp : -cmp;
            }
            // обробка числових полів
            const aVal = a.metrics[key] ?? 0;
            const bVal = b.metrics[key] ?? 0;
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return enriched;
    }, [heroStats, sortConfig]);


    // Хендлер кліку по заголовку
    const handleSort = key => {
        setSortConfig(prev => {
            if (prev.key === key) {
                // якщо натиснули на той самий ключ — міняємо напрямок
                return {
                    key,
                    direction: prev.direction === 'asc' ? 'desc' : 'asc'
                };
            }
            // інакше — новий ключ, за замовчуванням 'desc'
            return { key, direction: 'desc' };
        });
    };

    if (isFetching) {
        return <div className="loading-ingest">Завантаження...</div>;
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
        <div className="page heroes-page">
             <div className="section-card">
             <h2 className="matches-title">Топ героїв</h2>
             <div className="table-container">
            <table className="hero-table">
                <thead>
                <tr>
                    <th onClick={() => handleSort('name_en')}>
                        Герой
                        {sortConfig.key === 'name_en' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th onClick={() => handleSort('games')}>
                        К-ть матчів
                        {sortConfig.key === 'games' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th onClick={() => handleSort('winRate')}>
                        Win&nbsp;%
                        {sortConfig.key === 'winRate' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th onClick={() => handleSort('avgDur')}>
                        Час
                        {sortConfig.key === 'avgDur' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th onClick={() => handleSort('avgKDA')}>
                        K/D/A
                        {sortConfig.key === 'avgKDA' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th onClick={() => handleSort('avgGPM')}>
                        ЗЗХ
                        {sortConfig.key === 'avgGPM' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th onClick={() => handleSort('avgXPM')}>
                        ДЗХ
                        {sortConfig.key === 'avgXPM' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                </tr>
                </thead>
                <tbody>
                {sortedStats.map(h => {
                    const {games, winRate, avgDur, avgKDA, avgGPM, avgXPM} = h.metrics;
                    const minutes = Math.floor(avgDur / 60);
                    const seconds = String(Math.floor(avgDur % 60)).padStart(2, '0');
                    return (
                        <tr key={h.hero_id}>
                            <td className="hero-name">
                                <img
                                    src={`https://cdn.cloudflare.steamstatic.com${h.img_portrait}`}
                                    alt={h.name_en}
                                    className="hero-portrait"
                                />
                                {h.name_loc || h.name_en}
                            </td>
                            <td>{games.toLocaleString('uk-UA')}</td>
                            <td style={{color: winRate >= 50 ? '#43b581' : '#f04747'}}>
                                {h.metrics.winRate.toFixed(1)}%
                            </td>
                            <td style={{color: getDurationColor(h.metrics.avgDur)}}>
                                {minutes}:{seconds}
                            </td>
                            <td>{avgKDA.toFixed(2)}</td>
                            <td>{Math.round(avgGPM)}</td>
                            <td>{Math.round(avgXPM)}</td>
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
