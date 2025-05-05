package com.myorg.dota.dto;

import lombok.*;

import java.time.LocalDateTime;
@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class MatchOverviewDto {
    private long matchId;
    private LocalDateTime startTime;
    private int durationSec;
    private boolean radiantWin;
    private int radiantScore;
    private int direScore;
    private int gameMode;

}
