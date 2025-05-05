package com.myorg.dota.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class TeamResultDto {
    private boolean isRadiant;
    private int towerStatus;
    private int barracksStatus;
    private int netWorth;
}
