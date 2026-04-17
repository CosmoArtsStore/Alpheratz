# Alpheratz WinUI3 Implementation Plan

## 1. Preparation & Fix Build
- [x] Investigate and fix the XamlCompiler error in `Alpheratz.Presentation` and `Alpheratz.App` to ensure a clean build.

## 2. Implement Domain Layer
- [x] Define Value Objects (`PhotoIdentity`, `SourceSlot`, `PhotoFolder`, `WorldIdentity`, `WorldGroupKey`, `TagName`, `PhotoDimensions`, `PhotoOrientation`, `PhotoTimestamp`, `MatchSource`).
- [x] Define Entities (`Photo`, `SimilarWorldCandidate`, `AppSettings`, `BackupDescriptor`, `ScanProgressSnapshot`).
- [ ] Define Query Objects (`GalleryQuery`, `GalleryWindowRequest`, `GalleryWindowResult`).

## 3. Implement Contracts (Interfaces & DTOs)
- [ ] Define Interfaces for Repositories (`IPhotoReadRepository`, `IPhotoMutationRepository`, `ITagRepository`, `ISimilarCandidateRepository`, `ISettingsStore`).
- [ ] Define Interfaces for Services (`IPhotoExportService`, `IBackupService`, `IPdqSimilarityService`, `IBackgroundJobService`, `IScanOrchestrator`, etc.).

## 4. Implement Application Layer (Use Cases)
- [ ] Build Orchestration Use Cases (`InitializeApplicationUseCase`, `BuildIndexUseCase`).
- [ ] Build Gallery Query Use Cases (`BuildGalleryQueryUseCase`, `LoadGalleryPageUseCase`, `LoadGalleryViewportUseCase`, `RefreshGalleryAfterScanUseCase`).
- [ ] Build Detail & Mutation Use Cases (`LoadPhotoDetailUseCase`, `UpdatePhotoMemoUseCase`, `UpdateFavoriteUseCase`, `BulkFavoriteUseCase`, `AddPhotoTagUseCase`, `RemovePhotoTagUseCase`, `BulkTagUseCase`).
- [ ] Build World & Tag Use Cases (`FindSimilarWorldCandidatesUseCase`, `ApplyWorldMatchUseCase`, `LoadWorldFilterOptionsUseCase`, `StartUnknownWorldAnalysisUseCase`).

## 5. Implement Infrastructure Layer
- [ ] Implement SQLite Repositories (`SqliteConnectionFactory`, `SqliteSchemaMigrator`, `SqlitePhotoReadRepository`, `SqlitePhotoMutationRepository`, `SqliteTagRepository`, `SqliteSimilarCandidateRepository`).
- [ ] Implement File/Directory Services (`FolderWatchService`, `FolderChangeAggregationService`, `BackupService`, `PathLayoutService`, `RegistryInstallLocationProvider`).
- [ ] Implement Image & Media Services (`ImageDimensionReader`, `RightSizedDecodeService`, `ThumbnailCacheService`, `BrowseThumbnailProvider`, `DetailImageProvider`).

## 6. Implement Presentation & App Layers (ViewModels & Coordinators)
- [ ] Implement Global Coordinators (`AppBootstrapper`, `MainWindow`, `WindowChromeCoordinator`, `NavigationCoordinator`, `DialogCoordinator`, `ToastCoordinator`, `ThemeCoordinator`).
- [ ] Implement ViewModels for Gallery (`ShellViewModel`, `GalleryPageViewModel`, `GalleryToolbarViewModel`, `GalleryQueryPanelViewModel`, `GallerySelectionViewModel`, `BulkActionBarViewModel`, `GalleryViewportViewModel`, `GalleryItemViewModel`).
- [ ] Implement ViewModels for Details & Settings (`PhotoDetailPaneViewModel`, `PhotoMetadataPanelViewModel`, `PhotoTagEditorViewModel`, `SimilarWorldDialogViewModel`, `SettingsPageViewModel`).

## 7. Review & Verification
- [ ] Verify build passes without errors and warnings.
- [ ] Request code review from `reviewer.toml` subagent (`f:\DEVELOPFOLDER\STELLADoc\UserTools\notes`).
- [ ] Format and lint with `cargo fmt`, `clippy` (for rust parts?), `dotnet format`.
