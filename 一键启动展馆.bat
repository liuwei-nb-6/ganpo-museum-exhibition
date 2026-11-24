@echo off
chcp 65001 >nul
title 赣鄱千年 · 江西双馆数字文物特展
cd /d "%~dp0"

echo ==================================================
echo   赣鄱千年 · 江西双馆数字文物特展 启动器
echo ==================================================
echo.

set "HAS_NODE=0"
where node >nul 2>nul
if %errorlevel%==0 (
    if exist "%~dp0node_modules\.bin\vite.cmd" (
        set "HAS_NODE=1"
    )
)

if "%HAS_NODE%"=="1" (
    node -e "const http=require('http');const r=http.get('http://127.0.0.1:5175/',()=>{process.exit(0)});r.on('error',()=>process.exit(1));r.setTimeout(800,()=>{r.destroy();process.exit(1)});"
    if %errorlevel%==0 (
        echo 展馆服务已在运行，正在打开浏览器...
        start "" http://localhost:5175/
        timeout /t 2 >nul
        exit /b 0
    )
    echo 检测到完整运行环境，正在启动本地与局域网展馆服务...
    echo 浏览期间请保持此窗口开启，关闭窗口即停止服务。
    echo.
    call npx vite preview --port 5175 --host --open
    pause
    exit /b 0
)

echo 未检测到 Node.js 或依赖目录，自动切换为【Windows 零依赖离线模式】...
echo 无需安装任何软件，正在启动内置展馆服务...
echo.
set "BAT_FILE=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$raw = [System.IO.File]::ReadAllText($env:BAT_FILE, [System.Text.Encoding]::UTF8); $parts = $raw -split '(?m)^#___PS_START___\r?$', 2; Invoke-Expression $parts[1]"
pause
exit /b 0

#___PS_START___
$ErrorActionPreference = 'Stop'
$baseDir = Split-Path -Parent $env:BAT_FILE

if ((Test-Path (Join-Path $baseDir 'dist\index.html')) -and (Test-Path (Join-Path $baseDir 'dist\assets'))) {
    $webRoot = Join-Path $baseDir 'dist'
} elseif ((Test-Path (Join-Path $baseDir 'index.html')) -and (Test-Path (Join-Path $baseDir 'assets'))) {
    $webRoot = $baseDir
} else {
    Write-Host '[错误] 未找到已构建的展馆文件（dist\index.html 或 index.html + assets）。' -ForegroundColor Red
    Write-Host '请确认已将完整的 dist 文件夹与本启动脚本放在一起。' -ForegroundColor Yellow
    exit 1
}

$rootFull = [System.IO.Path]::GetFullPath($webRoot)
if (-not $rootFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $rootFull += [System.IO.Path]::DirectorySeparatorChar
}

# Check if port 5175 already serves this exhibition
try {
    $probe = [System.Net.WebRequest]::Create('http://localhost:5175/')
    $probe.Timeout = 800
    $probeResp = $probe.GetResponse()
    $probeResp.Close()
    Write-Host '展馆服务已在运行，正在打开浏览器...' -ForegroundColor Green
    Start-Process 'http://localhost:5175/'
    Start-Sleep -Seconds 2
    exit 0
} catch {
    # Port not open yet, proceed to start listener
}

$listener = $null
$boundPort = $null
foreach ($p in 5175..5195) {
    $tryListener = New-Object System.Net.HttpListener
    $tryListener.Prefixes.Add("http://localhost:$p/")
    try {
        $tryListener.Start()
        $listener = $tryListener
        $boundPort = $p
        break
    } catch {
        $tryListener.Close()
    }
}

if (-not $listener) {
    Write-Host '[错误] 端口 5175-5195 均被占用或无法监听，请关闭占用程序后重试。' -ForegroundColor Red
    exit 1
}

$url = "http://localhost:$boundPort/"
Write-Host "内置展馆服务已就绪: $url" -ForegroundColor Green
Write-Host "静态资源目录: $rootFull" -ForegroundColor DarkGray
Write-Host '浏览期间请勿关闭此窗口；按 Ctrl+C 或直接关闭窗口即可退出。' -ForegroundColor Yellow
Write-Host ''

if (-not $env:MUSEUM_NO_OPEN) {
    Start-Process $url
}

$mimeMap = @{
    '.html'  = 'text/html; charset=utf-8'
    '.htm'   = 'text/html; charset=utf-8'
    '.js'    = 'application/javascript; charset=utf-8'
    '.mjs'   = 'application/javascript; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.json'  = 'application/json; charset=utf-8'
    '.svg'   = 'image/svg+xml'
    '.png'   = 'image/png'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.webp'  = 'image/webp'
    '.ico'   = 'image/x-icon'
    '.glb'   = 'model/gltf-binary'
    '.gltf'  = 'model/gltf+json'
    '.woff2' = 'font/woff2'
    '.woff'  = 'font/woff'
    '.wasm'  = 'application/wasm'
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response
        try {
            $rawPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
            if ($rawPath -eq '/' -or [string]::IsNullOrWhiteSpace($rawPath)) {
                $relPath = 'index.html'
            } else {
                $relPath = $rawPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            }
            $candidate = [System.IO.Path]::GetFullPath((Join-Path $rootFull $relPath))
            if (-not $candidate.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
                $res.StatusCode = 403
                $res.Close()
                continue
            }
            if ((Test-Path $candidate -PathType Container)) {
                $candidate = Join-Path $candidate 'index.html'
            }
            if (-not (Test-Path $candidate -PathType Leaf)) {
                $res.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
                $res.ContentType = 'text/plain; charset=utf-8'
                $res.ContentLength64 = $errBytes.Length
                $res.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $res.Close()
                continue
            }
            $ext = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
            if ($mimeMap.ContainsKey($ext)) {
                $res.ContentType = $mimeMap[$ext]
            } else {
                $res.ContentType = 'application/octet-stream'
            }
            if ($ext -eq '.html' -or $ext -eq '.htm') {
                $res.Headers['Cache-Control'] = 'no-cache'
            } else {
                $res.Headers['Cache-Control'] = 'public, max-age=3600'
            }
            $bytes = [System.IO.File]::ReadAllBytes($candidate)
            $res.StatusCode = 200
            $res.ContentLength64 = $bytes.Length
            if ($req.HttpMethod -ne 'HEAD') {
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $res.OutputStream.Flush()
        } catch {
            # Ignore client abort / broken pipe errors
        } finally {
            try { $res.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
