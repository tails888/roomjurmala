<?php
// Local integration-test router. Never used as the production web server.
declare(strict_types=1);
$root = dirname(__DIR__);
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($path, '/api/')) { require $root . '/api/index.php'; return true; }
if (preg_match('~(?:^|/)(?:\.|server/|scripts/|content/|tests/|node_modules/)~', rawurldecode($path))) { http_response_code(404); echo 'Not found'; return true; }
return false;
