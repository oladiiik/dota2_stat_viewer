package com.myorg.dota.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/heroes")
public class HeroController {

    @Autowired
    private JdbcTemplate jdbc;

    @GetMapping
    public List<Map<String, Object>> listHeroes() {
        return jdbc.queryForList("""
            SELECT hero_id, name_en, img_portrait
            FROM dim_heroes
            """);
    }

    @GetMapping("/stats")
    public List<Map<String, Object>> listHeroStats() {
        String sql = """
            SELECT
              h.hero_id,
              h.name_en,
              h.img_portrait,
              COUNT(*) AS games_played,
              SUM(
                CASE
                  WHEN (pm.player_slot < 128 AND m.radiant_win = 1)
                    OR (pm.player_slot >= 128 AND m.radiant_win = 0)
                  THEN 1
                  ELSE 0
                END
              ) AS wins,
              AVG(
                (pm.kills + pm.assists)
                / NULLIF(NULLIF(pm.deaths, 0), 0)
              ) AS avg_kda,
              AVG(m.duration_sec)    AS avg_duration,
              AVG(pm.gpm)            AS avg_gpm,
              AVG(pm.xpm)            AS avg_xpm
            FROM dim_heroes h
            JOIN fact_player_match pm
              ON pm.hero_id = h.hero_id
            JOIN fact_matches m
              ON m.match_id = pm.match_id
            WHERE m.lobby_type = 7
            GROUP BY
              h.hero_id,
              h.name_en,
              h.img_portrait
            ORDER BY games_played DESC
            """;
        return jdbc.queryForList(sql);
    }
}
