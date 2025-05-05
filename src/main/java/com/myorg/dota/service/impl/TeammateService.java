package com.myorg.dota.service.impl;

import com.myorg.dota.dto.TeammateDto;
import org.springframework.http.CacheControl;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TeammateService {

    private final JdbcTemplate jdbc;
    private final RestTemplate rest;

    private final Map<Long, CachedProfile> cache = new ConcurrentHashMap<>();

    public TeammateService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.rest = new RestTemplate();
    }



    public List<TeammateDto> findTopTeammates(long accountId, int limit) {
        var raw = jdbc.query("""
                 SELECT p2.account_id           AS id,
                        COUNT(*)                AS games,
                         SUM(
                           CASE WHEN p2.is_radiant = m.radiant_win
                                THEN 1 ELSE 0 END)                     AS wins
                 FROM   fact_player_match p1
                 JOIN   fact_player_match p2
                        ON  p1.match_id = p2.match_id
                        AND p1.is_radiant = p2.is_radiant              -- союзник
                        AND p2.account_id <> p1.account_id
                         AND p2.account_id <> 4294967295
                 JOIN   fact_matches m ON m.match_id = p1.match_id
                 WHERE  p1.account_id = ?
                 GROUP  BY p2.account_id
                 ORDER  BY games DESC
                 LIMIT  ?
                 """,
                (rs, row) -> new RawMate(
                        rs.getLong("id"),
                        rs.getInt("games"),
                        rs.getInt("wins")
                ),
                accountId, limit);
        return raw.stream()
                .map(this::enrichWithProfile)
                .toList();
    }

    private TeammateDto enrichWithProfile(RawMate m) {
        var profile = getProfile(m.id);
        return new TeammateDto(
                m.id,
                profile.name(),
                profile.avatar(),
                m.games,
                m.wins
        );
    }

    private Profile getProfile(long accountId) {
        var now = System.currentTimeMillis();
        var cached = cache.get(accountId);
        if (cached != null && now - cached.timestamp() < Duration.ofHours(24).toMillis()) {
            return cached.profile();
        }

        try {
            var url   = "https://api.opendota.com/api/players/" + accountId;
            var node  = rest.getForObject(url, com.fasterxml.jackson.databind.JsonNode.class);
            var prof  = node != null && node.hasNonNull("profile") ? node.get("profile") : null;
            var name  = prof != null && prof.hasNonNull("personaname")
                    ? prof.get("personaname").asText() : "—";
            var avatar= prof != null && prof.hasNonNull("avatarfull")
                    ? prof.get("avatarfull").asText() : "";
            var p     = new Profile(name, avatar);
            cache.put(accountId, new CachedProfile(p, now));
            return p;
        } catch (Exception e) {
            return new Profile("—", "");
        }
    }

    private record RawMate(long id, int games, int wins) { }
    private record Profile(String name, String avatar)   { }
    private record CachedProfile(Profile profile, long timestamp) { }
}
