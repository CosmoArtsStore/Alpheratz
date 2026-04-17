$infraDir = "f:\DEVELOPFOLDER\Repositories\Alpheratz\next\alpheratz-winui\src\Alpheratz.Infrastructure"
$reposDir = Join-Path $infraDir "Repositories"
$sqliteDir = Join-Path $infraDir "Database"
$servicesDir = Join-Path $infraDir "Services"

New-Item -ItemType Directory -Force $reposDir | Out-Null
New-Item -ItemType Directory -Force $sqliteDir | Out-Null
New-Item -ItemType Directory -Force $servicesDir | Out-Null

$sqliteFiles = @(
    "SqliteConnectionFactory.cs",
    "SqliteSchemaMigrator.cs",
    "SqlitePhotoReadRepository.cs",
    "SqlitePhotoMutationRepository.cs",
    "SqliteTagRepository.cs",
    "SqliteSimilarCandidateRepository.cs",
    "SqliteSettingsStore.cs"
)

foreach ($file in $sqliteFiles) {
    Set-Content -Path (Join-Path $sqliteDir $file) -Value "namespace Alpheratz.Infrastructure.Database;`n`npublic class $([System.IO.Path]::GetFileNameWithoutExtension($file)) {}"
}

$serviceFiles = @(
    "BackupService.cs",
    "PathLayoutService.cs",
    "RegistryInstallLocationProvider.cs",
    "LoggingFacade.cs",
    "PhotoFolderScanner.cs",
    "PhotoFileEnumerator.cs",
    "PhotoMetadataAnalyzer.cs",
    "TimestampResolver.cs",
    "PngVrcMetadataReader.cs",
    "WorldResolutionService.cs",
    "StellaRecordWorldResolver.cs",
    "ImageDimensionReader.cs",
    "ThumbnailPrewarmService.cs",
    "ThumbnailCacheService.cs",
    "RightSizedDecodeService.cs",
    "ImageReferenceLifetimeManager.cs",
    "FolderWatchService.cs",
    "FolderChangeAggregationService.cs",
    "StartupRegistrationService.cs",
    "ExplorerRevealService.cs",
    "ExternalLinkService.cs",
    "PdqHashService.cs",
    "PdqWorldInferenceService.cs",
    "ScanProgressPublisher.cs",
    "BrowseThumbnailProvider.cs",
    "DetailImageProvider.cs"
)

foreach ($file in $serviceFiles) {
    Set-Content -Path (Join-Path $servicesDir $file) -Value "namespace Alpheratz.Infrastructure.Services;`n`npublic class $([System.IO.Path]::GetFileNameWithoutExtension($file)) {}"
}
