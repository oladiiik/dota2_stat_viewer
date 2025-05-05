package com.myorg.dota;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import java.io.InputStream;
import java.net.URL;
import java.sql.Date;
import java.time.LocalDate;
import java.util.*;

@Component
public class SeedRunner implements CommandLineRunner {

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SeedRunner(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        seedHeroes();
        seedItems();
        seedAbilities();
        seedHeroAbilitiesAndTalentsAndFacets();
    }

    private void seedHeroes() throws Exception {
        URL url = new URL("https://raw.githubusercontent.com/odota/dotaconstants/master/build/heroes.json");
        Map<String, Map<String, Object>> heroes = objectMapper.readValue(url, new TypeReference<>() {});

        List<Map<String, Object>> batch = new ArrayList<>();

        for (var entry : heroes.entrySet()) {
            Map<String, Object> hero = entry.getValue();
            Map<String, Object> row = new HashMap<>();
            row.put("hero_id", ((Number) hero.get("id")).intValue());
            row.put("api_name", hero.get("name").toString());
            row.put("name_en", hero.get("localized_name"));
            row.put("short_name", hero.get("name").toString().replace("npc_dota_hero_", ""));
            row.put("primary_attr", hero.get("primary_attr"));
            row.put("attack_type", hero.get("attack_type"));
            row.put("roles", String.join(",", (List<String>) hero.get("roles")));
            row.put("img_portrait", hero.get("img"));
            row.put("img_full", hero.get("img"));
            row.put("base_health", hero.getOrDefault("base_health", 200));
            row.put("base_mana", hero.getOrDefault("base_mana", 75));
            row.put("base_armor", hero.getOrDefault("base_armor", 0.0));
            row.put("move_speed", hero.getOrDefault("move_speed", 300));
            row.put("valid_from", Date.valueOf(LocalDate.now()));
            batch.add(row);
        }

        jdbcTemplate.batchUpdate("""
                INSERT INTO dim_heroes
                (hero_id, api_name, name_en, short_name, primary_attr, attack_type, roles,
                 img_portrait, img_full, base_health, base_mana, base_armor, move_speed, valid_from)
                VALUES
                (:hero_id, :api_name, :name_en, :short_name, :primary_attr, :attack_type, :roles,
                 :img_portrait, :img_full, :base_health, :base_mana, :base_armor, :move_speed, :valid_from)
                ON DUPLICATE KEY UPDATE
                hero_id = VALUES(hero_id),
                name_en = VALUES(name_en),
                api_name = VALUES(api_name),
               short_name = VALUES(short_name),
               attack_type = VALUES(attack_type),
                  roles = VALUES(roles),
               img_portrait = VALUES(img_portrait),
                   img_full = VALUES(img_full),
                   base_health = VALUES(base_health),
                      base_mana = VALUES(base_mana),
                       base_armor = VALUES(base_armor),
                         move_speed = VALUES(move_speed),
                           valid_from = VALUES(valid_from);
               """,
                batch.stream().map(MapSqlParameterSource::new).toArray(MapSqlParameterSource[]::new));
        System.out.println("Heroes seeded: " + batch.size());
    }

