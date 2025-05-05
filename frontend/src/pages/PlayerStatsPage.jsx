import React, { useEffect, useState } from 'react';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import MatchCard from '../components/MatchCard';

export default function PlayerStatsPage() {
    const [accountId, setAccountId] = useState('239896166');
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/players/${accountId}/matches?limit=10`);
            setMatches(res.data);
        } catch (err) {
            console.error('Failed to fetch matches', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
    }, []);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Mini Stratz Clone</h1>

            <div className="flex mb-6">
                <input
                    type="text"
                    className="bg-gray-700 text-white p-2 rounded-l w-full"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                />
                <button
                    onClick={fetchMatches}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-r"
                >
                    Search
                </button>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-3">
                    {matches.map((m) => (
                        <MatchCard key={m.matchId} match={m} />
                    ))}
                </div>
            )}
        </div>
    );
}
