package com.myorg.dota.dto;

public record TeammateDto(
        long   accountId,
        String name,
        String avatar,
        int    games,
        int    wins
) {
    public double winrate() { return games == 0 ? 0 : wins * 100.0 / games; }
}
