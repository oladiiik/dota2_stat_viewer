package com.myorg.dota.dto;

import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatchDetailDto {
    private long matchId;
    private LocalDateTime startTime;
    private int durationSec;
    private boolean radiantWin;
    private int radiant_score;
    private int dire_score  ;
    private List<TeamResultDto> teamResults;
    private List<PlayerMatchDto> players;
    private int game_mode;
}
