<?php
/**
 * ATRP BCM (Continuous Measurement) API
 * Tables: bcm_behaviors, bcm_session_frequencies, bcm_functions, bcm_notes
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':    loadBcm();   break;
    case 'POST':   saveBcm();   break;
    case 'DELETE': deleteBcm(); break;
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}

// ─────────────────────────────────────────────────────
// LOAD
// ─────────────────────────────────────────────────────
function loadBcm() {
    $client_id = isset($_GET['client_id']) ? intval($_GET['client_id']) : null;

    if (!$client_id) {
        echo json_encode(['success' => true, 'behaviors' => [], 'notes' => '']);
        return;
    }

    try {
        // Load behavior rows
        $behaviors = dbQuery(
            "SELECT id, antecedent, behavior FROM bcm_behaviors
             WHERE client_id = ? ORDER BY id ASC",
            [$client_id]
        );

        foreach ($behaviors as &$b) {
            $b['sessions']  = [];
            $b['functions'] = [];

            // Session frequencies — each row is one session for this behavior
            $freqs = dbQuery(
                "SELECT session_number, frequency FROM bcm_session_frequencies
                 WHERE behavior_id = ? ORDER BY session_number ASC",
                [$b['id']]
            );
            foreach ($freqs as $f) {
                $b['sessions'][$f['session_number']] = intval($f['frequency']);
            }

            // Functions
            $fns = dbQuery(
                "SELECT function_name, is_checked FROM bcm_functions
                 WHERE behavior_id = ?",
                [$b['id']]
            );
            foreach ($fns as $fn) {
                $b['functions'][$fn['function_name']] = (bool) $fn['is_checked'];
            }
        }
        unset($b);

        // Notes
        $noteRows = dbQuery(
            "SELECT notes FROM bcm_notes WHERE client_id = ? LIMIT 1",
            [$client_id]
        );
        $notes = !empty($noteRows) ? $noteRows[0]['notes'] : '';

        echo json_encode([
            'success'   => true,
            'behaviors' => $behaviors,
            'notes'     => $notes
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// ─────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────
function saveBcm() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        echo json_encode(['success' => false, 'error' => 'Invalid input']);
        return;
    }

    $client_id   = isset($input['client_id']) ? intval($input['client_id']) : null;
    $behaviors   = isset($input['behaviors']) ? $input['behaviors']         : [];
    $sessionNums = isset($input['sessions'])  ? $input['sessions']          : [];
    $notes       = isset($input['notes'])     ? trim($input['notes'])       : '';

    if (!$client_id) {
        echo json_encode(['success' => false, 'error' => 'Client ID is required']);
        return;
    }

    try {
        // Clear existing BCM data for this client (cascades handle child rows)
        dbExecute("DELETE FROM bcm_behaviors WHERE client_id = ?", [$client_id]);

        // Insert each behavior row
        foreach ($behaviors as $index => $b) {
            $antecedent = isset($b['antecedent']) ? trim($b['antecedent']) : '';
            $behavior   = isset($b['behavior'])   ? trim($b['behavior'])   : '';

            dbExecute(
                "INSERT INTO bcm_behaviors (client_id, antecedent, behavior) VALUES (?, ?, ?)",
                [$client_id, $antecedent, $behavior]
            );
            $behavior_id = dbLastInsertId();

            // Insert one row per session into bcm_session_frequencies
            foreach ($sessionNums as $sessionIndex => $sessionNum) {
                // frequency is keyed 1-based in JS (index+1)
                $freq = isset($b['sessions'][$sessionIndex + 1])
                    ? intval($b['sessions'][$sessionIndex + 1])
                    : 0;

                dbExecute(
                    "INSERT INTO bcm_session_frequencies
                        (client_id, behavior_id, session_number, frequency)
                     VALUES (?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        frequency = VALUES(frequency),
                        session_number = VALUES(session_number)",
                    [$client_id, $behavior_id, intval($sessionNum), $freq]
                );
            }

            // Insert function checkboxes
            $allowed = ['Sensory', 'Escape', 'Attention', 'Tangible'];
            if (!empty($b['functions'])) {
                foreach ($b['functions'] as $fnName => $checked) {
                    if (in_array($fnName, $allowed)) {
                        dbExecute(
                            "INSERT INTO bcm_functions (behavior_id, function_name, is_checked)
                             VALUES (?, ?, ?)
                             ON DUPLICATE KEY UPDATE is_checked = VALUES(is_checked)",
                            [$behavior_id, $fnName, $checked ? 1 : 0]
                        );
                    }
                }
            }
        }

        // Upsert notes
        dbExecute(
            "INSERT INTO bcm_notes (client_id, notes) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE notes = VALUES(notes)",
            [$client_id, $notes]
        );

        echo json_encode(['success' => true, 'message' => 'BCM data saved successfully']);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// ─────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────
function deleteBcm() {
    $input     = json_decode(file_get_contents('php://input'), true);
    $client_id = isset($input['client_id']) ? intval($input['client_id']) : null;

    if (!$client_id) {
        echo json_encode(['success' => false, 'error' => 'Client ID is required']);
        return;
    }

    try {
        dbExecute("DELETE FROM bcm_behaviors WHERE client_id = ?", [$client_id]);
        dbExecute("DELETE FROM bcm_notes     WHERE client_id = ?", [$client_id]);
        echo json_encode(['success' => true, 'message' => 'BCM data deleted']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}