package com.myorg.dota.service;

import com.myorg.dota.dto.HeroStatsDto;
import com.myorg.dota.dto.PlayerStatsDto;

import java.util.List;

public interface PlayerStatsService {

    PlayerStatsDto aggregateStats(long accountId, int limit);

    List<HeroStatsDto> heroStats(long accountId, int limit);
}
