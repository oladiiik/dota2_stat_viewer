package com.myorg.dota.controller;

import com.myorg.dota.dto.MatchDetailDto;
import com.myorg.dota.dto.MatchOverviewDto;
import com.myorg.dota.service.MatchService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
public class MatchController {
    private final MatchService matchService;

    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }
    /** GET /api/matches — список всіх матчів */
    @GetMapping
    public List<MatchOverviewDto> listMatches() {
        return matchService.listAllMatches();
    }
    /**
     * GET /api/matches/{matchId}
     */
    @GetMapping("/{matchId}")
    public MatchDetailDto detail(@PathVariable long matchId) {
        return matchService.findMatchDetail(matchId);
    }

}