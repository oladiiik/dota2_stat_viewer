package com.myorg.dota.service;

import com.myorg.dota.dto.MatchOverviewDto;
import com.myorg.dota.dto.MatchSummaryDto;
import com.myorg.dota.dto.MatchDetailDto;

import java.util.List;

public interface MatchService {

    List<MatchSummaryDto> findRecentMatches(long accountId, int limit);

    MatchDetailDto findMatchDetail(long matchId);
    List<MatchOverviewDto> listAllMatches();
}
