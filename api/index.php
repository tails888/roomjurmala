<?php
declare(strict_types=1);
require dirname(__DIR__) . '/server/bootstrap.php';

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
if (!room_local() && (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off')) room_json(403, ['error' => 'Izmanto drošo HTTPS adresi.']);
if (($_SERVER['HTTP_HOST'] ?? '') !== parse_url(room_origin(), PHP_URL_HOST) . (parse_url(room_origin(), PHP_URL_PORT) ? ':' . parse_url(room_origin(), PHP_URL_PORT) : '')) room_json(403, ['error' => 'Nederīga vietnes adrese.']);

if ($method === 'GET' && $path === '/api/session') {
    $authenticated = room_authenticated();
    room_json(200, ['authenticated' => $authenticated, 'csrf' => $_SESSION['csrf'], 'setupAvailable' => !room_owner() && (bool)room_bootstrap()]);
}
if ($method === 'GET' && $path === '/api/events') {
    $rows = room_db()->query('SELECT payload FROM events ORDER BY id'); $events = [];
    while ($row = $rows->fetchArray(SQLITE3_ASSOC)) $events[] = json_decode($row['payload'], true, 512, JSON_THROW_ON_ERROR);
    room_json(200, ['events' => $events]);
}
if (!in_array($method, ['POST','PATCH'], true)) { header('Allow: GET, POST, PATCH'); room_json(405, ['error' => 'Darbība nav pieejama.']); }
$input = room_input();

if ($method === 'POST' && $path === '/api/login') {
    room_rate_limit('login');
    $owner = room_db()->querySingle('SELECT * FROM owner WHERE id=1', true);
    $password = is_string($input['password'] ?? null) ? $input['password'] : '';
    // Always verify a hash so unknown email addresses have no shortcut.
    $hash = $owner['password_hash'] ?? '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
    $valid = strlen($password) <= 72 && password_verify($password, $hash);
    if (!$owner || !$valid || !is_string($input['email'] ?? null) || strtolower(trim($input['email'])) !== $owner['email']) room_json(401, ['error' => 'E-pasts vai parole nav pareiza.']);
    room_start_login($owner);
    room_json(200, ['authenticated' => true, 'csrf' => $_SESSION['csrf']]);
}
if ($method === 'POST' && $path === '/api/setup') {
    room_rate_limit('setup');
    $bootstrap = room_bootstrap();
    if (!$bootstrap || !is_string($input['token'] ?? null) || !hash_equals($bootstrap['tokenHash'], hash('sha256', $input['token'])) || room_owner()) room_json(403, ['error' => 'Aktivizācijas saite nav derīga vai jau ir izmantota.']);
    $email = is_string($input['email'] ?? null) ? strtolower(trim($input['email'])) : '';
    $password = is_string($input['password'] ?? null) ? $input['password'] : '';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) room_json(400, ['error' => 'Ievadi derīgu e-pasta adresi.']);
    if (room_length($password) < 12 || strlen($password) > 72) room_json(400, ['error' => 'Izvēlies vismaz 12 rakstzīmju garu paroli. Ļoti gara parole jāsaīsina.']);
    $db = room_db(); $db->exec('BEGIN IMMEDIATE');
    try {
        if ($db->querySingle('SELECT id FROM owner WHERE id=1')) { $db->exec('ROLLBACK'); room_json(409, ['error' => 'Administrācija jau ir aktivizēta.']); }
        $owner = ['email' => $email, 'version' => bin2hex(random_bytes(16))];
        $statement = $db->prepare('INSERT INTO owner(id,email,password_hash,version) VALUES(1,:email,:hash,:version)');
        $statement->bindValue(':email', $email); $statement->bindValue(':hash', password_hash($password, PASSWORD_DEFAULT)); $statement->bindValue(':version', $owner['version']); $statement->execute();
        $db->exec('COMMIT');
    } catch (Throwable $error) { $db->exec('ROLLBACK'); throw $error; }
    room_start_login($owner);
    room_json(201, ['authenticated' => true, 'csrf' => $_SESSION['csrf']]);
}
room_require_owner();
if ($method === 'POST' && $path === '/api/logout') {
    $_SESSION = []; session_destroy();
    setcookie('room_owner', '', ['expires' => time()-3600, 'path' => '/api/', 'secure' => !room_local(), 'httponly' => true, 'samesite' => 'Strict']);
    room_json(200, ['authenticated' => false]);
}
if ($method === 'POST' && $path === '/api/events') {
    $errors = room_validate_event($input);
    if ($errors) room_json(400, ['error' => 'Pārbaudi atzīmētos laukus.', 'fields' => $errors]);
    $requestId = $_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '';
    if (!preg_match('/^[a-zA-Z0-9-]{16,80}$/D', $requestId)) room_json(400, ['error' => 'Pārlādē lapu un mēģini vēlreiz.']);
    $event = ['id' => bin2hex(random_bytes(16)), 'title' => ['lv' => trim($input['title'])], 'description' => ['lv' => trim($input['description'] ?? '')], 'time' => $input['startTime'].'-'.$input['endTime'], 'status' => 'active', 'exclusions' => [], 'createdAt' => gmdate('c')];
    if ($input['weekly']) $event += ['type' => 'weekly', 'start' => $input['date'], 'weekdays' => [(int)date('w', strtotime($input['date'].' 12:00:00'))]];
    else $event['date'] = $input['date'];
    $db = room_db(); $db->exec('BEGIN IMMEDIATE');
    try {
        $statement = $db->prepare('SELECT payload FROM events JOIN requests ON requests.event_id=events.id WHERE requests.id=:id');
        $statement->bindValue(':id', $requestId); $existing = $statement->execute()->fetchArray(SQLITE3_ASSOC);
        if ($existing) { $db->exec('COMMIT'); room_json(200, ['event' => json_decode($existing['payload'], true, 512, JSON_THROW_ON_ERROR)]); }
        room_save_event($db, $event);
        $statement = $db->prepare('INSERT INTO requests(id,event_id,created) VALUES(:id,:event,:created)');
        $statement->bindValue(':id', $requestId); $statement->bindValue(':event', $event['id']); $statement->bindValue(':created', time(), SQLITE3_INTEGER); $statement->execute();
        $db->exec('DELETE FROM requests WHERE created < '.(time()-86400));
        $db->exec('COMMIT');
    } catch (Throwable $error) { $db->exec('ROLLBACK'); throw $error; }
    room_json(201, ['event' => $event]);
}
if ($method === 'PATCH' && preg_match('~^/api/events/([a-zA-Z0-9-]+)$~D', $path, $match)) {
    $db = room_db(); $db->exec('BEGIN IMMEDIATE');
    try {
        $statement = $db->prepare('SELECT payload FROM events WHERE id=:id'); $statement->bindValue(':id', $match[1]); $row = $statement->execute()->fetchArray(SQLITE3_ASSOC);
        if (!$row) { $db->exec('ROLLBACK'); room_json(404, ['error' => 'Pasākums nav atrasts.']); }
        $event = json_decode($row['payload'], true, 512, JSON_THROW_ON_ERROR);
        $date = $input['date'] ?? null; $scope = $input['scope'] ?? null; $action = $input['action'] ?? null;
        if (!room_valid_date($date) || $date < date('Y-m-d') || !room_matches($event,$date) || !in_array($scope,['one','series'],true) || !in_array($action,['cancel','restore'],true) || ($scope === 'series' && !isset($event['weekdays']))) {
            $db->exec('ROLLBACK'); room_json(400, ['error' => 'Nederīga pasākuma izvēle.']);
        }
        if ($action === 'cancel') {
            if ($scope === 'series') $event['cancelledFrom'] = min($event['cancelledFrom'] ?? $date, $date);
            elseif (isset($event['weekdays'])) $event['exclusions'] = array_values(array_unique([...($event['exclusions'] ?? []),$date]));
            else $event['status'] = 'cancelled';
        } else {
            if ($scope === 'series') unset($event['cancelledFrom']);
            elseif (isset($event['cancelledFrom']) && $date >= $event['cancelledFrom']) { $db->exec('ROLLBACK'); room_json(400, ['error' => 'Atjauno visu atcelto sēriju.']); }
            elseif (isset($event['weekdays'])) $event['exclusions'] = array_values(array_filter($event['exclusions'] ?? [], fn($value) => $value !== $date));
            else $event['status'] = 'active';
        }
        $event['updatedAt'] = gmdate('c'); room_save_event($db, $event); $db->exec('COMMIT');
    } catch (Throwable $error) { $db->exec('ROLLBACK'); throw $error; }
    room_json(200, ['event' => $event]);
}
room_json(404, ['error' => 'Darbība nav atrasta.']);
