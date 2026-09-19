<?php
declare(strict_types=1);

function room_reset_lookup(mixed $token): ?array {
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token)) return null;
    $statement = room_db()->prepare('SELECT r.token_hash,r.admin_id FROM password_resets r JOIN administrators a ON a.id=r.admin_id AND a.version=r.account_version WHERE r.token_hash=:hash AND r.expires>:now');
    $statement->bindValue(':hash', hash('sha256', $token)); $statement->bindValue(':now', time(), SQLITE3_INTEGER);
    return $statement->execute()->fetchArray(SQLITE3_ASSOC) ?: null;
}

function room_send_reset_email(string $email, string $token): bool {
    $link = room_origin() . '/admin/#reset=' . $token;
    $subject = 'ROOM Jūrmala · Paroles atjaunošana';
    $body = "Sveiki!\n\nSaņēmām pieprasījumu atjaunot Jūsu ROOM Jūrmala vadības paneļa paroli.\n\nLai izvēlētos jaunu paroli, atveriet šo saiti\n" . $link . "\n\nSaite derīga 30 minūtes un izmantojama vienu reizi.\n\nJa paroles atjaunošanu nepieprasījāt, ignorējiet šo e-pastu. Jūsu parole paliks nemainīta.\n\nROOM Jūrmala\nhttps://roomjurmala.lv\n";
    // Only the local integration-test server can capture mail instead of sending it.
    if (room_local() && getenv('ROOM_TEST_MAIL') === '1') {
        return file_put_contents(room_private_dir().'/reset-outbox.ndjson', json_encode(['to'=>$email,'subject'=>$subject,'body'=>$body], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n", FILE_APPEND | LOCK_EX) !== false;
    }
    $headers = ['From'=>'ROOM Jurmala <welcome@roomjurmala.lv>', 'Reply-To'=>'welcome@roomjurmala.lv', 'MIME-Version'=>'1.0', 'Content-Type'=>'text/plain; charset=UTF-8', 'Content-Transfer-Encoding'=>'base64'];
    return mail($email, '=?UTF-8?B?'.base64_encode($subject).'?=', chunk_split(base64_encode($body)), $headers, '-fwelcome@roomjurmala.lv');
}

function room_request_reset(array $input): never {
    room_rate_limit('password-reset-request');
    $email = is_string($input['email'] ?? null) ? strtolower(trim($input['email'])) : '';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email)>254) room_json(400, ['error'=>'Ievadi derīgu e-pasta adresi.']);
    $db = room_db(); $now = time(); $token = null;
    $db->exec('BEGIN IMMEDIATE');
    try {
        $db->exec('DELETE FROM password_resets WHERE expires <= '.$now);
        $statement = $db->prepare('SELECT id,email,version FROM administrators WHERE email=:email'); $statement->bindValue(':email',$email);
        $account = $statement->execute()->fetchArray(SQLITE3_ASSOC);
        if ($account) {
            $statement = $db->prepare('SELECT created FROM password_resets WHERE admin_id=:id AND created>:recent LIMIT 1');
            $statement->bindValue(':id',$account['id'],SQLITE3_INTEGER); $statement->bindValue(':recent',$now-60,SQLITE3_INTEGER);
            if (!$statement->execute()->fetchArray()) {
                $token = bin2hex(random_bytes(32));
                $statement = $db->prepare('INSERT INTO password_resets(token_hash,admin_id,account_version,expires,created) VALUES(:hash,:id,:version,:expires,:created)');
                $statement->bindValue(':hash',hash('sha256',$token)); $statement->bindValue(':id',$account['id'],SQLITE3_INTEGER); $statement->bindValue(':version',$account['version']);
                $statement->bindValue(':expires',$now+1800,SQLITE3_INTEGER); $statement->bindValue(':created',$now,SQLITE3_INTEGER); $statement->execute();
            }
        }
        $db->exec('COMMIT');
    } catch (Throwable $error) { $db->exec('ROLLBACK'); throw $error; }
    if ($token !== null) {
        try { $sent = room_send_reset_email($account['email'],$token); }
        catch (Throwable $error) { $sent = false; }
        if (!$sent) {
            $statement=$db->prepare('DELETE FROM password_resets WHERE token_hash=:hash'); $statement->bindValue(':hash',hash('sha256',$token)); $statement->execute();
            error_log('ROOM password reset email could not be handed to the mail server');
        }
    }
    // Never reveal whether an email address belongs to an administrator.
    room_json(200,['message'=>'Ja šim e-pastam ir izveidota piekļuve, saņemsi saiti paroles atjaunošanai. Saite derīga 30 minūtes. Pārbaudi arī mēstuļu mapi.']);
}

function room_complete_reset(array $input): never {
    room_rate_limit('password-reset-complete');
    $password = $input['password'] ?? null;
    if (!is_string($password) || room_length($password)<8 || strlen($password)>72) room_json(400,['error'=>'Izvēlies vismaz 8 rakstzīmju garu paroli. Ļoti gara parole jāsaīsina.']);
    if (!room_reset_lookup($input['token'] ?? null)) room_json(400,['error'=>'Saite vairs nav derīga. Pieprasi jaunu paroles atjaunošanas saiti.']);
    $hash = password_hash($password,PASSWORD_DEFAULT);
    $db=room_db(); $db->exec('BEGIN IMMEDIATE');
    try {
        // Recheck under the write lock so simultaneous submissions cannot reuse a token.
        $reset=room_reset_lookup($input['token'] ?? null);
        if (!$reset) { $db->exec('ROLLBACK'); room_json(400,['error'=>'Saite vairs nav derīga. Pieprasi jaunu paroles atjaunošanas saiti.']); }
        $statement=$db->prepare('UPDATE administrators SET password_hash=:hash,version=:version WHERE id=:id');
        $statement->bindValue(':hash',$hash); $statement->bindValue(':version',bin2hex(random_bytes(16))); $statement->bindValue(':id',$reset['admin_id'],SQLITE3_INTEGER); $statement->execute();
        $statement=$db->prepare('DELETE FROM password_resets WHERE admin_id=:id'); $statement->bindValue(':id',$reset['admin_id'],SQLITE3_INTEGER); $statement->execute();
        $db->exec('COMMIT');
    } catch (Throwable $error) { $db->exec('ROLLBACK'); throw $error; }
    room_json(200,['message'=>'Parole nomainīta. Ielogojies ar jauno paroli.']);
}
