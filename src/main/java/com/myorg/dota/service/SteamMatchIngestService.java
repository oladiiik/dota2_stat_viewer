package com.myorg.dota.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.util.concurrent.RateLimiter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URL;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class SteamMatchIngestService {

    private static final int CHUNK = 50;
    private final RateLimiter rl = RateLimiter.create(1.8);

    private static final Logger log = LoggerFactory.getLogger(SteamMatchIngestService.class);
    private final RestTemplate rest = new RestTemplate();
    private final ObjectMapper om   = new ObjectMapper();
    private final NamedParameterJdbcTemplate jdbc;

    @Value("${steam.api.key}")
    private String apiKey;

    public SteamMatchIngestService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static volatile Map<Integer,String> ABILITY_LUT;
    private Map<Integer,String> abilityLut() {
        if (ABILITY_LUT != null) return ABILITY_LUT;
        synchronized (SteamMatchIngestService.class) {
            if (ABILITY_LUT == null) {
                try {
                    URL url = new URL(
                            "https://raw.githubusercontent.com/odota/"
                            + "dotaconstants/master/build/ability_ids.json");
                    Map<String,String> raw = om.readValue(url, new TypeReference<>() {});
                    Map<Integer,String> map = new HashMap<>(raw.size());
                    raw.forEach((k,v) -> map.put(Integer.parseInt(k), v));
                    ABILITY_LUT = Map.copyOf(map);
                    log.info("Ability LUT loaded ({} abilities)", map.size());
                } catch (Exception e) {
                    log.error("‼ cannot load ability_ids.json, will use numeric IDs", e);
                    ABILITY_LUT = Map.of();
                }
            }
            return ABILITY_LUT;
        }
    }

    public List<MatchRef> fetchAllMatchRefs(long accountId) {
        List<MatchRef> all = new ArrayList<>();
        Long startAt = null;
        int shortBatchStreak = 0;

        while (true) {
            UriComponentsBuilder uri = UriComponentsBuilder
                    .fromHttpUrl("https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/")
                    .queryParam("key", apiKey)
                    .queryParam("account_id", accountId)
                    .queryParam("matches_requested", 100);
            if (startAt != null) {
                uri.queryParam("start_at_match_id", startAt);
            }

            JsonNode arr = rest.getForObject(uri.toUriString(), JsonNode.class)
                    .path("result").path("matches");
            if (!arr.isArray() || arr.size() == 0) break;

            for (JsonNode m : arr) {
                all.add(new MatchRef(
                        m.path("match_id").asLong(),
                        m.path("match_seq_num").asLong()));
            }

            long minId = arr.get(arr.size() - 1).path("match_id").asLong();

            if (arr.size() < 100) {
                shortBatchStreak++;
                if (shortBatchStreak > 5) break;
            } else {
                shortBatchStreak = 0;
            }

            startAt = minId - 1;
            try { Thread.sleep(200); }
            catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
        }
        return all;
    }

    public List<MatchRef> fetchRecentMatchRefs(long accountId, int limit) {
        List<MatchRef> all = new ArrayList<>(limit);
        long startAtMatchId = 0;

        while (all.size() < limit) {
            int want = Math.min(100, limit - all.size());

            String url = UriComponentsBuilder
                    .fromHttpUrl("https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/")
                    .queryParam("key", apiKey)
                    .queryParam("account_id", accountId)
                    .queryParam("matches_requested", want)
                    .queryParam("start_at_match_id", startAtMatchId)
                    .toUriString();

            JsonNode root = rest.getForObject(url, JsonNode.class)
                    .path("result").path("matches");

            if (!root.isArray() || root.size() == 0) break;

            for (JsonNode m : root) {
                long matchId = m.path("match_id").asLong();
                long seqNum  = m.path("match_seq_num").asLong();
                all.add(new MatchRef(matchId, seqNum));
                startAtMatchId = matchId - 1;
            }
            sleep(200);   // Steam не любить спам :-)
        }
        return all;
    }

    public void ingestMatchesBySeq(List<MatchRef> refs) {
        if (refs.isEmpty()) return;


        var rowsMatches = new ArrayList<MapSqlParameterSource>();
        var rowsTeams   = new ArrayList<MapSqlParameterSource>();
        var rowsPlayers = new ArrayList<MapSqlParameterSource>();
        var rowsItems   = new ArrayList<MapSqlParameterSource>();
        var rowsUpgr    = new ArrayList<MapSqlParameterSource>();
        var rowsPicks   = new ArrayList<MapSqlParameterSource>();
        Set<String> usedAbilities = new HashSet<>();
        Map<Integer,String> lut = abilityLut();

        int done = 0;
        for (MatchRef ref : refs) {
            long mid = ref.matchId();
            JsonNode match = fetchWithRetry(mid, ref.seqNum());
            if (match == null) continue;

            rowsMatches.add(new MapSqlParameterSource()
                    .addValue("match_id", mid)
                    .addValue("start_time", new Timestamp(match.path("start_time").asLong() * 1000))
                    .addValue("duration_sec", match.path("duration").asInt())
                    .addValue("pre_game_sec", match.path("pre_game_duration").asInt())
                    .addValue("radiant_win", match.path("radiant_win").asBoolean())
                    .addValue("radiant_score", match.path("radiant_score").asInt())
                    .addValue("dire_score", match.path("dire_score").asInt())
                    .addValue("cluster", match.path("cluster").asInt())
                    .addValue("lobby_type", match.path("lobby_type").asInt())
                    .addValue("game_mode", match.path("game_mode").asInt())
                    .addValue("engine", match.path("engine").asInt()));

            for (boolean rad : List.of(true, false)) {
                int tower = rad ? match.path("tower_status_radiant").asInt()
                        : match.path("tower_status_dire").asInt();
                int barr  = rad ? match.path("barracks_status_radiant").asInt()
                        : match.path("barracks_status_dire").asInt();
                int net = 0;
                for (JsonNode pl : match.path("players"))
                    if ((pl.path("player_slot").asInt() < 128) == rad)
                        net += pl.path("net_worth").asInt();

                rowsTeams.add(new MapSqlParameterSource()
                        .addValue("match_id", mid)
                        .addValue("is_radiant", rad)
                        .addValue("tower_status", tower)
                        .addValue("barracks_status", barr)
                        .addValue("net_worth", net));
            }

            for (JsonNode pl : match.path("players")) {
                int  slot   = pl.path("player_slot").asInt();
                long accId  = pl.path("account_id").asLong();
                int  heroId = pl.path("hero_id").asInt();

                rowsPlayers.add(new MapSqlParameterSource()
                        .addValue("match_id", mid)
                        .addValue("account_id", accId)
                        .addValue("player_slot", slot)
                        .addValue("is_radiant", slot < 128)
                        .addValue("hero_id", heroId)
                        .addValue("kills", pl.path("kills").asInt())
                        .addValue("deaths", pl.path("deaths").asInt())
                        .addValue("assists", pl.path("assists").asInt())
                        .addValue("gpm", pl.path("gold_per_min").asInt())
                        .addValue("xpm", pl.path("xp_per_min").asInt())
                        .addValue("hero_damage",  pl.path("hero_damage").asInt())
                        .addValue("tower_damage", pl.path("tower_damage").asInt())
                        .addValue("hero_healing", pl.path("hero_healing").asInt())
                        .addValue("net_worth",    pl.path("net_worth").asInt())
                        .addValue("level",        pl.path("level").asInt())
                        .addValue("last_hits",    pl.path("last_hits").asInt())
                        .addValue("denies",       pl.path("denies").asInt())
                        .addValue("leaver_status",pl.path("leaver_status").asInt()));

                for (int s = 0; s <= 9; s++) {
                    int itemId = pl.path("item_" + s).asInt(0);
                    if (itemId != 0)
                        rowsItems.add(new MapSqlParameterSource()
                                .addValue("match_id", mid)
                                .addValue("hero_id", heroId)
                                .addValue("account_id", accId)
                                .addValue("slot_index", s)
                                .addValue("item_id", itemId));
                }

                int seq = 1;
                for (JsonNode up : pl.path("ability_upgrades")) {
                    int abilId = up.path("ability").asInt();
                    String abilName = lut.getOrDefault(abilId, "id_" + abilId);
                    usedAbilities.add(abilName);              // ← фіксація ВСІХ назв

                    rowsUpgr.add(new MapSqlParameterSource()
                            .addValue("match_id", mid)
                            .addValue("hero_id", heroId)
                            .addValue("account_id", accId)
                            .addValue("sequence", seq++)
                            .addValue("ability_name", abilName)
                            .addValue("game_time_s", up.path("time").asInt())
                            .addValue("level_granted", up.path("level").asInt()));
                }
            }

            for (JsonNode pb : match.path("picks_bans"))
                rowsPicks.add(new MapSqlParameterSource()
                        .addValue("match_id", mid)
                        .addValue("order_idx", pb.path("order").asInt())
                        .addValue("is_pick", pb.path("is_pick").asBoolean())
                        .addValue("team", pb.path("team").asInt() == 0)
                        .addValue("hero_id", pb.path("hero_id").asInt()));

            if (++done % CHUNK == 0) {
                flushChunk(rowsMatches, rowsTeams, rowsPlayers,
                        rowsItems, rowsUpgr, rowsPicks, usedAbilities);
            }

        }
        flushChunk(rowsMatches, rowsTeams, rowsPlayers,
                rowsItems, rowsUpgr, rowsPicks, usedAbilities);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation   = Isolation.READ_COMMITTED)
    void flushChunk(
            List<MapSqlParameterSource> rowsMatches,
            List<MapSqlParameterSource> rowsTeams,
            List<MapSqlParameterSource> rowsPlayers,
            List<MapSqlParameterSource> rowsItems,
            List<MapSqlParameterSource> rowsUpgr,
            List<MapSqlParameterSource> rowsPicks,
            Set<String>                usedAbilities) {

        List<Long> mids = rowsMatches.stream()
                .map(p -> (Long) p.getValue("match_id"))
                .toList();
        if (!mids.isEmpty()) {
            MapSqlParameterSource cp = new MapSqlParameterSource("m", mids);
            jdbc.update("DELETE FROM fact_picks_bans        WHERE match_id IN (:m)", cp);
            jdbc.update("DELETE FROM fact_ability_upgrades  WHERE match_id IN (:m)", cp);
            jdbc.update("DELETE FROM fact_player_items      WHERE match_id IN (:m)", cp);
            jdbc.update("DELETE FROM fact_player_match      WHERE match_id IN (:m)", cp);
            jdbc.update("DELETE FROM fact_team_results      WHERE match_id IN (:m)", cp);
            jdbc.update("DELETE FROM fact_matches           WHERE match_id IN (:m)", cp);
        }

        ensureAbilitiesExist(usedAbilities);
        batch(SQL_MATCHES, rowsMatches);
        batch(SQL_TEAMS,   rowsTeams);
        batch(SQL_PLAYERS, rowsPlayers);
        batch(SQL_ITEMS,   rowsItems);
        batch(SQL_UPGR,    rowsUpgr);
        batch(SQL_PICKS,   rowsPicks);

        log.info("✓ Committed next {} matches", rowsMatches.size());

        rowsMatches.clear(); rowsTeams.clear(); rowsPlayers.clear();
        rowsItems.clear();   rowsUpgr.clear();  rowsPicks.clear();
        usedAbilities.clear();
    }
    private static final String SQL_MATCHES = """
        INSERT INTO fact_matches
          (match_id,start_time,duration_sec,pre_game_sec,
           radiant_win,radiant_score,dire_score,
           cluster,lobby_type,game_mode,engine)
        VALUES
          (:match_id,:start_time,:duration_sec,:pre_game_sec,
           :radiant_win,:radiant_score,:dire_score,
           :cluster,:lobby_type,:game_mode,:engine)
        ON DUPLICATE KEY UPDATE
          start_time=VALUES(start_time),
          duration_sec=VALUES(duration_sec),
          radiant_win=VALUES(radiant_win),
          radiant_score=VALUES(radiant_score),
          dire_score=VALUES(dire_score)""";

    private static final String SQL_TEAMS = """
        INSERT INTO fact_team_results
          (match_id,is_radiant,tower_status,barracks_status,net_worth)
        VALUES
          (:match_id,:is_radiant,:tower_status,:barracks_status,:net_worth)
        ON DUPLICATE KEY UPDATE
          tower_status    = VALUES(tower_status),
          barracks_status = VALUES(barracks_status),
          net_worth       = VALUES(net_worth)""";

    private static final String SQL_PLAYERS = """
    INSERT INTO fact_player_match
      (match_id,account_id,player_slot,is_radiant,hero_id,
       kills,deaths,assists,gpm,xpm,
       hero_damage,tower_damage,hero_healing,net_worth,
       level,last_hits,denies,leaver_status)
    VALUES
      (:match_id,:account_id,:player_slot,:is_radiant,:hero_id,
       :kills,:deaths,:assists,:gpm,:xpm,
       :hero_damage,:tower_damage,:hero_healing,:net_worth,
       :level,:last_hits,:denies,:leaver_status)
    ON DUPLICATE KEY UPDATE
      kills         = VALUES(kills),
      deaths        = VALUES(deaths),
      assists       = VALUES(assists),
      gpm           = VALUES(gpm),
      xpm           = VALUES(xpm),
      hero_damage   = VALUES(hero_damage),
      tower_damage  = VALUES(tower_damage),
      hero_healing  = VALUES(hero_healing),
      net_worth     = VALUES(net_worth),
      last_hits     = VALUES(last_hits),
      denies        = VALUES(denies),
      leaver_status = VALUES(leaver_status)
    """;

    private static final String SQL_ITEMS = """
        INSERT INTO fact_player_items
          (match_id,hero_id,account_id,slot_index,item_id)
        VALUES
          (:match_id,:hero_id,:account_id,:slot_index,:item_id)
        ON DUPLICATE KEY UPDATE
          item_id=VALUES(item_id)""";

    private static final String SQL_UPGR = """
        INSERT INTO fact_ability_upgrades
          (match_id,hero_id,account_id,sequence,
           ability_name,game_time_s,level_granted)
        VALUES
          (:match_id,:hero_id,:account_id,:sequence,
           :ability_name,:game_time_s,:level_granted)
        ON DUPLICATE KEY UPDATE
          game_time_s   = VALUES(game_time_s),
          level_granted = VALUES(level_granted)""";

    private static final String SQL_PICKS = """
        INSERT INTO fact_picks_bans
          (match_id,order_idx,is_pick,team,hero_id)
        VALUES
          (:match_id,:order_idx,:is_pick,:team,:hero_id)
        ON DUPLICATE KEY UPDATE
          is_pick=VALUES(is_pick),team=VALUES(team)""";

    private void batch(String sql, List<MapSqlParameterSource> rows) {
        if (rows.isEmpty()) return;
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                jdbc.batchUpdate(sql, rows.toArray(MapSqlParameterSource[]::new));
                return;                     // success
            } catch (DataAccessException ex) {
                log.warn("batch failed ({} of 3) – {}", attempt, ex.getMessage());
                sleep(500L * attempt);
            }
        }
        throw new IllegalStateException("batch failed 3× in a row");
    }

    private void ensureAbilitiesExist(Set<String> names) {
        if (names.isEmpty()) return;

        List<String> present = jdbc.queryForList(
                "SELECT ability_name FROM dim_abilities WHERE ability_name IN (:a)",
                new MapSqlParameterSource("a", names), String.class);

        names.removeAll(present);
        if (names.isEmpty()) return;

        Date today = Date.valueOf(LocalDate.now());
        List<MapSqlParameterSource> rows = names.stream()
                .map(n -> new MapSqlParameterSource()
                        .addValue("ability_name", n)
                        .addValue("valid_from", today))
                .toList();

        jdbc.batchUpdate("""
            INSERT INTO dim_abilities (ability_name, valid_from)
            VALUES (:ability_name,:valid_from)""",
                rows.toArray(MapSqlParameterSource[]::new));

        log.info("Inserted {} stub abilities into dim_abilities", rows.size());
    }

    private JsonNode fetchWithRetry(long matchId, long seqNum) {
        String url = UriComponentsBuilder
                .fromHttpUrl("https://api.steampowered.com/IDOTA2Match_570/GetMatchHistoryBySequenceNum/V001/")
                .queryParam("key", apiKey)
                .queryParam("start_at_match_seq_num", seqNum)
                .queryParam("matches_requested", 1)
                .toUriString();

        int attempt = 0;
        long sleepMs = 200;

        while (++attempt <= 5) {      // 5 спроб максимум
            rl.acquire();

            try {
                JsonNode arr = rest.getForObject(url, JsonNode.class)
                        .path("result").path("matches");
                if (arr.isArray() && arr.size() > 0) return arr.get(0);
                log.warn("Empty response for seq {}", seqNum);
                return null;

            } catch (HttpClientErrorException.TooManyRequests e) {
                log.warn("429 (attempt {}) – wait {} ms", attempt, sleepMs);
                sleep(sleepMs + ThreadLocalRandom.current().nextInt(400));
                sleepMs *= 2;

            } catch (ResourceAccessException | HttpClientErrorException e) {
                log.error("Steam API error seq {}", seqNum, e);
                return null;
            }
        }
        log.error("‼️  match {} skipped – 5×429", matchId);
        return null;
    }

    private void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException ignored) {} }

    private long pthSteamId(int slot) { return 0L; }
}
