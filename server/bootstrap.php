<?php
declare(strict_types=1);

date_default_timezone_set('Europe/Riga');
ini_set('display_errors', '0');

function room_json(int $status, array $body): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');
    header('X-Robots-Tag: noindex, nofollow');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

set_exception_handler(function (Throwable $error): void {
    error_log('ROOM admin error: ' . $error->getMessage());
    room_json(500, ['error' => 'Neizdevās pabeigt darbību. Mēģini vēlreiz pēc brīža.']);
});

function room_origin(): string { return rtrim(getenv('ROOM_ORIGIN') ?: 'https://roomjurmala.lv', '/'); }
function room_local(): bool {
    return PHP_SAPI === 'cli-server' && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
}
function room_private_dir(): string {
    $dir = getenv('ROOM_DATA_DIR') ?: dirname(__DIR__, 2) . '/.roomjurmala-admin';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new RuntimeException('Cannot create private storage');
    $dir = realpath($dir);
    $webRoot = realpath(dirname(__DIR__));
    if (!$dir || !$webRoot || $dir === $webRoot || str_starts_with($dir, $webRoot . DIRECTORY_SEPARATOR)) throw new RuntimeException('Private storage cannot be inside the web root');
    return $dir;
}
function room_db(): SQLite3 {
    static $db;
    if ($db) return $db;
    umask(0077);
    $db = new SQLite3(room_private_dir() . '/calendar.sqlite');
    $db->enableExceptions(true);
    $db->busyTimeout(5000);
    $db->exec('PRAGMA foreign_keys = ON');
    $db->exec('CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, payload TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS administrators (id INTEGER PRIMARY KEY CHECK(id IN (1,2)), email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, version TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS used_invitations (token_hash TEXT PRIMARY KEY)');
    $db->exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS attempts (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, account_version TEXT NOT NULL, expires INTEGER NOT NULL, created INTEGER NOT NULL)');
    $db->exec('CREATE INDEX IF NOT EXISTS password_resets_account ON password_resets(admin_id,created)');
    $db->exec('CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, created INTEGER NOT NULL)');
    $db->exec('BEGIN IMMEDIATE');
    try {
        if ($db->querySingle("SELECT name FROM sqlite_master WHERE type='table' AND name='owner'")) {
            $db->exec('INSERT INTO administrators(id,email,password_hash,version) SELECT id,email,password_hash,version FROM owner');
            $db->exec('DROP TABLE owner');
        }
        if (!$db->querySingle("SELECT value FROM meta WHERE key='seeded'")) {
            $seed = json_decode(file_get_contents(dirname(__DIR__) . '/content/events-seed.json'), true, 512, JSON_THROW_ON_ERROR);
            foreach ($seed['events'] as $event) {
                $statement = $db->prepare('INSERT INTO events(id,payload) VALUES(:id,:payload)');
                $statement->bindValue(':id', $event['id']);
                $statement->bindValue(':payload', json_encode($event, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
                $statement->execute();
            }
            $db->exec("INSERT INTO meta(key,value) VALUES('seeded','1')");
        }
        $db->exec('COMMIT');
    } catch (Throwable $error) { $db->exec('ROLLBACK'); throw $error; }
    return $db;
}
function room_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $dir = room_private_dir() . '/sessions';
    if (!is_dir($dir)) mkdir($dir, 0700, true);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', '43200');
    session_save_path($dir);
    session_name('room_owner');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/api/', 'secure' => !room_local(), 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
    if (isset($_SESSION['expires']) && $_SESSION['expires'] < time()) $_SESSION = [];
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}
function room_account(int $id): ?array {
    $statement = room_db()->prepare('SELECT id,email,version FROM administrators WHERE id=:id');
    $statement->bindValue(':id', $id, SQLITE3_INTEGER);
    $row = $statement->execute()->fetchArray(SQLITE3_ASSOC);
    return $row ?: null;
}
function room_current_account(): ?array {
    room_session();
    // Preserve the first administrator's existing session during the migration.
    $account = room_account($_SESSION['admin_id'] ?? 1);
    $version = $_SESSION['admin_version'] ?? $_SESSION['owner_version'] ?? '';
    return $account && isset($_SESSION['expires']) && hash_equals($account['version'], $version)
        && $_SESSION['expires'] >= time() ? $account : null;
}
function room_require_admin(): void {
    if (!room_current_account()) room_json(401, ['error' => 'Lūdzu, ielogojies vēlreiz.']);
}
function room_input(): array {
    if (($_SERVER['HTTP_ORIGIN'] ?? '') !== room_origin()
        || ($_SERVER['HTTP_X_ROOM_ADMIN'] ?? '') !== '1'
        || strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') room_json(403, ['error' => 'Pārlādē lapu un mēģini vēlreiz.']);
    room_session();
    if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) room_json(403, ['error' => 'Sesija ir mainījusies. Pārlādē lapu.']);
    $limit = ($_SERVER['REQUEST_METHOD'] === 'POST' && parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/api/events') ? 2850000 : 16000;
    $raw = file_get_contents('php://input', false, null, 0, $limit + 1);
    if (strlen($raw) > $limit) room_json(413, ['error' => 'Ievadītais teksts ir pārāk garš.']);
    try { $input = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
    catch (JsonException) { room_json(400, ['error' => 'Neizdevās nolasīt ievadīto informāciju.']); }
    if (!is_array($input) || array_is_list($input)) room_json(400, ['error' => 'Pārbaudi ievadīto informāciju.']);
    return $input;
}
function room_rate_limit(string $purpose): void {
    $db = room_db();
    $buckets = [$purpose . ':global' => 60, $purpose . ':' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown') => 8];
    $now = time();
    $db->exec('BEGIN IMMEDIATE');
    try {
        $db->exec('DELETE FROM attempts WHERE expires < ' . $now);
        foreach ($buckets as $bucket => $limit) {
            $statement = $db->prepare('SELECT count FROM attempts WHERE bucket=:bucket');
            $statement->bindValue(':bucket', $bucket);
            $row = $statement->execute()->fetchArray(SQLITE3_ASSOC);
            if ($row && $row['count'] >= $limit) {
                $db->exec('ROLLBACK'); header('Retry-After: 900');
                room_json(429, ['error' => 'Pārāk daudz mēģinājumu. Mēģini vēlreiz pēc 15 minūtēm.']);
            }
        }
        foreach ($buckets as $bucket => $limit) {
            $statement = $db->prepare('INSERT INTO attempts(bucket,count,expires) VALUES(:bucket,1,:expires) ON CONFLICT(bucket) DO UPDATE SET count=count+1');
            $statement->bindValue(':bucket', $bucket); $statement->bindValue(':expires', $now + 900, SQLITE3_INTEGER); $statement->execute();
        }
        $db->exec('COMMIT');
    } catch (Throwable $error) { $db->exec('ROLLBACK'); throw $error; }
}
function room_start_login(array $account): void {
    session_regenerate_id(true);
    $_SESSION = ['csrf' => bin2hex(random_bytes(32)), 'admin_id' => $account['id'], 'admin_version' => $account['version'], 'expires' => time() + 43200];
}
function room_pending_invitations(): array {
    $path = room_private_dir() . '/invitations.json';
    if (is_file($path)) {
        $data = json_decode(file_get_contents($path), true, 16, JSON_THROW_ON_ERROR);
        $invitations = $data['invitations'] ?? [];
    } else {
        $legacy = room_private_dir() . '/bootstrap.json';
        if (!is_file($legacy)) return [];
        $data = json_decode(file_get_contents($legacy), true, 16, JSON_THROW_ON_ERROR);
        $invitations = [array_merge($data, ['slot' => 1, 'email' => null])];
    }
    $pending = [];
    foreach ($invitations as $invitation) {
        if (!in_array($invitation['slot'] ?? null, [1,2], true)
            || !is_string($invitation['tokenHash'] ?? null) || !preg_match('/^[a-f0-9]{64}$/D', $invitation['tokenHash'])
            || !is_int($invitation['expires'] ?? null) || $invitation['expires'] <= time()
            || (isset($invitation['email']) && !filter_var($invitation['email'], FILTER_VALIDATE_EMAIL))
            || room_account($invitation['slot'])) continue;
        $statement = room_db()->prepare('SELECT token_hash FROM used_invitations WHERE token_hash=:hash');
        $statement->bindValue(':hash', $invitation['tokenHash']);
        if (!$statement->execute()->fetchArray()) $pending[] = $invitation;
    }
    return $pending;
}
function room_invitation(mixed $token): ?array {
    if (!is_string($token) || strlen($token) > 128) return null;
    $hash = hash('sha256', $token);
    foreach (room_pending_invitations() as $invitation) {
        if (hash_equals($invitation['tokenHash'], $hash)) return $invitation;
    }
    return null;
}
function room_valid_date(mixed $value): bool {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) return false;
    [$year,$month,$day] = array_map('intval', explode('-', $value));
    return checkdate($month,$day,$year);
}
function room_length(string $value): int { return preg_match_all('/./us', $value); }
function room_matches(array $event, string $date): bool {
    if (isset($event['date'])) return $event['date'] === $date;
    return in_array((int)date('w', strtotime($date . ' 12:00:00')), $event['weekdays'] ?? [], true)
        && (!isset($event['start']) || $date >= $event['start']) && (!isset($event['end']) || $date <= $event['end']);
}
function room_validate_event(array $input): array {
    $errors = [];
    if (!is_string($input['title'] ?? null) || trim($input['title']) === '' || room_length(trim($input['title'])) > 160) $errors['title'] = 'Ievadi pasākuma nosaukumu līdz 160 rakstzīmēm.';
    if (!room_valid_date($input['date'] ?? null) || $input['date'] < date('Y-m-d') || $input['date'] > date('Y-m-d', strtotime('+730 days'))) $errors['date'] = 'Izvēlies datumu no šodienas līdz diviem gadiem uz priekšu.';
    foreach (['startTime' => 'sākuma', 'endTime' => 'beigu'] as $field => $word) {
        if (!is_string($input[$field] ?? null) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/D', $input[$field])) $errors[$field] = 'Norādi ' . $word . ' laiku.';
    }
    if (!isset($errors['startTime']) && !isset($errors['endTime']) && $input['endTime'] <= $input['startTime']) $errors['endTime'] = 'Beigu laikam jābūt vēlāk par sākumu.';
    if (($input['date'] ?? '') === date('Y-m-d') && !isset($errors['startTime']) && $input['startTime'] <= date('H:i')) $errors['startTime'] = 'Izvēlies laiku, kas vēl nav pagājis.';
    if (isset($input['description']) && (!is_string($input['description']) || room_length($input['description']) > 2000)) $errors['description'] = 'Apraksts var būt līdz 2000 rakstzīmēm.';
    if (!is_bool($input['weekly'] ?? null)) $errors['weekly'] = 'Pārbaudi atkārtošanas izvēli.';
    return $errors;
}
function room_save_event(SQLite3 $db, array $event): void {
    $statement = $db->prepare('INSERT INTO events(id,payload) VALUES(:id,:payload) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload');
    $statement->bindValue(':id', $event['id']);
    $statement->bindValue(':payload', json_encode($event, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    $statement->execute();
}

function room_archived(array $event,string $date): bool {
    return ($event['archived'] ?? false) === true || (isset($event['archivedFrom']) && $date >= $event['archivedFrom']) || in_array($date,$event['archivedDates'] ?? [],true);
}
function room_archive_change(array $event,array $input): ?array {
    $action=$input['action'] ?? null; $date=$input['date'] ?? null; $scope=$input['scope'] ?? null;
    if (!room_valid_date($date) || !in_array($scope,['one','series'],true)) throw new InvalidArgumentException('Nederīga arhīva darbība.');
    $series=$scope==='series';
    if ($series ? !isset($event['weekdays']) : !room_matches($event,$date)) throw new InvalidArgumentException('Pasākums nav atrasts.');
    $cancelled=($event['status'] ?? '')==='cancelled' || (isset($event['cancelledFrom']) && $date >= $event['cancelledFrom']) || in_array($date,$event['exclusions'] ?? [],true);
    if ($action==='archive') {
        if ($series ? !isset($event['cancelledFrom']) : !$cancelled || in_array($date,$event['deletedDates'] ?? [],true)) throw new InvalidArgumentException('Arhivēt var tikai atceltu pasākumu.');
        if ($series) $event['archivedFrom']=$event['cancelledFrom'];
        elseif (isset($event['date'])) $event['archived']=true;
        else {
            if (isset($event['cancelledFrom']) && $date >= $event['cancelledFrom']) throw new InvalidArgumentException('Arhivē visu atcelto sēriju.');
            $event['archivedDates']=array_values(array_unique([...($event['archivedDates'] ?? []),$date]));
        }
    } else {
        $exists=$series ? ($event['archivedFrom'] ?? null)===$date : (isset($event['date']) ? ($event['archived'] ?? false) : in_array($date,$event['archivedDates'] ?? [],true));
        if (!$exists) throw new InvalidArgumentException('Pasākums nav arhīvā.');
        if ($action==='delete' && ($input['confirm'] ?? null)!==true) throw new InvalidArgumentException('Apstiprini neatgriezenisku dzēšanu.');
        if ($action==='delete' && isset($event['date'])) return null;
        if ($series) {
            if ($action==='delete') {
                $end=date('Y-m-d',strtotime($event['archivedFrom'].' -1 day'));
                if (isset($event['start']) && $event['start']>$end) return null;
                $event['end']=min($event['end'] ?? $end,$end); unset($event['cancelledFrom']);
                foreach (['exclusions','archivedDates','deletedDates'] as $field) $event[$field]=array_values(array_filter($event[$field] ?? [],fn($d)=>$d<=$event['end']));
            }
            unset($event['archivedFrom']);
        } elseif (isset($event['date'])) unset($event['archived']);
        else {
            $event['archivedDates']=array_values(array_filter($event['archivedDates'] ?? [],fn($d)=>$d!==$date));
            if ($action==='delete') $event['deletedDates']=array_values(array_unique([...($event['deletedDates'] ?? []),$date]));
        }
    }
    $event['updatedAt']=gmdate('c'); return $event;
}

function room_event_image(mixed $value): ?string {
    if ($value === null || $value === '') return null;
    if (!is_string($value) || strlen($value) > 2800000 || !str_starts_with($value, 'data:image/jpeg;base64,')) room_json(400, ['error' => 'Izvēlies derīgu JPG, PNG vai WebP attēlu.']);
    $bytes = base64_decode(substr($value, 23), true);
    $info = $bytes === false ? false : @getimagesizefromstring($bytes);
    if (!$info || $info[2] !== IMAGETYPE_JPEG || $info[0] > 1600 || $info[1] > 1600 || $info[0] < 1 || $info[1] < 1) room_json(400, ['error' => 'Attēls nav derīgs. Izvēlies citu failu.']);
    return $bytes;
}
function room_image_file(string $id): string {
    return room_private_dir() . '/images/' . $id . '.jpg';
}
