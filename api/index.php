<?php
declare(strict_types=1);
require dirname(__DIR__) . '/server/bootstrap.php';
require dirname(__DIR__) . '/server/password-reset.php';

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
if (!room_local() && (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off')) room_json(403, ['error' => 'Izmanto drošo HTTPS adresi.']);
if (($_SERVER['HTTP_HOST'] ?? '') !== parse_url(room_origin(), PHP_URL_HOST) . (parse_url(room_origin(), PHP_URL_PORT) ? ':' . parse_url(room_origin(), PHP_URL_PORT) : '')) room_json(403, ['error' => 'Nederīga vietnes adrese.']);

if ($method === 'GET' && preg_match('~^/api/events/([a-zA-Z0-9-]+)/image$~D', $path, $match)) {
    $statement = room_db()->prepare('SELECT payload FROM events WHERE id=:id'); $statement->bindValue(':id', $match[1]);
    $row = $statement->execute()->fetchArray(SQLITE3_ASSOC);
    $event = $row ? json_decode($row['payload'], true) : null;
    $file = room_image_file($match[1]);
    if (!$event || !isset($event['image']) || !is_file($file)) room_json(404, ['error' => 'Attēls nav atrasts.']);
    header('Content-Type: image/jpeg'); header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store'); header('Content-Disposition: inline; filename="room-jurmala-pasakums.jpg"');
    header('Content-Length: '.filesize($file)); readfile($file); exit;
}
if ($method === 'GET' && $path === '/api/session') {
    $account = room_current_account();
    room_json(200, ['authenticated' => (bool)$account, 'csrf' => $_SESSION['csrf'], 'user' => $account ? ['email' => $account['email']] : null, 'setupAvailable' => (bool)room_pending_invitations()]);
}
if ($method === 'GET' && $path === '/api/events') {
    $rows = room_db()->query('SELECT payload FROM events ORDER BY id'); $events = [];
    while ($row = $rows->fetchArray(SQLITE3_ASSOC)) $events[] = json_decode($row['payload'], true, 512, JSON_THROW_ON_ERROR);
    room_json(200, ['events' => $events]);
}
if (!in_array($method, ['POST','PATCH'], true)) { header('Allow: GET, POST, PATCH'); room_json(405, ['error' => 'Darbība nav pieejama.']); }
$input = room_input();

if ($method === 'POST' && $path === '/api/password/forgot') room_request_reset($input);
if ($method === 'POST' && $path === '/api/password/check') {
    room_rate_limit('password-reset-check');
    if (!room_reset_lookup($input['token'] ?? null)) room_json(400,['error'=>'Saite vairs nav derīga. Pieprasi jaunu paroles atjaunošanas saiti.']);
    room_json(200,['valid'=>true]);
}
if ($method === 'POST' && $path === '/api/password/reset') room_complete_reset($input);

if ($method === 'POST' && $path === '/api/login') {
    room_rate_limit('login');
    $email = is_string($input['email'] ?? null) ? strtolower(trim($input['email'])) : '';
    $statement = room_db()->prepare('SELECT * FROM administrators WHERE email=:email');
    $statement->bindValue(':email', $email);
    $account = $statement->execute()->fetchArray(SQLITE3_ASSOC);
    $password = is_string($input['password'] ?? null) ? $input['password'] : '';
    // Always verify a hash so unknown email addresses have no shortcut.
    $hash = $account['password_hash'] ?? '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
    $valid = strlen($password) <= 72 && password_verify($password, $hash);
    if (!$account || !$valid) room_json(401, ['error' => 'E-pasts vai parole nav pareiza.']);
    room_start_login($account);
    room_json(200, ['authenticated' => true, 'csrf' => $_SESSION['csrf'], 'user' => ['email' => $account['email']]]);
}
if ($method === 'POST' && $path === '/api/activation') {
    room_rate_limit('activation');
    $invitation = room_invitation($input['token'] ?? null);
    if (!$invitation) room_json(403, ['error' => 'Aktivizācijas saite nav derīga vai jau ir izmantota.']);
    room_json(200, ['email' => $invitation['email'] ?? null]);
}
if ($method === 'POST' && $path === '/api/setup') {
    room_rate_limit('setup');
    $invitation = room_invitation($input['token'] ?? null);
    if (!$invitation) room_json(403, ['error' => 'Aktivizācijas saite nav derīga vai jau ir izmantota.']);
    $email = is_string($input['email'] ?? null) ? strtolower(trim($input['email'])) : '';
    $password = is_string($input['password'] ?? null) ? $input['password'] : '';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) room_json(400, ['error' => 'Ievadi derīgu e-pasta adresi.']);
    if (isset($invitation['email']) && $email !== strtolower($invitation['email'])) room_json(403, ['error' => 'Šī saite paredzēta citai e-pasta adresei.']);
    if (room_length($password) < 8 || strlen($password) > 72) room_json(400, ['error' => 'Izvēlies vismaz 8 rakstzīmju garu paroli. Ļoti gara parole jāsaīsina.']);
    $db = room_db(); $db->exec('BEGIN IMMEDIATE');
    try {
        if (!room_invitation($input['token'])) { $db->exec('ROLLBACK'); room_json(409, ['error' => 'Šī piekļuve jau ir aktivizēta.']); }
        $statement = $db->prepare('SELECT id FROM administrators WHERE email=:email');
        $statement->bindValue(':email', $email);
        if ($statement->execute()->fetchArray()) { $db->exec('ROLLBACK'); room_json(409, ['error' => 'Šim e-pastam piekļuve jau ir izveidota. Ielogojies ar savu paroli.']); }
        $account = ['id' => $invitation['slot'], 'email' => $email, 'version' => bin2hex(random_bytes(16))];
        $statement = $db->prepare('INSERT INTO administrators(id,email,password_hash,version) VALUES(:id,:email,:hash,:version)');
        $statement->bindValue(':id', $account['id'], SQLITE3_INTEGER); $statement->bindValue(':email', $email); $statement->bindValue(':hash', password_hash($password, PASSWORD_DEFAULT)); $statement->bindValue(':version', $account['version']); $statement->execute();
        $statement = $db->prepare('INSERT INTO used_invitations(token_hash) VALUES(:hash)');
        $statement->bindValue(':hash', $invitation['tokenHash']); $statement->execute();
        $db->exec('COMMIT');
    } catch (Throwable $error) { $db->exec('ROLLBACK'); throw $error; }
    room_start_login($account);
    room_json(201, ['authenticated' => true, 'csrf' => $_SESSION['csrf'], 'user' => ['email' => $account['email']]]);
}
room_require_admin();
if ($method === 'POST' && $path === '/api/logout') {
    $_SESSION = []; session_destroy();
    setcookie('room_owner', '', ['expires' => time()-3600, 'path' => '/api/', 'secure' => !room_local(), 'httponly' => true, 'samesite' => 'Strict']);
    room_json(200, ['authenticated' => false]);
}
if ($method === 'POST' && $path === '/api/events/cancel-all') {
    if (($input['confirm'] ?? null) !== true) room_json(400, ['error' => 'Apstiprini, ka vēlies atcelt visus pasākumus.']);
    $db = room_db(); $db->exec('BEGIN IMMEDIATE');
    try {
        $rows = $db->query('SELECT payload FROM events ORDER BY id'); $events = [];
        while ($row = $rows->fetchArray(SQLITE3_ASSOC)) $events[] = json_decode($row['payload'], true, 512, JSON_THROW_ON_ERROR);
        $rows->finalize(); $today = date('Y-m-d'); $changed = 0;
        foreach ($events as &$event) {
            if (($event['status'] ?? 'active') === 'cancelled') continue;
            if (isset($event['date'])) {
                if ($event['date'] < $today) continue;
                $event['status'] = 'cancelled';
            } elseif (isset($event['weekdays'])) {
                if ((isset($event['end']) && $event['end'] < $today) || (isset($event['cancelledFrom']) && $event['cancelledFrom'] <= $today)) continue;
                $event['cancelledFrom'] = $today;
            } else continue;
            $event['updatedAt'] = gmdate('c'); room_save_event($db, $event); $changed++;
        }
        unset($event); $db->exec('COMMIT');
    } catch (Throwable $error) { $db->exec('ROLLBACK'); throw $error; }
    room_json(200, ['events' => $events, 'changed' => $changed]);
}
if ($method === 'POST' && $path === '/api/events') {
    $errors = room_validate_event($input);
    if ($errors) room_json(400, ['error' => 'Pārbaudi atzīmētos laukus.', 'fields' => $errors]);
    $imageBytes = room_event_image($input['imageData'] ?? null);
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
        if ($imageBytes !== null) {
            $imageDir = dirname(room_image_file($event['id']));
            if (!is_dir($imageDir)) mkdir($imageDir, 0700, true);
            if (file_put_contents(room_image_file($event['id']), $imageBytes, LOCK_EX) === false) throw new RuntimeException('Cannot save event image');
            $event['image'] = '/api/events/'.$event['id'].'/image';
        }
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
        if (in_array($action,['archive','unarchive','delete'],true)) {
            try { $event = room_archive_change($event,$input); }
            catch (InvalidArgumentException $error) { $db->exec('ROLLBACK'); room_json(400,['error'=>$error->getMessage()]); }
            if ($event === null) {
                foreach (['DELETE FROM events WHERE id=:id','DELETE FROM requests WHERE event_id=:id'] as $sql) {
                    $statement=$db->prepare($sql); $statement->bindValue(':id',$match[1]); $statement->execute();
                }
            } else room_save_event($db,$event);
            $db->exec('COMMIT');
            if ($event === null && is_file(room_image_file($match[1]))) unlink(room_image_file($match[1]));
            room_json(200,['event'=>$event,'id'=>$match[1]]);
        }
        if (is_string($date) && (room_archived($event,$date) || in_array($date,$event['deletedDates'] ?? [],true) || ($action==='restore' && $scope==='series' && isset($event['archivedFrom'])))) {
            $db->exec('ROLLBACK'); room_json(400,['error'=>'Vispirms atgriez pasākumu no arhīva.']);
        }
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
