<?php
/**
 * API for BCM (Continuous Measurement) Data
 * Handles saving and loading BCM behavior data
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
        // Get all behaviors with their sessions
        $stmt = $pdo->query("
            SELECT 
                b.id,
                b.antecedent,
                b.behavior,
                b.notes,
                b.created_at,
                b.updated_at,
                s.session_number,
                s.frequency,
                f.function_type,
                f.is_checked
            FROM bcm_behaviors b
            LEFT JOIN bcm_sessions s ON b.id = s.behavior_id
            LEFT JOIN bcm_functions f ON b.id = f.behavior_id
            ORDER BY b.id, s.session_number
        ");
        
        $rows = $stmt->fetchAll();
        
        // Group by behavior
        $behaviors = [];
        foreach ($rows as $row) {
            $id = $row['id'];
            if (!isset($behaviors[$id])) {
                $behaviors[$id] = [
                    'id' => $id,
                    'antecedent' => $row['antecedent'],
                    'behavior' => $row['behavior'],
                    'notes' => $row['notes'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at'],
                    'sessions' => [],
                    'functions' => []
                ];
            }
            
            // Add session if exists
            if ($row['session_number'] !== null) {
                $behaviors[$id]['sessions'][$row['session_number']] = $row['frequency'];
            }
            
            // Add function if exists
            if ($row['function_type'] !== null) {
                $behaviors[$id]['functions'][$row['function_type']] = (bool)$row['is_checked'];
            }
        }
        
        // Get notes
        $notesStmt = $pdo->query("SELECT notes FROM bcm_notes ORDER BY id DESC LIMIT 1");
        $notes = $notesStmt->fetch();
        
        echo json_encode([
            'success' => true,
            'behaviors' => array_values($behaviors),
            'notes' => $notes['notes'] ?? ''
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
        
        $pdo->beginTransaction();
        
        // Clear existing data (or you could implement update logic)
        $pdo->exec("DELETE FROM bcm_sessions");
        $pdo->exec("DELETE FROM bcm_functions");
        $pdo->exec("DELETE FROM bcm_behaviors");
        
        foreach ($input['behaviors'] as $behavior) {
            // Insert behavior
            $stmt = $pdo->prepare("
                INSERT INTO bcm_behaviors (antecedent, behavior, notes) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([
                $behavior['antecedent'] ?? '',
                $behavior['behavior'] ?? '',
                $behavior['notes'] ?? ''
            ]);
            $behaviorId = $pdo->lastInsertId();
            
            // Insert sessions
            if (isset($behavior['sessions']) && is_array($behavior['sessions'])) {
                $sessionStmt = $pdo->prepare("
                    INSERT INTO bcm_sessions (behavior_id, session_number, frequency) 
                    VALUES (?, ?, ?)
                ");
                foreach ($behavior['sessions'] as $sessionNum => $frequency) {
                    $sessionStmt->execute([$behaviorId, $sessionNum, $frequency]);
                }
            }
            
            // Insert functions
            if (isset($behavior['functions']) && is_array($behavior['functions'])) {
                $funcStmt = $pdo->prepare("
                    INSERT INTO bcm_functions (behavior_id, function_type, is_checked) 
                    VALUES (?, ?, ?)
                ");
                foreach ($behavior['functions'] as $funcType => $isChecked) {
                    $funcStmt->execute([$behaviorId, $funcType, $isChecked ? 1 : 0]);
                }
            }
        }
        
        // Save notes
        if (isset($input['notes'])) {
            $pdo->exec("DELETE FROM bcm_notes");
            $notesStmt = $pdo->prepare("INSERT INTO bcm_notes (notes) VALUES (?)");
            $notesStmt->execute([$input['notes']]);
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
        
        if (isset($input['id'])) {
            // Delete specific behavior
            $stmt = $pdo->prepare("DELETE FROM bcm_behaviors WHERE id = ?");
            $stmt->execute([$input['id']]);
        } else {
            // Delete all
            $pdo->exec("DELETE FROM bcm_sessions");
            $pdo->exec("DELETE FROM bcm_functions");
            $pdo->exec("DELETE FROM bcm_behaviors");
        }
        
        echo json_encode(['success' => true]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
