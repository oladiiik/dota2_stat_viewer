package com.myorg.dota.service.impl;

import com.myorg.dota.dto.MatchDetailDto;
import com.myorg.dota.dto.MatchSummaryDto;
import com.myorg.dota.dto.PlayerMatchDto;
import com.myorg.dota.dto.TeamResultDto;
import com.myorg.dota.dto.ItemDto;
import com.myorg.dota.dto.MatchOverviewDto;

import com.myorg.dota.service.MatchService;

import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MatchServiceImpl implements MatchService {
    private final NamedParameterJdbcTemplate jdbc;

    public MatchServiceImpl(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<MatchSummaryDto> findRecentMatches(long accountId, int limit) {
        var sql = """
       SELECT
         pm.match_id,
         m.start_time,
         m.duration_sec,
         m.game_mode,
         pm.hero_id,
         pm.player_slot,
         (pm.is_radiant = m.radiant_win) AS win,
         pm.kills,
         pm.deaths,
         pm.assists,
         pm.gpm,             
         pm.xpm  
       FROM fact_player_match pm
       JOIN fact_matches m ON pm.match_id = m.match_id
       WHERE pm.account_id = :accountId
       ORDER BY m.start_time DESC
       LIMIT :limit
       """;

        var params = new MapSqlParameterSource()
                .addValue("accountId", accountId)
                .addValue("limit", limit);

        List<MatchSummaryDto> result = jdbc.query(
                sql,
                params,
                (rs, rowNum) -> {
                    MatchSummaryDto dto = new MatchSummaryDto();
                    dto.setMatchId(rs.getLong("match_id"));
                    dto.setStartTime(rs.getTimestamp("start_time").toLocalDateTime());
                    dto.setDurationSec(rs.getInt("duration_sec"));
                    dto.setHeroId(rs.getInt("hero_id"));
                    dto.setPlayerSlot(rs.getInt("player_slot"));
                    dto.setWin(rs.getBoolean("win"));
                    dto.setKills(rs.getInt("kills"));
                    dto.setDeaths(rs.getInt("deaths"));
                    dto.setAssists(rs.getInt("assists"));
                    dto.setGoldPerMin(rs.getInt("gpm"));
                    dto.setXpPerMin(rs.getInt("xpm"));
                    dto.setGameMode(rs.getInt("game_mode"));
                    return dto;
                }
        );

        // ───── Підвантажуємо предмети ─────
        var sqlItems = """
        SELECT match_id, slot_index, i.item_id, i.name_en, i.description, i.img_lg
        FROM fact_player_items fpi
        JOIN dim_items i ON i.item_id = fpi.item_id
        WHERE fpi.account_id = :accountId
    """;

        Map<Long, List<ItemDto>> itemsByMatch = new HashMap<>();

        jdbc.query(sqlItems, params, rs -> {
            long matchId = rs.getLong("match_id");
            itemsByMatch
                    .computeIfAbsent(matchId, k -> new ArrayList<>())
                    .add(new ItemDto(
                            rs.getInt("item_id"),
                            rs.getInt("slot_index"),
                            rs.getString("name_en"),
                            rs.getString("description"),
                            rs.getString("img_lg")
                    ));
        });

        // ───── Привʼязуємо предмети до матчів ─────
        result.forEach(match ->
                match.setItems(itemsByMatch.getOrDefault(match.getMatchId(), List.of()))
        );

        return result;
    }


    @Override
    public MatchDetailDto findMatchDetail(long matchId) {
        // 1) Завантажуємо мета-дані матчу
        String sqlMeta = """
            SELECT match_id, start_time, duration_sec, radiant_win, radiant_score, dire_score, game_mode
              FROM fact_matches
             WHERE match_id = :matchId
            """;
        var meta = jdbc.queryForObject(
                sqlMeta,
                new MapSqlParameterSource("matchId", matchId),
                (rs, rn) -> {
// 1) meta-mapper
                    MatchDetailDto d = new MatchDetailDto();
                    d.setMatchId(rs.getLong("match_id"));
                    d.setStartTime(rs.getTimestamp("start_time").toLocalDateTime());
                    d.setDurationSec(rs.getInt("duration_sec"));
                    d.setRadiantWin(rs.getBoolean("radiant_win"));
                    d.setRadiant_score(rs.getInt("radiant_score"));   // ← НОВЕ
                    d.setDire_score(rs.getInt("dire_score"));         // ← НОВЕ
                    d.setGame_mode(rs.getInt("game_mode"));
                    return d;
                }
        );

        // 2) Завантажуємо результати команд
        String sqlTeams = """
            SELECT is_radiant  AS radiant, tower_status, barracks_status, net_worth
              FROM fact_team_results
             WHERE match_id = :matchId
            """;
        List<TeamResultDto> teams = jdbc.query(
                sqlTeams,
                new MapSqlParameterSource("matchId", matchId),
                new BeanPropertyRowMapper<>(TeamResultDto.class)
        );
        meta.setTeamResults(teams);

        // 3) Завантажуємо дані по гравцях
        String sqlPlayers = """
         SELECT id,
         account_id, player_slot, is_radiant  AS radiant,
              hero_id, kills, deaths, assists, gpm, xpm, hero_damage, tower_damage, hero_healing, level, net_worth, last_hits, denies
         FROM fact_player_match
         WHERE match_id = :matchId
         ORDER BY id
        """;
        List<PlayerMatchDto> players = jdbc.query(
                sqlPlayers,
                new MapSqlParameterSource("matchId", matchId),
                new BeanPropertyRowMapper<>(PlayerMatchDto.class)
        );
        meta.setPlayers(players);


        /* ------- NEW: load items for every hero_id ------- */
        String sqlItems = """
    SELECT fpi.hero_id,
           fpi.slot_index,
           i.item_id, i.name_en, i.description, i.img_lg
    FROM fact_player_items  fpi
    JOIN dim_items          i  ON i.item_id = fpi.item_id
    WHERE fpi.match_id = :matchId
""";

        Map<Integer, List<ItemDto>> itemsByHero = new HashMap<>();

        jdbc.query(sqlItems,
                new MapSqlParameterSource("matchId", matchId),
                rs -> {
                    int hero = rs.getInt("hero_id");
                    itemsByHero
                            .computeIfAbsent(hero, k -> new ArrayList<>())
                            .add(new ItemDto(
                                    rs.getInt("item_id"),
                                    rs.getInt("slot_index"),
                                    rs.getString("name_en"),
                                    rs.getString("description"),
                                    rs.getString("img_lg")
                            ));
                });

        /* ─ attach: match по heroId ─ */
        players.forEach(p -> p.setItems(
                itemsByHero.getOrDefault(p.getHeroId(), List.of())
        ));

        return meta;
    }

    @Override
    public List<MatchOverviewDto> listAllMatches() {
        String sql = """
        SELECT
          match_id,
          start_time,
          duration_sec,
          radiant_win,
          radiant_score,
          dire_score,
          game_mode
        FROM fact_matches
        ORDER BY start_time DESC
        """;

        return jdbc.query(sql, (rs, rn) -> {
            MatchOverviewDto dto = new MatchOverviewDto();
            dto.setMatchId(rs.getLong("match_id"));
            dto.setStartTime(rs.getTimestamp("start_time").toLocalDateTime());
            dto.setDurationSec(rs.getInt("duration_sec"));
            dto.setRadiantWin(rs.getBoolean("radiant_win"));
            dto.setRadiantScore(rs.getInt("radiant_score"));
            dto.setDireScore(rs.getInt("dire_score"));
            dto.setGameMode(rs.getInt("game_mode"));
            return dto;
        });
    }

}
