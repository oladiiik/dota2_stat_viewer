package com.myorg.dota.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerMatchDto {

    private long id;
    private long accountId;
    private int  playerSlot;
    private boolean radiant;
    private int  heroId;

    private int kills;
    private int deaths;
    private int assists;
    private int gpm;
    private int xpm;

    private int level;
    private int net_worth;
    private int hero_damage;
    private int tower_damage;
    private int hero_healing;
    private int last_hits;
    private int denies;

    private List<ItemDto> items;
}