    private void seedItems() throws Exception {
        URL url = new URL("https://raw.githubusercontent.com/odota/dotaconstants/master/build/items.json");
        Map<String, Map<String, Object>> items = objectMapper.readValue(url, new TypeReference<>() {});

        List<Map<String, Object>> batch = new ArrayList<>();

        for (var entry : items.entrySet()) {
            Map<String, Object> item = entry.getValue();

            Number id = (Number) item.get("id");
            if (id == null) {
                System.out.println("Skip item without ID: " + entry.getKey());
                continue;
            }

            Map<String, Object> row = new HashMap<>();
            row.put("item_id", id.intValue());
            row.put("name_en", item.getOrDefault("dname", entry.getKey()));
            Object costObj = item.get("cost");
            int cost = (costObj instanceof Number) ? ((Number) costObj).intValue() : 0;
            row.put("cost", cost);
            row.put("img_lg", item.getOrDefault("img", ""));
            row.put("img_icon", item.getOrDefault("icon", ""));

            String description = (String) item.get("desc");
            if (description == null) {
                var abilities = (List<Map<String, Object>>) item.get("abilities");
                if (abilities != null && !abilities.isEmpty()) {
                    description = (String) abilities.get(0).getOrDefault("description", "");
                }
            }
            row.put("description", description != null ? description : "");

            row.put("notes", item.getOrDefault("notes", ""));
            row.put("attrib_json", objectMapper.writeValueAsString(item.getOrDefault("attrib", new ArrayList<>())));
            row.put("lore", item.getOrDefault("lore", ""));
            row.put("components", objectMapper.writeValueAsString(
                    item.get("components") != null ? item.get("components") : new ArrayList<>()
            ));
            row.put("created", Boolean.TRUE.equals(item.get("created")) || (item.get("created") instanceof Number && ((Number) item.get("created")).intValue() == 1));
            row.put("charges", Boolean.TRUE.equals(item.get("charges")) || (item.get("charges") instanceof Number && ((Number) item.get("charges")).intValue() == 1));
            row.put("valid_from", Date.valueOf(LocalDate.now()));
            batch.add(row);
        }

        jdbcTemplate.batchUpdate("""
                INSERT INTO dim_items
                (item_id, name_en, cost,
                 img_lg, img_icon, description, notes, attrib_json, lore, components,
                 created, charges, valid_from)
                VALUES
                (:item_id, :name_en, :cost,
                 :img_lg, :img_icon, :description, :notes, :attrib_json, :lore, :components,
                 :created, :charges, :valid_from)
                ON DUPLICATE KEY UPDATE
                item_id = VALUES(item_id),
              name_en = VALUES(name_en),
              cost = VALUES(cost),
           img_lg = VALUES(img_lg),
             img_icon = VALUES(img_icon),
                 description = VALUES(description),
                        notes = VALUES(notes),
                         attrib_json = VALUES(attrib_json),
                               lore = VALUES(lore),
                               components = VALUES(components),
                                     created = VALUES(created),
                                        charges = VALUES(charges),
                                           valid_from = VALUES(valid_from);
           """, batch.stream().map(MapSqlParameterSource::new).toArray(MapSqlParameterSource[]::new));
        System.out.println("Items seeded: " + batch.size());
    }

    private static final int BATCH_SIZE = 500;

    private void seedAbilities() throws Exception {
        URL url = new URL("https://raw.githubusercontent.com/odota/dotaconstants/master/build/abilities.json");
        Map<String, Map<String, Object>> abilities = objectMapper.readValue(url, new TypeReference<>() {});

        int count = 0;

        jdbcTemplate.getJdbcTemplate().update("DELETE FROM dim_abilities");

        for (var entry : abilities.entrySet()) {
            Map<String, Object> ability = entry.getValue();

            String abilityName = entry.getKey();
            String nameLoc = (String) ability.getOrDefault("dname", entry.getKey());
            String description = (String) ability.getOrDefault("desc", "");
            String img = (String) ability.getOrDefault("img", "");
            String manaCost = String.valueOf(ability.getOrDefault("mc", ""));
            String cooldown = String.valueOf(ability.getOrDefault("cd", ""));
            String behavior = String.valueOf(ability.getOrDefault("behavior", ""));
            String dmgType = String.valueOf(ability.getOrDefault("dmg_type", "None"));

            Object attrib = ability.getOrDefault("attrib", Collections.emptyList());
            String attribJson = objectMapper.writeValueAsString(attrib);
            Date validFrom = Date.valueOf(LocalDate.now());

            jdbcTemplate.getJdbcTemplate().update(
                    "INSERT INTO dim_abilities " +
                            "(ability_name, name_loc, description, img, mana_cost, cooldown, behavior, dmg_type, attrib_json, valid_from) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    abilityName, nameLoc, description, img, manaCost, cooldown, behavior, dmgType, attribJson, validFrom
            );

            count++;
            if (count % 100 == 0) {
                System.out.println("Progress: " + count + " abilities processed");
            }
        }

        System.out.println("Abilities seeded: " + count);
    }


