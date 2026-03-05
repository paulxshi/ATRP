<?php
/**
 * ATRP Skill Scoring API
 * Tables: skill_sessions, skill_rows
 *
 * GET  api_skills.php?client_id=X          → load latest session for a client
 * GET  api_skills.php?client_id=X&all=1    → load all sessions for a client
 * POST api_skills.php                       → save / upsert a skill session
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $client_id = isset($_GET['client_id']) ? intval($_GET['client_id']) : null;
    $all       = !empty($_GET['all']);
    loadSkills($client_id, $all);
} elseif ($method === 'POST') {
    saveSkills();
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}

// ─────────────────────────────────────────────────────
// LOAD
// ─────────────────────────────────────────────────────
function loadSkills(?int $client_id, bool $all): void {
    if (!$client_id) {
        echo json_encode(['success' => true, 'rows' => [], 'session' => null]);
        return;
    }

    try {
        if ($all) {
            // All sessions for history view
            $sessions = dbQuery(
                "SELECT * FROM skill_sessions
                 WHERE client_id = ?
                 ORDER BY created_at DESC",
                [$client_id]
            );
            foreach ($sessions as &$s) {
                $s['rows'] = dbQuery(
                    "SELECT * FROM skill_rows WHERE session_id = ? ORDER BY row_order ASC",
                    [$s['id']]
                );
            }
            unset($s);
            echo json_encode(['success' => true, 'sessions' => $sessions]);
            return;
        }

        // Latest session only
        $sessions = dbQuery(
            "SELECT * FROM skill_sessions
             WHERE client_id = ?
             ORDER BY created_at DESC
             LIMIT 1",
            [$client_id]
        );

        if (empty($sessions)) {
            echo json_encode(['success' => true, 'rows' => [], 'session' => null]);
            return;
        }

        $session = $sessions[0];
        $rows    = dbQuery(
            "SELECT * FROM skill_rows WHERE session_id = ? ORDER BY row_order ASC",
            [$session['id']]
        );

        echo json_encode([
            'success' => true,
            'session' => $session,
            'rows'    => $rows
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// ─────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────
function saveSkills(): void {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        echo json_encode(['success' => false, 'error' => 'No data received']);
        return;
    }

    $client_id   = isset($input['client_id'])   ? intval($input['client_id'])       : null;
    $rows        = isset($input['rows'])         ? $input['rows']                    : [];
    $submitted   = isset($input['submitted'])    ? (bool)$input['submitted']         : false;
    $session_label = isset($input['session_label']) ? trim($input['session_label'])  : '';

    if (!$client_id) {
        echo json_encode(['success' => false, 'error' => 'client_id is required']);
        return;
    }

    try {
        $pdo = getDBConnection();
        $pdo->beginTransaction();

        // Each "Save & Submit" creates a NEW session row so history is preserved.
        // Plain "save" (submitted=false) upserts the most recent draft session.
        if (!$submitted) {
            // Find an existing draft session for this client
            $existing = dbQuery(
                "SELECT id FROM skill_sessions
                 WHERE client_id = ? AND submitted = 0
                 ORDER BY created_at DESC LIMIT 1",
                [$client_id]
            );

            if (!empty($existing)) {
                $session_id = $existing[0]['id'];
                dbExecute(
                    "UPDATE skill_sessions SET session_label = ?, updated_at = NOW()
                     WHERE id = ?",
                    [$session_label, $session_id]
                );
                dbExecute("DELETE FROM skill_rows WHERE session_id = ?", [$session_id]);
            } else {
                dbExecute(
                    "INSERT INTO skill_sessions (client_id, session_label, submitted)
                     VALUES (?, ?, 0)",
                    [$client_id, $session_label]
                );
                $session_id = $pdo->lastInsertId();
            }
        } else {
            // Submit — always create a fresh completed session
            dbExecute(
                "INSERT INTO skill_sessions (client_id, session_label, submitted)
                 VALUES (?, ?, 1)",
                [$client_id, $session_label]
            );
            $session_id = $pdo->lastInsertId();

            // Mark any lingering draft session as abandoned (clean-up)
            dbExecute(
                "DELETE FROM skill_sessions
                 WHERE client_id = ? AND submitted = 0 AND id != ?",
                [$client_id, $session_id]
            );
        }

        // Insert skill rows
        $allowed_tiers = ['eye', 'basic', 'ident', 'adv'];
        foreach ($rows as $order => $row) {
            $tier     = in_array($row['tier'] ?? '', $allowed_tiers) ? $row['tier'] : null;
            $skill    = isset($row['skill'])    ? trim($row['skill'])              : '';
            $attempts = isset($row['attempts']) ? max(0, intval($row['attempts'])) : 0;
            $succ     = isset($row['succ'])     ? trim($row['succ'])               : '';
            $unit     = isset($row['unit'])     ? trim($row['unit'])               : 'attempts';

            dbExecute(
                "INSERT INTO skill_rows
                    (session_id, row_order, tier, skill, attempts, successful, unit)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [$session_id, $order, $tier, $skill, $attempts, $succ !== '' ? floatval($succ) : null, $unit]
            );
        }

        $pdo->commit();

        echo json_encode([
            'success'    => true,
            'session_id' => $session_id,
            'submitted'  => $submitted,
            'message'    => $submitted
                ? 'Session submitted successfully'
                : 'Draft saved successfully'
        ]);

    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => 'Save failed: ' . $e->getMessage()]);
    }
}