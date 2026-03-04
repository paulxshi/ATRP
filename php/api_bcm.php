<?php
/**
 * API for BCM (Continuous Measurement) Data
 * Handles saving and loading BCM behavior data with client connection
 */

header('Content-Type: application/json');
require_once 'db_config.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        loadBcmData();
        break;
    case 'POST':
        saveBcmData();
        break;
    case 'DELETE':
        deleteBcmData();
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

function loadBcmData() {
    global $pdo;
    
    try {
        // Get client_id from query parameter if provided
        $clientId = isset($_GET['client_id']) ? $_GET['client_id'] : null;
        
        if ($clientId) {
            // Get behaviors for specific client
            $stmt = $pdo->prepare("
                SELECT 
                    id,
                    client_id,
                    antecedent,
                    behavior,
                    notes,
                    session_number,
                    frequency,
                    function_type,
                    is_checked,
                    session_date,
                    created_at,
                    updated_at
                FROM bcm_table 
                WHERE client_id = ?
                ORDER BY id, session_number
            ");
            $stmt->execute([$clientId]);
        } else {
            // Get all behaviors
            $stmt = $pdo->query("
                SELECT 
                    id,
                    client_id,
                    antecedent,
                    behavior,
                    notes,
                    session_number,
                    frequency,
                    function_type,
                    is_checked,
                    session_date,
                    created_at,
                    updated_at
                FROM bcm_table 
                ORDER BY client_id, id, session_number
            ");
        }
        
        $rows = $stmt->fetchAll();
        
        // Group by behavior (combining sessions and functions)
        $behaviors = [];
        foreach ($rows as $row) {
            $id = $row['id'];
            if (!isset($behaviors[$id])) {
                $behaviors[$id] = [
                    'id' => $id,
                    'client_id' => $row['client_id'],
                    'antecedent' => $row['antecedent'],
                    'behavior' => $row['behavior'],
                    'notes' => $row['notes'],
                    'sessions' => [],
                    'functions' => [],
                    'session_date' => $row['session_date'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at']
                ];
            }
            
            // Add session frequency if exists
            if ($row['session_number'] !== null && $row['session_number'] > 0) {
                $behaviors[$id]['sessions'][$row['session_number']] = $row['frequency'];
            }
            
            // Add function if exists
            if ($row['function_type'] !== null) {
                $behaviors[$id]['functions'][$row['function_type']] = (bool)$row['is_checked'];
            }
        }
        
        // Get notes for client
        $notes = '';
        if ($clientId) {
            $notesStmt = $pdo->prepare("SELECT notes FROM bcm_notes WHERE client_id = ? ORDER BY id DESC LIMIT 1");
            $notesStmt->execute([$clientId]);
            $notesRow = $notesStmt->fetch();
            $notes = $notesRow['notes'] ?? '';
        }
        
        echo json_encode([
            'success' => true,
            'behaviors' => array_values($behaviors),
            'notes' => $notes,
            'client_id' => $clientId
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function saveBcmData() {
    global $pdo;
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['behaviors']) || !is_array($input['behaviors'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid data format']);
            return;
        }
        
        if (!isset($input['client_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Client ID is required']);
            return;
        }
        
        $clientId = $input['client_id'];
        
        $pdo->beginTransaction();
        
        // Clear existing data for this client
        $pdo->prepare("DELETE FROM bcm_table WHERE client_id = ?")->execute([$clientId]);
        
        foreach ($input['behaviors'] as $behavior) {
            // Get session data
            $sessions = $behavior['sessions'] ?? [];
            $functions = $behavior['functions'] ?? [];
            $sessionDate = $behavior['session_date'] ?? date('Y-m-d');
            
            // If there are sessions, insert each session as a separate row
            if (!empty($sessions)) {
                foreach ($sessions as $sessionNum => $frequency) {
                    // Insert behavior with session
                    $stmt = $pdo->prepare("
                        INSERT INTO bcm_table (client_id, antecedent, behavior, notes, session_number, frequency, session_date) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $clientId,
                        $behavior['antecedent'] ?? '',
                        $behavior['behavior'] ?? '',
                        $behavior['notes'] ?? '',
                        $sessionNum,
                        $frequency,
                        $sessionDate
                    ]);
                    
                    $behaviorId = $pdo->lastInsertId();
                    
                    // Insert functions for this behavior
                    if (!empty($functions)) {
                        $funcStmt = $pdo->prepare("
                            INSERT INTO bcm_table (client_id, antecedent, behavior, notes, function_type, is_checked, session_date) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ");
                        foreach ($functions as $funcType => $isChecked) {
                            $funcStmt->execute([
                                $clientId,
                                $behavior['antecedent'] ?? '',
                                $behavior['behavior'] ?? '',
                                $behavior['notes'] ?? '',
                                $funcType,
                                $isChecked ? 1 : 0,
                                $sessionDate
                            ]);
                        }
                    }
                }
            } else {
                // Insert behavior without session
                $stmt = $pdo->prepare("
                    INSERT INTO bcm_table (client_id, antecedent, behavior, notes, session_number, frequency, session_date) 
                    VALUES (?, ?, ?, ?, 0, 0, ?)
                ");
                $stmt->execute([
                    $clientId,
                    $behavior['antecedent'] ?? '',
                    $behavior['behavior'] ?? '',
                    $behavior['notes'] ?? '',
                    $sessionDate
                ]);
                
                $behaviorId = $pdo->lastInsertId();
                
                // Insert functions for this behavior
                if (!empty($functions)) {
                    $funcStmt = $pdo->prepare("
                        INSERT INTO bcm_table (client_id, antecedent, behavior, notes, function_type, is_checked, session_date) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    foreach ($functions as $funcType => $isChecked) {
                        $funcStmt->execute([
                            $clientId,
                            $behavior['antecedent'] ?? '',
                            $behavior['behavior'] ?? '',
                            $behavior['notes'] ?? '',
                            $funcType,
                            $isChecked ? 1 : 0,
                            $sessionDate
                        ]);
                    }
                }
            }
        }
        
        // Save notes for client
        if (isset($input['notes'])) {
            $pdo->prepare("DELETE FROM bcm_notes WHERE client_id = ?")->execute([$clientId]);
            $notesStmt = $pdo->prepare("INSERT INTO bcm_notes (client_id, notes) VALUES (?, ?)");
            $notesStmt->execute([$clientId, $input['notes']]);
        }
        
        $pdo->commit();
        
        echo json_encode(['success' => true, 'message' => 'Data saved successfully']);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function deleteBcmData() {
    global $pdo;
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $clientId = $input['client_id'] ?? null;
        
        if (isset($input['id']) && $clientId) {
            // Delete specific behavior
            $stmt = $pdo->prepare("DELETE FROM bcm_table WHERE id = ? AND client_id = ?");
            $stmt->execute([$input['id'], $clientId]);
        } elseif ($clientId) {
            // Delete all for this client
            $pdo->prepare("DELETE FROM bcm_table WHERE client_id = ?")->execute([$clientId]);
            $pdo->prepare("DELETE FROM bcm_notes WHERE client_id = ?")->execute([$clientId]);
        } else {
            // Delete all
            $pdo->exec("DELETE FROM bcm_table");
            $pdo->exec("DELETE FROM bcm_notes");
        }
        
        echo json_encode(['success' => true]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
