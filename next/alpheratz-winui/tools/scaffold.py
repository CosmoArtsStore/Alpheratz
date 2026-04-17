import os

layers_and_classes = {
    'App': [
        ('Hosting', 'AppBootstrapper'),
        ('Coordinators', 'WindowChromeCoordinator'),
        ('Coordinators', 'NavigationCoordinator'),
        ('Coordinators', 'DialogCoordinator'),
        ('Coordinators', 'ToastCoordinator'),
        ('Coordinators', 'ThemeCoordinator')
    ],
    'Presentation': [
        ('ViewModels', 'ShellViewModel'),
        ('ViewModels', 'GalleryPageViewModel'),
        ('ViewModels', 'GalleryToolbarViewModel'),
        ('ViewModels', 'GalleryQueryPanelViewModel'),
        ('ViewModels', 'GallerySelectionViewModel'),
        ('ViewModels', 'BulkActionBarViewModel'),
        ('ViewModels', 'GalleryViewportViewModel'),
        ('Coordinators', 'GalleryItemsSourceCoordinator'),
        ('ViewModels', 'GalleryItemViewModel'),
        ('ViewModels', 'PhotoDetailPaneViewModel'),
        ('ViewModels', 'PhotoMetadataPanelViewModel'),
        ('ViewModels', 'PhotoTagEditorViewModel'),
        ('ViewModels', 'SimilarWorldDialogViewModel'),
        ('ViewModels', 'SettingsPageViewModel'),
        ('ViewModels', 'FirstRunPageViewModel'),
        ('ViewModels', 'TagMasterPageViewModel'),
        ('ViewModels', 'TweetTemplatePageViewModel')
    ],
    'Application': [
        ('UseCases', 'InitializeApplicationUseCase'),
        ('UseCases', 'BuildGalleryQueryUseCase'),
        ('UseCases', 'LoadGalleryPageUseCase'),
        ('UseCases', 'LoadGalleryViewportUseCase'),
        ('UseCases', 'RefreshGalleryAfterScanUseCase'),
        ('UseCases', 'LoadPhotoDetailUseCase'),
        ('UseCases', 'UpdatePhotoMemoUseCase'),
        ('UseCases', 'UpdateFavoriteUseCase'),
        ('UseCases', 'BulkFavoriteUseCase'),
        ('UseCases', 'AddPhotoTagUseCase'),
        ('UseCases', 'RemovePhotoTagUseCase'),
        ('UseCases', 'BulkTagUseCase'),
        ('UseCases', 'LoadTagMasterUseCase'),
        ('UseCases', 'CreateTagMasterUseCase'),
        ('UseCases', 'DeleteTagMasterUseCase'),
        ('UseCases', 'FindSimilarWorldCandidatesUseCase'),
        ('UseCases', 'ApplyWorldMatchUseCase'),
        ('UseCases', 'StartScanUseCase'),
        ('UseCases', 'CancelScanUseCase'),
        ('UseCases', 'BuildIndexUseCase'),
        ('UseCases', 'ChangePhotoFolderUseCase'),
        ('UseCases', 'ResetPhotoFolderUseCase'),
        ('UseCases', 'RestoreBackupUseCase'),
        ('UseCases', 'LoadSettingsUseCase'),
        ('UseCases', 'SaveSettingsUseCase'),
        ('UseCases', 'SaveTweetTemplateUseCase'),
        ('UseCases', 'ExportSelectedPhotosUseCase'),
        ('UseCases', 'LoadWorldFilterOptionsUseCase'),
        ('UseCases', 'StartUnknownWorldAnalysisUseCase')
    ],
    'Domain': [
        ('Entities', 'Photo'),
        ('ValueObjects', 'PhotoIdentity'),
        ('ValueObjects', 'SourceSlot'),
        ('ValueObjects', 'PhotoFolder'),
        ('ValueObjects', 'WorldIdentity'),
        ('ValueObjects', 'WorldGroupKey'),
        ('ValueObjects', 'TagName'),
        ('ValueObjects', 'PhotoDimensions'),
        ('ValueObjects', 'PhotoOrientation'),
        ('ValueObjects', 'PhotoTimestamp'),
        ('ValueObjects', 'MatchSource'),
        ('Queries', 'GalleryQuery'),
        ('Models', 'GalleryWindowRequest'),
        ('Models', 'GalleryWindowResult'),
        ('Models', 'SimilarWorldCandidate'),
        ('Aggregates', 'AppSettings'),
        ('Models', 'BackupDescriptor'),
        ('Models', 'ScanProgressSnapshot')
    ],
    'Infrastructure': [
        ('Data', 'SqliteConnectionFactory'),
        ('Data', 'SqliteSchemaMigrator'),
        ('Repositories', 'SqlitePhotoReadRepository'),
        ('Repositories', 'SqlitePhotoMutationRepository'),
        ('Repositories', 'SqliteTagRepository'),
        ('Repositories', 'SqliteSimilarCandidateRepository'),
        ('Stores', 'SqliteSettingsStore'),
        ('Services', 'BackupService'),
        ('Services', 'PathLayoutService'),
        ('Services', 'RegistryInstallLocationProvider'),
        ('Services', 'LoggingFacade'),
        ('Scanners', 'PhotoFolderScanner'),
        ('Scanners', 'PhotoFileEnumerator'),
        ('Scanners', 'PhotoMetadataAnalyzer'),
        ('Scanners', 'TimestampResolver'),
        ('Scanners', 'PngVrcMetadataReader'),
        ('Services', 'WorldResolutionService'),
        ('Services', 'StellaRecordWorldResolver'),
        ('Services', 'ImageDimensionReader'),
        ('Services', 'ThumbnailPrewarmService'),
        ('Services', 'ThumbnailCacheService'),
        ('Providers', 'BrowseThumbnailProvider'),
        ('Providers', 'DetailImageProvider'),
        ('Services', 'RightSizedDecodeService'),
        ('Services', 'ImageReferenceLifetimeManager'),
        ('Services', 'FolderWatchService'),
        ('Services', 'FolderChangeAggregationService'),
        ('Services', 'StartupRegistrationService'),
        ('Services', 'ExplorerRevealService'),
        ('Services', 'ExternalLinkService'),
        ('Services', 'PdqHashService'),
        ('Services', 'PdqWorldInferenceService'),
        ('Publishers', 'ScanProgressPublisher')
    ],
    'Contracts': [
        ('Interfaces', 'IPhotoReadRepository'),
        ('Interfaces', 'IPhotoMutationRepository'),
        ('Interfaces', 'ITagRepository'),
        ('Interfaces', 'ISimilarCandidateRepository'),
        ('Interfaces', 'ISettingsStore'),
        ('Interfaces', 'IBackupService'),
        ('Interfaces', 'IPdqSimilarityService'),
        ('Interfaces', 'IScanOrchestrator'),
        ('Interfaces', 'IPhotoIndexRepository'),
        ('Interfaces', 'IThumbnailPrewarmService'),
        ('Interfaces', 'IWorldResolutionService'),
        ('Interfaces', 'IPdqHashService'),
        ('Interfaces', 'IPhotoExportService'),
        ('Interfaces', 'IBackgroundJobService'),
        ('Interfaces', 'IPhotoDetailRepository'),
        ('Interfaces', 'IDetailImageProvider')
    ]
}

base_path = r"f:/DEVELOPFOLDER/Repositories/Alpheratz/next/alpheratz-winui/src"

class_template = """namespace Alpheratz.{layer}.{subfolder};

public class {class_name}
{{
}}
"""

interface_template = """namespace Alpheratz.{layer}.{subfolder};

public interface {class_name}
{{
}}
"""

for layer, classes in layers_and_classes.items():
    layer_dir = os.path.join(base_path, f"Alpheratz.{layer}")
    if not os.path.exists(layer_dir):
        os.makedirs(layer_dir)
        
    for subfolder, class_name in classes:
        folder_path = os.path.join(layer_dir, subfolder)
        os.makedirs(folder_path, exist_ok=True)
        file_path = os.path.join(folder_path, f"{class_name}.cs")
        
        if not os.path.exists(file_path):
            with open(file_path, "w", encoding="utf-8") as f:
                if class_name.startswith("I") and class_name[1].isupper():
                    f.write(interface_template.format(layer=layer, subfolder=subfolder, class_name=class_name))
                else:
                    f.write(class_template.format(layer=layer, subfolder=subfolder, class_name=class_name))

print("Scaffolding complete.")
