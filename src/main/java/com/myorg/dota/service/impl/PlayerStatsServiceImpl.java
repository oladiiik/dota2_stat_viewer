package com.myorg.dota.service.impl;

import com.myorg.dota.dto.HeroStatsDto;
import com.myorg.dota.dto.MatchSummaryDto;
import com.myorg.dota.dto.PlayerStatsDto;
import com.myorg.dota.service.MatchService;
import com.myorg.dota.service.PlayerStatsService;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PlayerStatsServiceImpl implements PlayerStatsService {
    private final NamedParameterJdbcTemplate jdbc;
    private final MatchService matchService;

    public PlayerStatsServiceImpl(NamedParameterJdbcTemplate jdbc, MatchService matchService) {
        this.jdbc = jdbc;
        this.matchService = matchService;
    }

    @Override
    public PlayerStatsDto aggregateStats(long accountId, int limit) {

        List<MatchSummaryDto> recent = matchService.findRecentMatches(accountId, limit);
        if (recent.isEmpty()) {
            return new PlayerStatsDto(0, 0, 0, 0, 0, 0, 0, 0, null);
        }

        List<Long> matchIds = recent.stream()
                .map(MatchSummaryDto::getMatchId)
                .toList();

        String sql = """
        SELECT
          COUNT(*)                                    AS games_played,
          SUM(pm.is_radiant = m.radiant_win)          AS wins,
          AVG(pm.kills)                               AS avg_kills,
          AVG(pm.deaths)                              AS avg_deaths,
          AVG(pm.assists)                             AS avg_assists,
          AVG(pm.gpm)                                 AS avg_gpm,
          AVG(pm.xpm)                                 AS avg_xpm,
          MIN(m.start_time)                           AS first_match
        FROM fact_player_match pm
        JOIN fact_matches m ON pm.match_id = m.match_id
        WHERE pm.account_id = :accountId
          AND pm.match_id   IN (:matchIds)
        """;

        var params = new MapSqlParameterSource()
                .addValue("accountId", accountId)
                .addValue("matchIds", matchIds);

        return jdbc.queryForObject(sql, params, (rs, rn) -> {
            int games   = rs.getInt("games_played");
            int wins    = rs.getInt("wins");
            double wr   = games == 0 ? 0 : (double) wins / games;

            return new PlayerStatsDto(
                    games,
                    wr,
                    rs.getDouble("avg_kills"),
                    rs.getDouble("avg_deaths"),
                    rs.getDouble("avg_assists"),
                    rs.getDouble("avg_gpm"),
                    rs.getDouble("avg_xpm"),
                    wins,
                    rs.getTimestamp("first_match").toLocalDateTime()
            );
        });
    }

    @Override
    public List<HeroStatsDto> heroStats(long accountId, int limit) {
        // беремо останні limit матчів, як ми вже маємо…
        List<MatchSummaryDto> recent = matchService.findRecentMatches(accountId, limit);
        if (recent.isEmpty()) return List.of();

        List<Long> ids = recent.stream()
                .map(MatchSummaryDto::getMatchId)
                .toList();

        String sql = """
                     SELECT
                       pm.hero_id AS heroId,
                       h.name_en AS heroName,
                       h.img_portrait AS heroImg,
                       COUNT(*)   AS gamesPlayed,
                       AVG(pm.is_radiant = m.radiant_win) AS winRate,
                       AVG(pm.kills)     AS avgKills,
                       AVG(pm.deaths)    AS avgDeaths,
                       AVG(pm.assists)   AS avgAssists
                     FROM fact_player_match pm
                     JOIN fact_matches m ON pm.match_id = m.match_id
                     JOIN dim_heroes h ON pm.hero_id = h.hero_id
                     WHERE pm.account_id = :accountId
                       AND pm.match_id IN (:matchIds)
                     GROUP BY pm.hero_id
                     ORDER BY gamesPlayed DESC
                     """;



        var params = new MapSqlParameterSource()
                .addValue("accountId", accountId)
                .addValue("matchIds", ids);

        return jdbc.query(
                sql,
                params,
                (rs, rn) -> new HeroStatsDto(
                        rs.getInt("heroId"),
                        rs.getString("heroName"),
                        rs.getString("heroImg"),
                        rs.getInt("gamesPlayed"),
                        rs.getDouble("winRate"),
                        rs.getDouble("avgKills"),
                        rs.getDouble("avgDeaths"),
                        rs.getDouble("avgAssists")
                )
        );
    }
}
