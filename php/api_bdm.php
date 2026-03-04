<?php
/**
 * ATRP — BDM (Discontinuous Measurement) API
 * Endpoints:
 *   GET  api_bdm.php?client_id=X          → load all BDM sessions for a client
 *   POST api_bdm.php                       → save BDM sessions for a client
 *   GET  api_bdm.php?report=1&client_id=X → pull combined BCM+BDM data for write-up
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (!empty($_GET['report']) && !empty($_GET['client_id'])) {
        getFullReport(intval($_GET['client_id']));
    } else {
        getBdmSessions(isset($_GET['client_id']) ? intval($_GET['client_id']) : null);
    }
} elseif ($method === 'POST') {
    saveBdmSessions();
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}

// ─────────────────────────────────────────────────────────────
//  GET — Load BDM sessions for a client
// ─────────────────────────────────────────────────────────────
function getBdmSessions(?int $client_id): void {
    if (!$client_id) {
        echo json_encode(['success' => true, 'sessions' => [], 'notes' => '']);
        return;
    }

    try {
        $sessions = dbQuery(
            "SELECT * FROM bdm_sessions WHERE client_id = ? ORDER BY session_number",
            [$client_id]
        );

        foreach ($sessions as &$session) {
            $intervals = dbQuery(
                "SELECT interval_number, result
                 FROM bdm_intervals
                 WHERE bdm_session_id = ?
                 ORDER BY interval_number",
                [$session['id']]
            );
            $session['intervals'] = [];
            foreach ($intervals as $interval) {
                $session['intervals'][$interval['interval_number']] = $interval['result'];
            }
        }
        unset($session);

        // bdm_notes table: one row per client (client_id is UNIQUE)
        $notesRow = dbQuery(
            "SELECT notes FROM bdm_notes WHERE client_id = ? LIMIT 1",
            [$client_id]
        );
        $notes = $notesRow[0]['notes'] ?? '';

        echo json_encode([
            'success'  => true,
            'sessions' => $sessions,
            'notes'    => $notes
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// ─────────────────────────────────────────────────────────────
//  POST — Save BDM sessions for a client
// ─────────────────────────────────────────────────────────────
function saveBdmSessions(): void {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        echo json_encode(['success' => false, 'error' => 'No data provided']);
        return;
    }

    $client_id = isset($input['client_id']) ? intval($input['client_id']) : null;
    $sessions  = $input['sessions']  ?? [];
    $notes     = trim($input['notes'] ?? '');

    if (!$client_id) {
        echo json_encode(['success' => false, 'error' => 'client_id is required']);
        return;
    }

    try {
        $pdo = getDBConnection();
        $pdo->beginTransaction();

        // Wipe existing sessions — CASCADE deletes bdm_intervals automatically
        dbExecute("DELETE FROM bdm_sessions WHERE client_id = ?", [$client_id]);

        foreach ($sessions as $session) {
            $session_number = intval($session['session_number'] ?? 0);
            $session_date   = !empty($session['session_date']) ? $session['session_date'] : null;
            $interval_count = intval($session['interval_count'] ?? 10);

            dbExecute(
                "INSERT INTO bdm_sessions (client_id, session_number, session_date, interval_count)
                 VALUES (?, ?, ?, ?)",
                [$client_id, $session_number, $session_date, $interval_count]
            );

            $bdm_session_id = $pdo->lastInsertId();

            // bdm_intervals schema: id, bdm_session_id, interval_number, result
            // NO client_id column in this table
            $intervals = $session['intervals'] ?? [];
            foreach ($intervals as $num => $result) {
                $num    = intval($num);
                $result = in_array($result, ['+', '-']) ? $result : '';

                dbExecute(
                    "INSERT INTO bdm_intervals (bdm_session_id, interval_number, result)
                     VALUES (?, ?, ?)",
                    [$bdm_session_id, $num, $result]
                );
            }
        }

        // bdm_notes: UPSERT — client_id is UNIQUE so this is safe
        if ($notes !== '') {
            dbExecute(
                "INSERT INTO bdm_notes (client_id, notes)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE notes = VALUES(notes)",
                [$client_id, $notes]
            );
        } else {
            dbExecute("DELETE FROM bdm_notes WHERE client_id = ?", [$client_id]);
        }

        $pdo->commit();

        echo json_encode([
            'success'        => true,
            'message'        => 'BDM data saved successfully',
            'sessions_saved' => count($sessions)
        ]);

    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => 'Save failed: ' . $e->getMessage()]);
    }
}

// ─────────────────────────────────────────────────────────────
//  GET report=1 — Combined BCM + BDM data for write-up page
// ─────────────────────────────────────────────────────────────
function getFullReport(int $client_id): void {
    try {
        $clients = dbQuery("SELECT * FROM clients WHERE id = ?", [$client_id]);
        if (empty($clients)) {
            echo json_encode(['success' => false, 'error' => 'Client not found']);
            return;
        }

        // BCM behaviors — uses correct table names: bcm_frequencies, bcm_sessions
        $bcm_behaviors = dbQuery(
            "SELECT b.id, b.antecedent, b.behavior,
                    GROUP_CONCAT(
                        CONCAT(s.session_number, ':', f.frequency)
                        ORDER BY s.session_number
                    ) AS freq_by_session
             FROM bcm_behaviors  b
             LEFT JOIN bcm_frequencies f ON f.behavior_id = b.id
             LEFT JOIN bcm_sessions    s ON s.id           = f.session_id
             WHERE b.client_id = ?
             GROUP BY b.id",
            [$client_id]
        );

        // BDM summary via view
        $bdm_summary = dbQuery(
            "SELECT * FROM v_bdm_summary WHERE client_id = ?",
            [$client_id]
        );

        // Notes from their respective tables
        $bcm_notes_row = dbQuery("SELECT notes FROM bcm_notes WHERE client_id = ? LIMIT 1", [$client_id]);
        $bdm_notes_row = dbQuery("SELECT notes FROM bdm_notes WHERE client_id = ? LIMIT 1", [$client_id]);

        echo json_encode([
            'success'       => true,
            'client'        => $clients[0],
            'bcm_behaviors' => $bcm_behaviors,
            'bdm_summary'   => $bdm_summary,
            'bcm_notes'     => $bcm_notes_row[0]['notes'] ?? '',
            'bdm_notes'     => $bdm_notes_row[0]['notes'] ?? ''
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}