import React, { useState } from 'react';
import './PlayerSearchInput.css';

export default function PlayerSearchInput({ onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleChange = async (e) => {
        const value = e.target.value;
        setQuery(value);

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
        } else {
            setResults([]);
        }
    };

    return (
        <div className="player-search">
            <input
                type="text"
                placeholder="Пошук гравця..."
                value={query}
                onChange={handleChange}
                className="player-search-input"
            />
            {loading && <div className="player-search-loading">Пошук...</div>}
            {results.length > 0 && (
                <ul className="player-search-results">
                    {results.map(player => (
                        <li key={player.account_id} onClick={() => onSelect(player.account_id)}>
                            <img src={player.avatarfull} alt={player.personaname} />
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
