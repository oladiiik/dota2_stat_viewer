package com.myorg.dota.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class IngestScheduler {

    private final SteamMatchIngestService ingest;
    private final NamedParameterJdbcTemplate jdbc;

    @Scheduled(fixedDelay = 60_000)
    public void refreshPlayers() {
        List<Long> tracked = jdbc.queryForList(
                "SELECT DISTINCT account_id FROM tracked_players",
                new java.util.HashMap<>() ,
                Long.class);

        for (Long id : tracked) {
            ingest.ingestMatchesBySeq(
                    ingest.fetchRecentMatchRefs(id, 25));
        }
    }
}
