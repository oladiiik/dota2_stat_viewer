import React from 'react';

export default function MatchCard({ match }) {
    const resultColor = match.win ? 'bg-green-500' : 'bg-red-500';
    const formattedDuration = `${Math.floor(match.durationSec / 60)}m ${match.durationSec % 60}s`;
    const date = new Date(match.startTime).toLocaleDateString('uk-UA', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    return (
        <div className="flex items-center p-4 mb-2 rounded-lg bg-gray-800 shadow-md">
            <img
                src={`https://cdn.cloudflare.steamstatic.com${match.heroImg}`}
                alt={match.heroName}
                className="w-14 h-14 rounded-lg mr-4"
            />
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold">{match.heroName}</span>
                    <span className={`text-xs px-2 py-1 rounded ${resultColor}`}>
            {match.win ? 'Win' : 'Loss'}
          </span>
                </div>
                <div className="text-sm text-gray-400">
                    {date} • {formattedDuration}
                </div>
            </div>
            <div className="text-right">
                <div className="text-sm">K/D/A</div>
                <div className="font-bold">{match.kills}/{match.deaths}/{match.assists}</div>
            </div>
        </div>
    );
}
