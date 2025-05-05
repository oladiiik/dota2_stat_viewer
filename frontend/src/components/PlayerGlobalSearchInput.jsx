import React, { useState } from 'react';
import './PlayerGlobalSearchInput.css';

export default function PlayerGlobalSearchInput({ onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleChange = async (e) => {
        const value = e.target.value.trim();
        setQuery(value);

        // Якщо поле порожнє
        if (value.length === 0) {
            setResults([]);
            return;
        }

        // Якщо ввели тільки числа — це ID
        if (/^\d+$/.test(value)) {
            setResults([{
                account_id: parseInt(value),
                personaname: `ID: ${value}`,
                avatarfull: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/avatars/00/00.jpg'
            }]);
            return;
        }

        // Інакше — пошук по ніку через OpenDota
        if (value.length >= 2) {
            setLoading(true);
            try {
                const res = await fetch(`https://api.opendota.com/api/search?q=${encodeURIComponent(value)}`);
                const players = await res.json();
                setResults(players);
            } catch (error) {
                console.error('Помилка пошуку:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="player-global-search">
            <input
                type="text"
                placeholder="Введіть ID або Нікнейм..."
                value={query}
                onChange={handleChange}
                className="player-global-search-input"
            />
            {loading && <div className="player-search-loading">Пошук...</div>}
            {results.length > 0 && (
                <ul className="player-global-search-results">
                    {results.map(player => (
                        <li key={player.account_id} onClick={() => onSelect(player.account_id)}>
                            <img src={player.avatarfull} alt="avatar" />
                            <span>{player.personaname}</span>
                        </li>
                    ))}
                </ul>
            )}
            {!loading && query.length >= 2 && results.length === 0 && (
                <div className="player-search-no-results">Гравців не знайдено</div>
            )}
        </div>
    );
}
