package com.myorg.dota.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class HeroStatsDto {
    private int heroId;
    private String heroName;
    private String heroImg;
    private int gamesPlayed;
    private double winRate;
    private double avgKills;
    private double avgDeaths;
    private double avgAssists;
}
