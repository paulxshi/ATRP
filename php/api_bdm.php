<?php
/**
 * ATRP Behavior Data API
 * Handles BCM (Continuous) and BDM (Discontinuous) measurement data
 * Uses universal config from config.php
 */

// Include universal database config
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle request
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    getBehaviorData();
} elseif ($method === 'POST') {
    saveBehaviorData();
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}

/**
 * Get behavior data for a client
 */
function getBehaviorData() {
    $client_id = isset($_GET['client_id']) ? intval($_GET['client_id']) : null;
    
    try {
        if (!$client_id) {
            // Return empty structure if no client
            echo json_encode([
                'success' => true,
                'behaviors' => [],
                'notes' => ''
            ]);
            return;
        }
        
        // Get behaviors
        $behaviors = dbQuery(
            "SELECT * FROM behaviors WHERE client_id = ? ORDER BY id",
            [$client_id]
        );
        
        // Get notes
        $notesData = dbQuery(
            "SELECT notes FROM client_notes WHERE client_id = ? ORDER BY id DESC LIMIT 1",
            [$client_id]
        );
        
        $notes = !empty($notesData) ? $notesData[0]['notes'] : '';
        
        echo json_encode([
            'success' => true,
            'behaviors' => $behaviors,
            'notes' => $notes
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

/**
 * Save behavior data (BCM and BDM)
 */
function saveBehaviorData() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'error' => 'No data provided']);
        return;
    }
    
    $client_id = isset($input['client_id']) ? intval($input['client_id']) : null;
    $behaviors = isset($input['behaviors']) ? $input['behaviors'] : [];
    $notes = isset($input['notes']) ? trim($input['notes']) : '';
    $sessions = isset($input['sessions']) ? $input['sessions'] : [];
    
    if (!$client_id) {
        echo json_encode(['success' => false, 'error' => 'Client ID is required']);
        return;
    }
    
    try {
        // Start transaction
        $pdo = getDBConnection();
        $pdo->beginTransaction();
        
        // Delete existing behaviors for this client
        dbExecute("DELETE FROM behaviors WHERE client_id = ?", [$client_id]);
        
        // Insert new behaviors
        if (!empty($behaviors)) {
            foreach ($behaviors as $behavior) {
                $antecedent = isset($behavior['antecedent']) ? trim($behavior['antecedent']) : '';
                $behavior_name = isset($behavior['behavior']) ? trim($behavior['behavior']) : '';
                $sessions_json = isset($behavior['sessions']) ? json_encode($behavior['sessions']) : '{}';
                $functions_json = isset($behavior['functions']) ? json_encode($behavior['functions']) : '{}';
                
                dbExecute(
                    "INSERT INTO behaviors (client_id, antecedent, behavior, sessions, functions) VALUES (?, ?, ?, ?, ?)",
                    [$client_id, $antecedent, $behavior_name, $sessions_json, $functions_json]
                );
            }
        }
        
        // Save or update notes
        if ($notes !== '') {
            // Delete old notes
            dbExecute("DELETE FROM client_notes WHERE client_id = ?", [$client_id]);
            // Insert new notes
            dbExecute("INSERT INTO client_notes (client_id, notes) VALUES (?, ?)", [$client_id, $notes]);
        }
        
        // Commit transaction
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Data saved successfully'
        ]);
        
    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        echo json_encode(['success' => false, 'error' => 'Failed to save data: ' . $e->getMessage()]);
    }
}
