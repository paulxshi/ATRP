<?php
/**
 * ATRP Skill Scoring API
 * Tables: skill_sessions, skill_rows, skill_tier_summary
 */
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    loadSkills(isset($_GET['client_id']) ? intval($_GET['client_id']) : null, !empty($_GET['all']));
} elseif ($method === 'POST') {
    saveSkills();
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}

function loadSkills(?int $client_id, bool $all): void {
    if (!$client_id) {
        echo json_encode(['success' => true, 'rows' => [], 'tier_summary' => [], 'session' => null]);
        return;
    }
    try {
        if ($all) {
            $sessions = dbQuery("SELECT * FROM skill_sessions WHERE client_id = ? ORDER BY created_at DESC", [$client_id]);
            foreach ($sessions as &$s) {
                $s['rows']         = dbQuery("SELECT * FROM skill_rows WHERE session_id = ? ORDER BY row_order ASC", [$s['id']]);
                $s['tier_summary'] = dbQuery("SELECT * FROM skill_tier_summary WHERE session_id = ? ORDER BY FIELD(tier,'eye','basic','ident','adv')", [$s['id']]);
            }
            unset($s);
            echo json_encode(['success' => true, 'sessions' => $sessions]);
            return;
        }
        // Prefer the latest submitted session, fall back to any
        $sessions = dbQuery(
            "SELECT * FROM skill_sessions WHERE client_id = ? ORDER BY submitted DESC, created_at DESC LIMIT 1",
            [$client_id]
        );
        if (empty($sessions)) {
            echo json_encode(['success' => true, 'rows' => [], 'tier_summary' => [], 'session' => null]);
            return;
        }
        $session      = $sessions[0];
        $rows         = dbQuery("SELECT * FROM skill_rows WHERE session_id = ? ORDER BY row_order ASC", [$session['id']]);
        $tier_summary = dbQuery("SELECT * FROM skill_tier_summary WHERE session_id = ? ORDER BY FIELD(tier,'eye','basic','ident','adv')", [$session['id']]);
        echo json_encode(['success' => true, 'session' => $session, 'rows' => $rows, 'tier_summary' => $tier_summary]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function saveSkills(): void {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) { echo json_encode(['success' => false, 'error' => 'No data received']); return; }

    $client_id     = isset($input['client_id'])    ? intval($input['client_id'])     : null;
    $rows          = isset($input['rows'])          ? $input['rows']                  : [];
    $submitted     = isset($input['submitted'])     ? (bool)$input['submitted']       : false;
    $session_label = isset($input['session_label']) ? trim($input['session_label'])   : '';

    if (!$client_id) { echo json_encode(['success' => false, 'error' => 'client_id is required']); return; }

    try {
        $pdo = getDBConnection();
        $pdo->beginTransaction();

        // ── Upsert session
        if (!$submitted) {
            $existing = dbQuery("SELECT id FROM skill_sessions WHERE client_id = ? AND submitted = 0 ORDER BY created_at DESC LIMIT 1", [$client_id]);
            if (!empty($existing)) {
                $session_id = $existing[0]['id'];
                dbExecute("UPDATE skill_sessions SET session_label = ?, updated_at = NOW() WHERE id = ?", [$session_label, $session_id]);
                dbExecute("DELETE FROM skill_rows         WHERE session_id = ?", [$session_id]);
                dbExecute("DELETE FROM skill_tier_summary WHERE session_id = ?", [$session_id]);
            } else {
                dbExecute("INSERT INTO skill_sessions (client_id, session_label, submitted) VALUES (?, ?, 0)", [$client_id, $session_label]);
                $session_id = $pdo->lastInsertId();
            }
        } else {
            dbExecute("INSERT INTO skill_sessions (client_id, session_label, submitted) VALUES (?, ?, 1)", [$client_id, $session_label]);
            $session_id = $pdo->lastInsertId();
            dbExecute("DELETE FROM skill_sessions WHERE client_id = ? AND submitted = 0 AND id != ?", [$client_id, $session_id]);
        }

        // ── Insert rows + accumulate per-tier totals
        $allowed_tiers = ['eye', 'basic', 'ident', 'adv'];
        $tier_agg      = [];

        foreach ($rows as $order => $row) {
            $tier     = in_array($row['tier'] ?? '', $allowed_tiers) ? $row['tier'] : null;
            $skill    = isset($row['skill'])    ? trim($row['skill'])               : '';
            $attempts = isset($row['attempts']) ? max(0, intval($row['attempts']))  : 0;
            $succ_raw = isset($row['succ'])     ? trim($row['succ'])                : '';
            $succ_val = $succ_raw !== ''        ? floatval($succ_raw)               : null;
            $unit     = isset($row['unit'])     ? trim($row['unit'])                : 'attempts';

            dbExecute(
                "INSERT INTO skill_rows (session_id, row_order, tier, skill, attempts, successful, unit) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [$session_id, $order, $tier, $skill, $attempts, $succ_val, $unit]
            );

            if ($tier !== null) {
                if (!isset($tier_agg[$tier])) $tier_agg[$tier] = ['count' => 0, 'attempts' => 0, 'successful' => 0.0];
                $tier_agg[$tier]['count']++;
                $tier_agg[$tier]['attempts'] += $attempts;
                if ($succ_val !== null) $tier_agg[$tier]['successful'] += $succ_val;
            }
        }

        // ── Compute + store tier summary
        foreach ($tier_agg as $tier => $agg) {
            $score_pct = ($agg['attempts'] > 0)
                ? round(min(100, ($agg['successful'] / $agg['attempts']) * 100), 2)
                : null;
            dbExecute(
                "INSERT INTO skill_tier_summary (session_id, client_id, tier, drill_count, total_attempts, total_successful, score_pct)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE drill_count=VALUES(drill_count), total_attempts=VALUES(total_attempts),
                     total_successful=VALUES(total_successful), score_pct=VALUES(score_pct)",
                [$session_id, $client_id, $tier, $agg['count'], $agg['attempts'], $agg['successful'], $score_pct]
            );
        }

        // ── Return saved tier summary
        $tier_summary = dbQuery(
            "SELECT * FROM skill_tier_summary WHERE session_id = ? ORDER BY FIELD(tier,'eye','basic','ident','adv')",
            [$session_id]
        );

        $pdo->commit();

        echo json_encode([
            'success'      => true,
            'session_id'   => $session_id,
            'submitted'    => $submitted,
            'tier_summary' => $tier_summary,
            'message'      => $submitted ? 'Session submitted successfully' : 'Draft saved successfully'
        ]);

    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => 'Save failed: ' . $e->getMessage()]);
    }
}