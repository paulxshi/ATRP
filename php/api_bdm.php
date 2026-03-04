<?php
/**
 * API for BDM (Discontinuous Measurement) Data
 * Handles saving and loading BDM session data
 */

header('Content-Type: application/json');
require_once 'db_config.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        loadBdmData();
        break;
    case 'POST':
        saveBdmData();
        break;
    case 'DELETE':
        deleteBdmData();
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

function loadBdmData() {
    global $pdo;
    
    try {
        // Get all sessions with their intervals
        $stmt = $pdo->query("
            SELECT 
                s.id,
                s.behavior_name,
                s.interval_duration,
                s.function_type,
                s.measurement_type,
                s.session_number,
                s.session_date,
                s.created_at,
                i.interval_number,
                i.observation
            FROM bdm_sessions s
            LEFT JOIN bdm_intervals i ON s.id = i.session_id
            ORDER BY s.session_number, i.interval_number
        ");
        
        $rows = $stmt->fetchAll();
        
        // Group by session
        $sessions = [];
        foreach ($rows as $row) {
            $id = $row['id'];
            if (!isset($sessions[$id])) {
                $sessions[$id] = [
                    'id' => $id,
                    'behavior_name' => $row['behavior_name'],
                    'interval_duration' => $row['interval_duration'],
                    'function_type' => $row['function_type'],
                    'measurement_type' => $row['measurement_type'],
                    'session_number' => $row['session_number'],
                    'session_date' => $row['session_date'],
                    'created_at' => $row['created_at'],
                    'intervals' => []
                ];
            }
            
            // Add interval if exists
            if ($row['interval_number'] !== null) {
                $sessions[$id]['intervals'][$row['interval_number']] = $row['observation'];
            }
        }
        
        // Get notes
        $notesStmt = $pdo->query("SELECT notes FROM bdm_notes ORDER BY id DESC LIMIT 1");
        $notes = $notesStmt->fetch();
        
        echo json_encode([
            'success' => true,
            'sessions' => array_values($sessions),
            'notes' => $notes['notes'] ?? ''
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function saveBdmData() {
    global $pdo;
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['sessions']) || !is_array($input['sessions'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid data format']);
            return;
        }
        
        $pdo->beginTransaction();
        
        // Clear existing data
        $pdo->exec("DELETE FROM bdm_intervals");
        $pdo->exec("DELETE FROM bdm_sessions");
        
        foreach ($input['sessions'] as $session) {
            // Insert session
            $stmt = $pdo->prepare("
                INSERT INTO bdm_sessions 
                (behavior_name, interval_duration, function_type, measurement_type, session_number, session_date) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $session['behavior_name'] ?? '',
                $session['interval_duration'] ?? '',
                $session['function_type'] ?? '',
                $session['measurement_type'] ?? '',
                $session['session_number'] ?? 1,
                $session['session_date'] ?? date('Y-m-d')
            ]);
            $sessionId = $pdo->lastInsertId();
            
            // Insert intervals
            if (isset($session['intervals']) && is_array($session['intervals'])) {
                $intervalStmt = $pdo->prepare("
                    INSERT INTO bdm_intervals (session_id, interval_number, observation) 
                    VALUES (?, ?, ?)
                ");
                foreach ($session['intervals'] as $intervalNum => $observation) {
                    $intervalStmt->execute([$sessionId, $intervalNum, $observation]);
                }
            }
        }
        
        // Save notes
        if (isset($input['notes'])) {
            $pdo->exec("DELETE FROM bdm_notes");
            $notesStmt = $pdo->prepare("INSERT INTO bdm_notes (notes) VALUES (?)");
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

function deleteBdmData() {
    global $pdo;
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (isset($input['id'])) {
            // Delete specific session
            $stmt = $pdo->prepare("DELETE FROM bdm_sessions WHERE id = ?");
            $stmt->execute([$input['id']]);
        } else {
            // Delete all
            $pdo->exec("DELETE FROM bdm_intervals");
            $pdo->exec("DELETE FROM bdm_sessions");
        }
        
        echo json_encode(['success' => true]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
