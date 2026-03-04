<?php
/**
 * ATRP Client Info API
 * Handles CRUD operations for client information (info-container)
 * Uses universal config from config.php
 */

// Include universal database config
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Handle request
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getClients();
        break;
    case 'POST':
        saveClient();
        break;
    case 'PUT':
        updateClient();
        break;
    case 'DELETE':
        deleteClient();
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid request method']);
        break;
}

/**
 * Get all clients or a specific client
 */
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

/**
 * Save a new client with info-container data
 * Uses full_name as a single field — no first/last split
 */
function saveClient() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $full_name = isset($input['full_name']) ? trim($input['full_name']) : '';
    $age = isset($input['age']) ? trim($input['age']) : null;
    $diagnosis = isset($input['diagnosis']) ? trim($input['diagnosis']) : null;
    $recorder = isset($input['recorder']) ? trim($input['recorder']) : null;
    $report_start_date = isset($input['report_start_date']) ? trim($input['report_start_date']) : null;
    $report_end_date = isset($input['report_end_date']) ? trim($input['report_end_date']) : null;
    
    if (empty($full_name)) {
        echo json_encode(['success' => false, 'error' => 'Client name is required']);
        return;
    }
    
    try {
        $sql = "INSERT INTO clients (full_name, age, diagnosis, recorder, report_start_date, report_end_date) 
                VALUES (?, ?, ?, ?, ?, ?)";
        dbExecute($sql, [$full_name, $age, $diagnosis, $recorder, $report_start_date, $report_end_date]);
        
        $client_id = dbLastInsertId();
        
        echo json_encode([
            'success' => true,
            'id' => $client_id,
            'message' => 'Client created successfully'
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Failed to create client: ' . $e->getMessage()]);
    }
}

/**
 * Update an existing client
 */
function updateClient() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $client_id = isset($input['client_id']) ? intval($input['client_id']) : null;
    
    if (!$client_id) {
        echo json_encode(['success' => false, 'error' => 'Client ID is required']);
        return;
    }
    
    $fields = [];
    $params = [];
    
    $allowed_fields = ['full_name', 'age', 'diagnosis', 'recorder', 'report_start_date', 'report_end_date'];
    
    foreach ($allowed_fields as $field) {
        if (isset($input[$field])) {
            $fields[] = "$field = ?";
            $params[] = trim($input[$field]);
        }
    }
    
    if (empty($fields)) {
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }
    
    $params[] = $client_id;
    
    try {
        $sql = "UPDATE clients SET " . implode(', ', $fields) . " WHERE id = ?";
        dbExecute($sql, $params);
        
        echo json_encode([
            'success' => true,
            'message' => 'Client updated successfully'
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Failed to update client: ' . $e->getMessage()]);
    }
}

/**
 * Delete a client
 */
function deleteClient() {
    $input = json_decode(file_get_contents('php://input'), true);
    $client_id = isset($input['client_id']) ? intval($input['client_id']) : null;
    
    if (!$client_id) {
        echo json_encode(['success' => false, 'error' => 'Client ID is required']);
        return;
    }
    
    try {
        dbExecute("DELETE FROM clients WHERE id = ?", [$client_id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Client deleted successfully'
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Failed to delete client: ' . $e->getMessage()]);
    }
}