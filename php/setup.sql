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