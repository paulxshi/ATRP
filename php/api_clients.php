<?php
/**
 * ATRP Client Info API
 * Handles CRUD operations for client information (info-container)
 * Uses universal config from config.php
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':    getClients();    break;
    case 'POST':   saveClient();    break;
    case 'PUT':    updateClient();  break;
    case 'DELETE': deleteClient();  break;
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}

// ─────────────────────────────────────────────────────
// GET — all clients OR one client by ID
// ─────────────────────────────────────────────────────
function getClients() {
    $client_id = isset($_GET['client_id']) ? intval($_GET['client_id']) : null;

    try {
        if ($client_id) {
            $clients = dbQuery("SELECT * FROM clients WHERE id = ?", [$client_id]);
            if (!empty($clients)) {
                echo json_encode(['success' => true, 'client' => $clients[0]]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Client not found']);
            }
        } else {
            $clients = dbQuery("SELECT * FROM clients ORDER BY full_name");
            echo json_encode(['success' => true, 'clients' => $clients]);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// ─────────────────────────────────────────────────────
// POST — create a new client
// ─────────────────────────────────────────────────────
function saveClient() {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $full_name         = isset($input['full_name'])         ? trim($input['full_name'])         : '';
    $nickname          = isset($input['nickname'])          ? trim($input['nickname'])          : null;
    $age               = isset($input['age'])               ? trim($input['age'])               : null;
    $diagnosis         = isset($input['diagnosis'])         ? trim($input['diagnosis'])         : null;
    $recorder          = isset($input['recorder'])          ? trim($input['recorder'])          : null;
    $report_start_date = isset($input['report_start_date']) ? trim($input['report_start_date']) : null;
    $report_end_date   = isset($input['report_end_date'])   ? trim($input['report_end_date'])   : null;

    if (empty($full_name)) {
        echo json_encode(['success' => false, 'error' => 'Client name is required']);
        return;
    }

    // ── Prevent exact-duplicate full names ──────────────────────
    try {
        $existing = dbQuery("SELECT id FROM clients WHERE full_name = ? LIMIT 1", [$full_name]);
        if (!empty($existing)) {
            // Return the existing client ID so the JS can reuse it
            echo json_encode([
                'success'   => true,
                'id'        => $existing[0]['id'],
                'duplicate' => true,
                'message'   => 'Client already exists — loaded existing record'
            ]);
            return;
        }

        $sql = "INSERT INTO clients
                    (full_name, nickname, age, diagnosis, recorder, report_start_date, report_end_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        dbExecute($sql, [$full_name, $nickname ?: null, $age, $diagnosis, $recorder,
                         $report_start_date, $report_end_date]);

        echo json_encode([
            'success' => true,
            'id'      => dbLastInsertId(),
            'message' => 'Client created successfully'
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Failed to create client: ' . $e->getMessage()]);
    }
}

// ─────────────────────────────────────────────────────
// PUT — update an existing client
// ─────────────────────────────────────────────────────
function updateClient() {
    $input     = json_decode(file_get_contents('php://input'), true);
    $client_id = isset($input['client_id']) ? intval($input['client_id']) : null;

    if (!$client_id) {
        echo json_encode(['success' => false, 'error' => 'Client ID is required']);
        return;
    }

    $allowed_fields = [
        'full_name', 'nickname', 'age', 'diagnosis',
        'recorder', 'report_start_date', 'report_end_date'
    ];

    $fields = [];
    $params = [];

    foreach ($allowed_fields as $field) {
        if (array_key_exists($field, $input)) {
            $fields[] = "$field = ?";
            $params[] = trim((string) $input[$field]);
        }
    }

    if (empty($fields)) {
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    $params[] = $client_id;

    try {
        dbExecute("UPDATE clients SET " . implode(', ', $fields) . " WHERE id = ?", $params);
        echo json_encode(['success' => true, 'message' => 'Client updated successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Failed to update client: ' . $e->getMessage()]);
    }
}

// ─────────────────────────────────────────────────────
// DELETE — remove a client and all linked data
// ─────────────────────────────────────────────────────
function deleteClient() {
    $input     = json_decode(file_get_contents('php://input'), true);
    $client_id = isset($input['client_id']) ? intval($input['client_id']) : null;

    if (!$client_id) {
        echo json_encode(['success' => false, 'error' => 'Client ID is required']);
        return;
    }

    try {
        dbExecute("DELETE FROM clients WHERE id = ?", [$client_id]);
        echo json_encode(['success' => true, 'message' => 'Client deleted successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Failed to delete client: ' . $e->getMessage()]);
    }
}