    private void seedHeroAbilitiesAndTalentsAndFacets() throws Exception {
        // 0) Завантажуємо всі існуючі ability_name з dim_abilities
        List<String> abilitiesInDim = jdbcTemplate.getJdbcTemplate()
                .queryForList("SELECT ability_name FROM dim_abilities", String.class);
        Set<String> existingAbilities = new HashSet<>(abilitiesInDim);

        // 1) Завантажуємо hero_abilities.json
        URL url = new URL("https://raw.githubusercontent.com/odota/dotaconstants/master/build/hero_abilities.json");
        Map<String, Map<String, Object>> heroes = objectMapper.readValue(url, new TypeReference<>() {});

        // 2) Готуємо батчі
        List<Map<String, Object>> heroAbilitiesBatch = new ArrayList<>();
        List<Map<String, Object>> heroTalentsBatch   = new ArrayList<>();
        List<Map<String, Object>> heroFacetsBatch    = new ArrayList<>();

        for (var entry : heroes.entrySet()) {
            String heroApiName = entry.getKey();
            Map<String, Object> heroData = entry.getValue();


            List<String> abilities = (List<String>) heroData.getOrDefault("abilities", List.of());
            for (int slot = 0; slot < abilities.size(); slot++) {
                Map<String, Object> row = new HashMap<>();
                row.put("hero_api_name", heroApiName);
                row.put("ability_name",   abilities.get(slot));
                row.put("slot",           slot);
                heroAbilitiesBatch.add(row);
            }


            List<Map<String, Object>> talents = (List<Map<String, Object>>) heroData.getOrDefault("talents", List.of());
            for (var t : talents) {
                String talentName = (String) t.get("name");
                if (!existingAbilities.contains(talentName)) continue;
                Map<String, Object> row = new HashMap<>();
                row.put("hero_api_name", heroApiName);
                row.put("talent_name",   talentName);
                row.put("talent_level",  ((Number) t.get("level")).intValue());
                heroTalentsBatch.add(row);
            }


            List<Map<String, Object>> facets = (List<Map<String, Object>>) heroData.getOrDefault("facets", List.of());
            for (var f : facets) {
                Map<String, Object> row = new HashMap<>();
                row.put("hero_api_name", heroApiName);
                row.put("facet_id",      ((Number) f.get("id")).intValue());
                row.put("name",          f.get("name"));
                row.put("icon",          f.getOrDefault("icon", ""));
                row.put("color",         f.getOrDefault("color", ""));
                row.put("gradient_id",   f.getOrDefault("gradient_id", 0));
                row.put("title",         f.getOrDefault("title", ""));
                row.put("description",   f.getOrDefault("description", ""));
                heroFacetsBatch.add(row);
            }
        }


        jdbcTemplate.batchUpdate("""
        INSERT INTO dim_hero_abilities
          (hero_api_name, ability_name, slot)
        VALUES
          (:hero_api_name, :ability_name, :slot)
        ON DUPLICATE KEY UPDATE
          slot = VALUES(slot)
        """,
                heroAbilitiesBatch.stream()
                        .map(MapSqlParameterSource::new)
                        .toArray(MapSqlParameterSource[]::new)
        );


        jdbcTemplate.batchUpdate("""
        INSERT INTO fact_hero_talents
          (hero_api_name, talent_name, level)
        VALUES
          (:hero_api_name, :talent_name, :talent_level)
        ON DUPLICATE KEY UPDATE
          level = VALUES(level)
        """,
                heroTalentsBatch.stream()
                        .map(MapSqlParameterSource::new)
                        .toArray(MapSqlParameterSource[]::new)
        );


        jdbcTemplate.batchUpdate("""
        INSERT INTO dim_hero_facets
          (hero_api_name, facet_id, name, icon, color, gradient_id, title, description)
        VALUES
          (:hero_api_name, :facet_id, :name, :icon, :color, :gradient_id, :title, :description)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          icon = VALUES(icon),
          color = VALUES(color),
          gradient_id = VALUES(gradient_id),
          title = VALUES(title),
          description = VALUES(description)
        """,
                heroFacetsBatch.stream()
                        .map(MapSqlParameterSource::new)
                        .toArray(MapSqlParameterSource[]::new)
        );

        System.out.println("Hero abilities seeded: " + heroAbilitiesBatch.size());
        System.out.println("Hero talents seeded:   " + heroTalentsBatch.size());
        System.out.println("Hero facets seeded:    " + heroFacetsBatch.size());
    }
}
