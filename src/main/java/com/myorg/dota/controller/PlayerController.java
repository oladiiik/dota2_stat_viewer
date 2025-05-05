package com.myorg.dota.controller;

import com.myorg.dota.dto.PlayerProfileDto;
import com.myorg.dota.dto.MatchSummaryDto;
import com.myorg.dota.dto.PlayerStatsDto;
import com.myorg.dota.dto.HeroStatsDto;
import com.myorg.dota.service.MatchService;
import com.myorg.dota.service.PlayerStatsService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final MatchService matchService;
    private final PlayerStatsService statsService;

    @Autowired
    private JdbcTemplate jdbc;

    @Value("${steam.api.key}")
    private String apiKey;
    private static final long STEAMID64_OFFSET = 76561197960265728L;
    public PlayerController(MatchService matchService,
                            PlayerStatsService statsService) {
        this.matchService = matchService;
        this.statsService = statsService;
    }

    /**
     * GET /api/players
     * Повертає всіх унікальних гравців з бази, крім 4294967295
     */
    @GetMapping
    public List<Map<String,Object>> listPlayers() {
        String statsSql = """
        SELECT
          pm.account_id,
          COUNT(*) AS games_played,
          SUM(
            CASE WHEN (pm.player_slot < 128 AND m.radiant_win = 1)
                   OR (pm.player_slot >= 128 AND m.radiant_win = 0)
            THEN 1 ELSE 0 END
          ) AS wins,
          AVG((pm.kills + pm.assists)
              / NULLIF(NULLIF(pm.deaths,0),1)
          ) AS avg_kda,
          AVG(m.duration_sec) AS avg_duration,
          AVG(pm.gpm)         AS avg_gpm,
          AVG(pm.xpm)         AS avg_xpm
        FROM fact_player_match pm
        JOIN fact_matches m ON pm.match_id = m.match_id
        WHERE m.lobby_type = 7
          AND pm.account_id <> 4294967295
        GROUP BY pm.account_id
        HAVING COUNT(*) > 10
        """;
        List<Map<String,Object>> rawStats = jdbc.queryForList(statsSql);

        Map<Long, Map<String,Object>> statsById = new HashMap<>();
        for (var row : rawStats) {
            long id = ((Number)row.get("account_id")).longValue();
            statsById.put(id, row);
        }

        Map<Long, PlayerProfileDto> profiles = fetchProfiles(statsById.keySet());

        List<Map<String,Object>> out = new ArrayList<>();
        for (Long id : statsById.keySet()) {
            Map<String,Object> s = statsById.get(id);

            long games = Optional.ofNullable((Number)s.get("games_played"))
                    .map(Number::longValue).orElse(0L);
            long wins  = Optional.ofNullable((Number)s.get("wins"))
                    .map(Number::longValue).orElse(0L);
            double avgKda     = Optional.ofNullable((Number)s.get("avg_kda"))
                    .map(Number::doubleValue).orElse(0.0);
            double avgDur     = Optional.ofNullable((Number)s.get("avg_duration"))
                    .map(Number::doubleValue).orElse(0.0);
            double avgGpm     = Optional.ofNullable((Number)s.get("avg_gpm"))
                    .map(Number::doubleValue).orElse(0.0);
            double avgXpm     = Optional.ofNullable((Number)s.get("avg_xpm"))
                    .map(Number::doubleValue).orElse(0.0);
            double winRate    = games > 0 ? wins * 100.0 / games : 0.0;

            PlayerProfileDto prof = profiles.getOrDefault(
                    id, new PlayerProfileDto("Unknown", "")
            );

            Map<String,Object> entry = new LinkedHashMap<>();
            entry.put("account_id",    id);
            entry.put("personaname",   prof.getPersonaName());
            entry.put("avatarfull",    prof.getAvatarFull());
            entry.put("games_played",  games);
            entry.put("win_rate",      winRate);
            entry.put("avg_kda",       avgKda);
            entry.put("avg_duration",  avgDur);
            entry.put("avg_gpm",       avgGpm);
            entry.put("avg_xpm",       avgXpm);

            out.add(entry);
        }
        return out;
    }


    private Map<Long, PlayerProfileDto> fetchProfiles(Collection<Long> accountIds) {
        final long OFFSET = 76561197960265728L;
        RestTemplate rt = new RestTemplate();

        List<Long> ids = new ArrayList<>(accountIds);
        Map<Long, PlayerProfileDto> result = new HashMap<>();

        for (int i = 0; i < ids.size(); i += 100) {
            List<Long> batch = ids.subList(i, Math.min(i + 100, ids.size()));
            String steamIds = batch.stream()
                    .map(id -> String.valueOf(id + OFFSET))
                    .collect(Collectors.joining(","));

            String url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
                         + "?key=" + apiKey
                         + "&steamids=" + steamIds;
            try {
                @SuppressWarnings("unchecked")
                Map<String,Object> resp = rt.getForObject(url, Map.class);
                @SuppressWarnings("unchecked")
                List<Map<String,Object>> players =
                        (List<Map<String,Object>>)((Map<?,?>)resp.get("response")).get("players");
                for (Map<String,Object> p : players) {
                    long steam64 = Long.parseLong(p.get("steamid").toString());
                    long acctId  = steam64 - OFFSET;
                    String name  = Objects.toString(p.get("personaname"), "Unknown");
                    String avatar= Objects.toString(p.get("avatarfull"), "");
                    result.put(acctId, new PlayerProfileDto(name, avatar));
                }
            } catch (Exception e) {
            }
        }

        return result;
    }



    /**
     * GET /api/players/{id}/matches?limit={limit}
     */
    @GetMapping("/{id}/matches")
    public List<MatchSummaryDto> recentMatches(
            @PathVariable("id") long accountId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return matchService.findRecentMatches(accountId, limit);
    }

    /**
     * GET /api/players/{id}/stats?limit={limit}
     */
    @GetMapping("/{id}/stats")
    public PlayerStatsDto stats(
            @PathVariable("id") long accountId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return statsService.aggregateStats(accountId, limit);
    }
    @GetMapping("/{id}/hero-stats")
    public List<HeroStatsDto> heroStats(
            @PathVariable("id") long accountId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return statsService.heroStats(accountId, limit);
    }

    @GetMapping("/{id}/profile")
    public PlayerProfileDto profile(@PathVariable("id") long accountId) {
        long steam64 = accountId + STEAMID64_OFFSET;
        String url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
                     + "?key=" + apiKey
                     + "&steamids=" + steam64;
        RestTemplate rt = new RestTemplate();
        try {
            @SuppressWarnings("unchecked")
            Map<String,Object> resp = rt.getForObject(url, Map.class);
            @SuppressWarnings("unchecked")
            List<Map<String,Object>> players = (List<Map<String,Object>>)
                    ((Map<String,Object>)resp.get("response")).get("players");
            if (!players.isEmpty()) {
                Map<String,Object> p = players.get(0);
                String name   = Objects.toString(p.get("personaname"), "Unknown");
                String avatar = Objects.toString(p.get("avatarfull"), "");
                return new PlayerProfileDto(name, avatar);
            }
        } catch (Exception ignored) { }
        return new PlayerProfileDto("Unknown", "");
    }
}