import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './PlayerHeader.css';
import PlayerGlobalSearchInput from './PlayerGlobalSearchInput';
export default function PlayerHeader({
                                         accountId,
                                         onLoadAll,          // ⟵ НОВЕ
                                         ingestLoading = false,
                                         onSearchSelect,// ⟵ НОВЕ
                                     }) {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        if (!accountId) return;
        axios
            .get(`/api/players/${accountId}/profile`)
            .then((res) => setProfile(res.data))
            .catch(console.error);
    }, [accountId]);

    if (!profile) return null;

    return (
        <div className="player-header">
            <div className="player-header-info">
                <img
                    src={profile.avatarFull}
                    alt="avatar"
                    className="player-header-avatar"
                />
                <div className="player-header-name">
                    {profile.personaName.length > 20
                        ? profile.personaName.slice(0, 20) + '…'
                        : profile.personaName}
                </div>
            </div>

                  {/* ─── GLOBAL SEARCH IN CENTER ─── */}
                  <div className="player-header-search">
                    <PlayerGlobalSearchInput onSelect={onSearchSelect} />
                  </div>

            {/* ───────── NEW BUTTON ───────── */}
            <button
                className="load-all-btn"
                onClick={onLoadAll}
                disabled={ingestLoading}
                title="Завантажити всі матчі"
            >
                {ingestLoading ? 'Завантаження…' : 'Запит на 500 останніх матчів'}
            </button>
        </div>
    );
}
