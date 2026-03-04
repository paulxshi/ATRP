-- ============================================
-- ATRP Database Setup Script (Full)
-- Database: atrp_database
-- ============================================

-- ── 1. Clients ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    full_name         VARCHAR(255) NOT NULL,
    age               VARCHAR(50),
    diagnosis         VARCHAR(255),
    recorder          VARCHAR(255),
    report_start_date DATE,
    report_end_date   DATE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_full_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. BCM Sessions ───────────────────────────────────
--  One row per session column in the UI.
--  Linked to a client via client_id.
CREATE TABLE IF NOT EXISTS bcm_sessions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    client_id      INT NOT NULL,
    session_number INT NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. BCM Behaviors ──────────────────────────────────
--  One row per behavior row in the UI.
--  Linked to a client via client_id.
CREATE TABLE IF NOT EXISTS bcm_behaviors (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    client_id   INT NOT NULL,
    antecedent  TEXT,
    behavior    VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. BCM Session Frequencies ────────────────────────
--  Frequency count per behavior × session pair.
CREATE TABLE IF NOT EXISTS bcm_frequencies (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    behavior_id INT NOT NULL,
    session_id  INT NOT NULL,
    frequency   INT NOT NULL DEFAULT 0,
    FOREIGN KEY (behavior_id) REFERENCES bcm_behaviors(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id)  REFERENCES bcm_sessions(id)  ON DELETE CASCADE,
    UNIQUE KEY uq_behavior_session (behavior_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. BCM Functions ──────────────────────────────────
--  Which function checkboxes are ticked per behavior row.
CREATE TABLE IF NOT EXISTS bcm_functions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    behavior_id   INT NOT NULL,
    function_name ENUM('Sensory','Escape','Attention','Tangible') NOT NULL,
    is_checked    TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (behavior_id) REFERENCES bcm_behaviors(id) ON DELETE CASCADE,
    UNIQUE KEY uq_behavior_function (behavior_id, function_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. BCM Notes ──────────────────────────────────────
--  One notes record per client.
CREATE TABLE IF NOT EXISTS bcm_notes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    client_id   INT NOT NULL UNIQUE,
    notes       TEXT,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ATRP Database — BDM Tables (Add-on)
-- Plugs into existing schema (clients table
-- and BCM tables already exist).
-- Database: atrp_database
-- ============================================

-- ── 7. BDM Sessions ───────────────────────────────────
--  One row per session block shown in the BDM panel.
--  Mirrors the pattern of bcm_sessions.
CREATE TABLE IF NOT EXISTS bdm_sessions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    client_id      INT NOT NULL,
    session_number INT NOT NULL,
    session_date   DATE,
    interval_count INT NOT NULL DEFAULT 10,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. BDM Intervals ──────────────────────────────────
--  One row per interval cell (+, -, or empty) per session.
--  interval_number is 1-based (1 through interval_count).
CREATE TABLE IF NOT EXISTS bdm_intervals (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    bdm_session_id  INT NOT NULL,
    interval_number INT NOT NULL,
    result          ENUM('+', '-', '') NOT NULL DEFAULT '',
    FOREIGN KEY (bdm_session_id) REFERENCES bdm_sessions(id) ON DELETE CASCADE,
    UNIQUE KEY uq_session_interval (bdm_session_id, interval_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. BDM Notes ──────────────────────────────────────
--  One notes record per client, mirrors bcm_notes.
CREATE TABLE IF NOT EXISTS bdm_notes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    client_id  INT NOT NULL UNIQUE,
    notes      TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================
-- VIEW: BDM summary per session
-- Use this in your write-up page later.
-- ============================================
CREATE OR REPLACE VIEW v_bdm_summary AS
SELECT
    c.id                                                        AS client_id,
    c.full_name                                                 AS client_name,
    c.diagnosis,
    s.id                                                        AS bdm_session_id,
    s.session_number,
    s.session_date,
    s.interval_count,
    SUM(i.result = '+')                                         AS positive_count,
    SUM(i.result = '-')                                         AS negative_count,
    ROUND(SUM(i.result = '+') / s.interval_count * 100, 1)     AS pct_occurrence
FROM clients       c
JOIN bdm_sessions  s ON s.client_id      = c.id
JOIN bdm_intervals i ON i.bdm_session_id = s.id
GROUP BY c.id, s.id
ORDER BY c.id, s.session_number;


-- ============================================
-- VIEW: Combined BCM + BDM per client
-- One-stop query for generating write-ups.
-- ============================================
CREATE OR REPLACE VIEW v_client_report_summary AS
SELECT
    c.id                            AS client_id,
    c.full_name,
    c.age,
    c.diagnosis,
    c.recorder,
    c.report_start_date,
    c.report_end_date,
    COUNT(DISTINCT bcb.id)          AS total_behaviors_bcm,
    COUNT(DISTINCT bds.id)          AS total_sessions_bdm,
    ROUND(
        AVG(
            (SELECT SUM(i2.result = '+') / s2.interval_count * 100
             FROM bdm_intervals i2
             JOIN bdm_sessions  s2 ON s2.id = i2.bdm_session_id
             WHERE s2.client_id = c.id)
        ), 1
    )                               AS avg_pct_occurrence_bdm
FROM clients          c
LEFT JOIN bcm_behaviors bcb ON bcb.client_id = c.id
LEFT JOIN bdm_sessions  bds ON bds.client_id = c.id
GROUP BY c.id;


-- ============================================
-- SAMPLE QUERY: Full BDM read for a client
-- ============================================
/*
SELECT
    s.session_number,
    s.session_date,
    s.interval_count,
    i.interval_number,
    i.result,
    n.notes
FROM bdm_sessions  s
JOIN bdm_intervals i ON i.bdm_session_id = s.id
LEFT JOIN bdm_notes n ON n.client_id     = s.client_id
WHERE s.client_id = 1
ORDER BY s.session_number, i.interval_number;
*/


-- ============================================
-- SAMPLE QUERY: Side-by-side BCM + BDM
-- for a write-up (joins across both systems)
-- ============================================
/*
SELECT
    c.full_name,
    c.diagnosis,
    -- BCM side
    bcb.antecedent,
    bcb.behavior        AS problem_behavior,
    bcf.frequency,
    bcs.session_number  AS bcm_session,
    -- BDM side
    bds.session_number  AS bdm_session,
    bds.session_date,
    SUM(bdi.result = '+') AS bdm_positives,
    ROUND(SUM(bdi.result = '+') / bds.interval_count * 100, 1) AS bdm_pct
FROM clients          c
JOIN bcm_behaviors    bcb ON bcb.client_id    = c.id
JOIN bcm_frequencies  bcf ON bcf.behavior_id  = bcb.id
JOIN bcm_sessions     bcs ON bcs.id           = bcf.session_id
JOIN bdm_sessions     bds ON bds.client_id    = c.id
JOIN bdm_intervals    bdi ON bdi.bdm_session_id = bds.id
WHERE c.id = 1
GROUP BY c.id, bcb.id, bcs.id, bds.id
ORDER BY bcb.id, bcs.session_number, bds.session_number;
*/
-- ============================================
-- SAMPLE QUERY: Full BCM read for a client
-- ============================================
/*
SELECT
    b.id              AS behavior_id,
    b.antecedent,
    b.behavior        AS problem_behavior,
    s.session_number,
    f.frequency,
    fn.function_name,
    fn.is_checked,
    n.notes
FROM bcm_behaviors  b
JOIN bcm_frequencies f  ON f.behavior_id  = b.id
JOIN bcm_sessions    s  ON s.id           = f.session_id
JOIN bcm_functions   fn ON fn.behavior_id = b.id
LEFT JOIN bcm_notes  n  ON n.client_id    = b.client_id
WHERE b.client_id = 1
ORDER BY b.id, s.session_number, fn.function_name;
*/