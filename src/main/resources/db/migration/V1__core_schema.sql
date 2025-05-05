DROP DATABASE IF EXISTS dota_core;
CREATE DATABASE dota_core
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE      utf8mb4_unicode_ci;
USE dota_core;


CREATE TABLE dim_heroes (
                            hero_id       SMALLINT UNSIGNED PRIMARY KEY,         -- 1 … 141
                            name_en       VARCHAR(64)  NOT NULL,                 -- npc_dota_hero_...
                            api_name      VARCHAR(64)     NOT NULL UNIQUE,        -- ключ із heroes.json
                            short_name    VARCHAR(32)  NOT NULL,                 -- ember_spirit
                            primary_attr  ENUM('str','agi','int','all') NOT NULL,
                            attack_type   ENUM('Melee','Ranged') NOT NULL,
                            roles         SET(
                     'Carry','Support','Nuker','Disabler',
                     'Durable','Escape','Pusher','Initiator'
                  ) NOT NULL,
                            img_portrait  VARCHAR(128) NOT NULL,                 -- 59×33
                            img_full      VARCHAR(128) NOT NULL,                 -- 250×150
                            base_health   SMALLINT        DEFAULT 200,
                            base_mana     SMALLINT        DEFAULT 75,
                            base_armor    DECIMAL(4,2)    DEFAULT 0.00,
                            move_speed    SMALLINT        DEFAULT 300,
                            valid_from    DATE            NOT NULL,
                            valid_to      DATE            NOT NULL DEFAULT '9999-12-31'
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE dim_abilities (
                               ability_name   VARCHAR(255) PRIMARY KEY,  -- ключ замість числового id
                               name_loc       VARCHAR(255) NOT NULL DEFAULT 'None',
                               description    TEXT,
                               img            VARCHAR(128),
                               mana_cost      VARCHAR(32),
                               cooldown       VARCHAR(32),
                               behavior       VARCHAR(64),
                               dmg_type       VARCHAR(32) NOT NULL DEFAULT 'None',
                               attrib_json    JSON,
                               valid_from     DATE NOT NULL,
                               valid_to       DATE NOT NULL DEFAULT '9999-12-31'
) ENGINE = InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE dim_items (
                           item_id       SMALLINT UNSIGNED PRIMARY KEY,         -- 1 … 3000
                           name_en       VARCHAR(64)  NOT NULL,
                           cost          MEDIUMINT UNSIGNED NOT NULL,
                           img_lg        VARCHAR(128) NOT NULL,                 -- 256×192
                           img_icon      VARCHAR(128) NOT NULL,                 -- 32×32
                           description   TEXT,
                           notes         TEXT,
                           attrib_json   JSON,
                           lore          TEXT,
                           components    JSON,                                  -- ["shadow_amulet","ultimate_orb"]
                           created       BOOLEAN      NOT NULL,
                           charges       BOOLEAN      NOT NULL,
                           valid_from    DATE         NOT NULL,
                           valid_to      DATE         NOT NULL DEFAULT '9999-12-31'
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;



CREATE TABLE dim_hero_abilities (
                                    hero_api_name   VARCHAR(64) NOT NULL,
                                    ability_name    VARCHAR(64) NOT NULL,
                                    slot            TINYINT UNSIGNED,    -- Q/W/E/R/F/D по суті
                                    PRIMARY KEY (hero_api_name, ability_name),
                                    FOREIGN KEY (hero_api_name) REFERENCES dim_heroes(api_name)
                                        ON UPDATE CASCADE ON DELETE CASCADE,
                                    FOREIGN KEY (ability_name) REFERENCES dim_abilities(ability_name)
                                        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE fact_hero_talents (
                                   hero_api_name   VARCHAR(64) NOT NULL,
                                   talent_name     VARCHAR(64) NOT NULL,
                                   level           TINYINT UNSIGNED NOT NULL,
                                   PRIMARY KEY (hero_api_name, talent_name),
                                   FOREIGN KEY (hero_api_name) REFERENCES dim_heroes(api_name)
                                       ON UPDATE CASCADE ON DELETE CASCADE,
                                   FOREIGN KEY (talent_name) REFERENCES dim_abilities(ability_name)
                                       ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE dim_hero_facets (
                                 hero_api_name   VARCHAR(64) NOT NULL,
                                 facet_id        TINYINT UNSIGNED NOT NULL,
                                 name            VARCHAR(64) NOT NULL,
                                 icon            VARCHAR(64),
                                 color           VARCHAR(32),
                                 gradient_id     TINYINT,
                                 title           VARCHAR(128),
                                 description     TEXT,
                                 PRIMARY KEY (hero_api_name, facet_id),
                                 FOREIGN KEY (hero_api_name) REFERENCES dim_heroes(api_name)
                                     ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE fact_matches (
                              match_id     BIGINT UNSIGNED     PRIMARY KEY,        -- 64-bit Valve id
                              start_time   DATETIME            NOT NULL,
                              duration_sec MEDIUMINT UNSIGNED  NOT NULL,
                              pre_game_sec MEDIUMINT UNSIGNED  NOT NULL,
                              radiant_win  BOOLEAN             NOT NULL,
                              radiant_score SMALLINT UNSIGNED,
                              dire_score   SMALLINT UNSIGNED,
                              cluster      SMALLINT UNSIGNED,
                              lobby_type   TINYINT,
                              game_mode    TINYINT,
                              engine       TINYINT,
                              created_at   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE fact_team_results (
                                   match_id        BIGINT UNSIGNED NOT NULL,
                                   is_radiant      BOOLEAN         NOT NULL,
                                   tower_status    SMALLINT UNSIGNED,
                                   barracks_status SMALLINT UNSIGNED,
                                   net_worth       MEDIUMINT UNSIGNED,
                                   PRIMARY KEY (match_id, is_radiant),
                                   CONSTRAINT fk_team_match
                                       FOREIGN KEY (match_id) REFERENCES fact_matches(match_id)
                                           ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS fact_player_match;

CREATE TABLE fact_player_match (
                                   id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                                   match_id       BIGINT UNSIGNED NOT NULL,
                                   account_id     BIGINT UNSIGNED NOT NULL,  -- Steam32
                                   player_slot    TINYINT UNSIGNED NOT NULL,
                                   is_radiant     BOOLEAN         NOT NULL,
                                   hero_id        SMALLINT UNSIGNED NOT NULL,
                                   kills          SMALLINT UNSIGNED,
                                   deaths         SMALLINT UNSIGNED,
                                   assists        SMALLINT UNSIGNED,
                                   gpm            SMALLINT UNSIGNED,
                                   xpm            SMALLINT UNSIGNED,
                                   hero_damage    INT UNSIGNED,
                                   tower_damage   INT UNSIGNED,
                                   hero_healing   INT UNSIGNED,
                                   net_worth      MEDIUMINT UNSIGNED,
                                   level          TINYINT UNSIGNED,
                                   last_hits      SMALLINT UNSIGNED,
                                   denies         SMALLINT UNSIGNED,
                                   leaver_status  TINYINT,
                                   PRIMARY KEY (id),
                                   INDEX idx_player_match (match_id, account_id),
                                   INDEX idx_match_hero    (match_id, hero_id),
                                   CONSTRAINT fk_player_match
                                       FOREIGN KEY (match_id) REFERENCES fact_matches(match_id)
                                           ON DELETE CASCADE,
                                   CONSTRAINT fk_player_hero
                                       FOREIGN KEY (hero_id) REFERENCES dim_heroes(hero_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE fact_player_items (
                                   match_id    BIGINT UNSIGNED  NOT NULL,
                                   hero_id     SMALLINT UNSIGNED NOT NULL,          -- ← додано
                                   account_id  BIGINT UNSIGNED  NOT NULL,
                                   slot_index  TINYINT UNSIGNED NOT NULL,           -- 0-5 main, 6-8 backpack, 9 neutral
                                   item_id     SMALLINT UNSIGNED NOT NULL,
                                   PRIMARY KEY (match_id, hero_id, slot_index),     -- ← PK через hero_id
                                   CONSTRAINT fk_items_player
                                       FOREIGN KEY (match_id, hero_id)
                                           REFERENCES fact_player_match (match_id, hero_id)
                                           ON DELETE CASCADE,
                                   CONSTRAINT fk_items_dim
                                       FOREIGN KEY (item_id)
                                           REFERENCES dim_items (item_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;



CREATE TABLE fact_ability_upgrades (
                                       match_id      BIGINT UNSIGNED  NOT NULL,
                                       hero_id       SMALLINT UNSIGNED NOT NULL,        -- ← додано
                                       account_id    BIGINT UNSIGNED  NOT NULL,
                                       sequence      TINYINT UNSIGNED  NOT NULL,        -- 1-30
                                       ability_name  VARCHAR(64)      NOT NULL,
                                       game_time_s   MEDIUMINT UNSIGNED NOT NULL,
                                       level_granted TINYINT UNSIGNED  NOT NULL,
                                       PRIMARY KEY (match_id, hero_id, sequence),       -- ← PK через hero_id
                                       CONSTRAINT fk_upgrades_player
                                           FOREIGN KEY (match_id, hero_id)
                                               REFERENCES fact_player_match (match_id, hero_id)
                                               ON DELETE CASCADE,
                                       CONSTRAINT fk_upgrades_ability
                                           FOREIGN KEY (ability_name)
                                               REFERENCES dim_abilities (ability_name)
                                               ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


CREATE TABLE fact_picks_bans (
                                 match_id  BIGINT UNSIGNED NOT NULL,
                                 order_idx TINYINT UNSIGNED NOT NULL,                -- 0–x
                                 is_pick   BOOLEAN NOT NULL,
                                 team      BOOLEAN NOT NULL,                         -- TRUE = Radiant
                                 hero_id   SMALLINT UNSIGNED NOT NULL,
                                 PRIMARY KEY (match_id, order_idx),
                                 CONSTRAINT fk_draft_match
                                     FOREIGN KEY (match_id) REFERENCES fact_matches(match_id)
                                         ON DELETE CASCADE,
                                 CONSTRAINT fk_draft_hero
                                     FOREIGN KEY (hero_id) REFERENCES dim_heroes(hero_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


ALTER TABLE fact_player_match
    ADD INDEX idx_account_recent (account_id, match_id DESC);

ALTER TABLE fact_matches
    ADD INDEX idx_starttime (start_time DESC);

ALTER TABLE fact_picks_bans
    ADD INDEX idx_hero_pickban (hero_id, is_pick);
