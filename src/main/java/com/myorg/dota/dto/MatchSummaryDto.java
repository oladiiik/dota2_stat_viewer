// src/main/java/com/myorg/dota/dto/MatchSummaryDto.java
package com.myorg.dota.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class MatchSummaryDto {
    private long matchId;
    private LocalDateTime startTime;
    private int durationSec;
    private int heroId;
    private int playerSlot;
    private boolean win;
    private int kills;
    private int deaths;
    private int assists;
    private int goldPerMin;
    private int xpPerMin;
    private int gameMode;

    private List<ItemDto> items;
}
