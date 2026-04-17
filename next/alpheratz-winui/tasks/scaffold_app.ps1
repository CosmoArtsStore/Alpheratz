$appDir = "f:\DEVELOPFOLDER\Repositories\Alpheratz\next\alpheratz-winui\src\Alpheratz.App"
$coordinatorsDir = Join-Path $appDir "Coordinators"
New-Item -ItemType Directory -Force $coordinatorsDir | Out-Null

$coords = @("AppBootstrapper.cs", "WindowChromeCoordinator.cs", "NavigationCoordinator.cs", "DialogCoordinator.cs", "ToastCoordinator.cs", "ThemeCoordinator.cs")
foreach ($file in $coords) {
    Set-Content -Path (Join-Path $coordinatorsDir $file) -Value "namespace Alpheratz.App.Coordinators;`n`npublic class $([System.IO.Path]::GetFileNameWithoutExtension($file)) {}"
}
