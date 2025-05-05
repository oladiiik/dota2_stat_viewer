// File: src/main/java/com/myorg/dota/dto/PlayerStatsDto.java
package com.myorg.dota.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerStatsDto {
    private int gamesPlayed;
    private double winRate;
    private double avgKills;
    private double avgDeaths;
    private double avgAssists;
    private double avgGpm;
    private double avgXpm;
    private int wins;
    private LocalDateTime firstMatch;
}