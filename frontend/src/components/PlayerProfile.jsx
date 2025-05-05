import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './PlayerProfile.css';

export default function PlayerProfile({ accountId }) {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        if (!accountId) return;
        axios.get(`/api/players/${accountId}/profile`)
            .then(res => setProfile(res.data))
            .catch(console.error);
    }, [accountId]);

    if (!profile) return null;

    return (
        <div className="player-profile">
            <img src={profile.avatarFull} alt={profile.personaName} className="player-avatar" />
            <div className="player-name">{profile.personaName}</div>
        </div>
    );
}
