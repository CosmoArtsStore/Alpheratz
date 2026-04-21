using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;
using System.Threading.Tasks;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Contracts.Settings;
using Alpheratz.Contracts.Services;
using Alpheratz.Infrastructure.Logging;
using Alpheratz.Infrastructure.FileSystem;
using Alpheratz.Infrastructure.Database;
using Alpheratz.Infrastructure.Repositories;
using Alpheratz.Infrastructure.Services;
using Alpheratz.Infrastructure.Bootstrap;
using Alpheratz.Presentation.Coordinators;
using Alpheratz.Application.UseCases;
using Alpheratz.Presentation.ViewModels;
using Alpheratz.Presentation.Services;

namespace Alpheratz.App.Bootstrap;

/// <summary>
/// Startup boundary class responsible for initializing dependencies, settings, logs, and database.
/// Follows Design Doc Section 8.1 / 587.
/// </summary>
public static class AppBootstrapper
{
    /// <summary>
    /// Configures the service collection for the application.
    /// </summary>
    public static void ConfigureServices(IServiceCollection services)
    {
        // 1. Diagnostics & Logging
        services.AddSingleton<ILoggingFacade, LoggingFacade>();

        // 2. Infrastructure & Services
        services.AddSingleton<IPathLayoutService, PathLayoutService>();
        services.AddSingleton<SqliteConnectionFactory>();
        services.AddSingleton<SqliteSchemaMigrator>();
        services.AddSingleton<IPdqHashService, PdqHashService>();
        services.AddSingleton<IPdqSimilarityService, PdqSimilarityService>();
        services.AddSingleton<PdqWorldInferenceService>();
        services.AddSingleton<IVrcLogScraper, VrcLogScraper>();
        services.AddSingleton<IWorldResolutionService, WorldResolutionService>();
        services.AddSingleton<IPhotoExportService, PhotoExportService>();
        services.AddSingleton<IBackgroundJobService, BackgroundJobService>();
        services.AddSingleton<IScanOrchestrator, ScanOrchestrator>();
        services.AddSingleton<IThumbnailCacheService, ThumbnailCacheService>();
        services.AddSingleton<BrowseThumbnailProvider>();
        services.AddSingleton<IThumbnailPrewarmService, ThumbnailPrewarmService>();
        services.AddSingleton<FolderChangeAggregationService>();
        services.AddSingleton<PhotoFolderScanner>();
        services.AddSingleton<PhotoFileEnumerator>();
        services.AddSingleton<PhotoMetadataAnalyzer>();
        services.AddSingleton<TimestampResolver>();
        services.AddSingleton<PngVrcMetadataReader>();

        // 3. Repositories & Stores
        services.AddSingleton<ISettingsStore, JsonSettingsStore>();
        services.AddSingleton<ITagRepository, SqliteTagRepository>();
        services.AddSingleton<IWorldVisitRepository, SqliteWorldVisitRepository>();
        services.AddSingleton<IPhotoReadRepository, SqlitePhotoReadRepository>();
        services.AddSingleton<IPhotoMutationRepository, SqlitePhotoMutationRepository>();
        services.AddSingleton<ISimilarCandidateRepository, SqliteSimilarCandidateRepository>();
        services.AddSingleton<ITweetTemplateRepository, SqliteTweetTemplateRepository>();

        // 4. Bootstrap Services
        services.AddSingleton<SettingsBootstrapService>();
        services.AddSingleton<DatabaseBootstrapService>();
        services.AddSingleton<CacheBootstrapService>();

        // 5. App Layer Coordinators
        services.AddSingleton<WindowChromeCoordinator>();
        services.AddSingleton<ThemeCoordinator>();
        services.AddSingleton<DialogCoordinator>();
        services.AddSingleton<ToastCoordinator>();
        services.AddSingleton<NavigationCoordinator>();
        services.AddSingleton<GalleryItemsSourceCoordinator>();

        // 6. Application Use Cases
        services.AddTransient<InitializeApplicationUseCase>();
        services.AddTransient<LoadSettingsUseCase>();
        services.AddTransient<SaveSettingsUseCase>();
        services.AddTransient<LoadGalleryPageUseCase>();
        services.AddTransient<StartScanUseCase>();
        services.AddTransient<LoadPhotoDetailUseCase>();
        services.AddTransient<UpdatePhotoMemoUseCase>();
        services.AddTransient<UpdateFavoriteUseCase>();
        services.AddTransient<BulkFavoriteUseCase>();
        services.AddTransient<BulkTagUseCase>();
        services.AddTransient<AddPhotoTagUseCase>();
        services.AddTransient<RemovePhotoTagUseCase>();
        services.AddTransient<LoadTagMasterUseCase>();
        services.AddTransient<CreateTagMasterUseCase>();
        services.AddTransient<DeleteTagMasterUseCase>();
        services.AddTransient<LoadDuplicateGroupsUseCase>();
        services.AddTransient<DeletePhotoUseCase>();
        services.AddTransient<ResetPhotoFolderUseCase>();
        services.AddTransient<ExportSelectedPhotosUseCase>();
        services.AddTransient<StartUnknownWorldAnalysisUseCase>();
        services.AddTransient<SyncVrcLogsUseCase>();
        services.AddTransient<ScanPolarisArchiveUseCase>();
        services.AddTransient<LoadTweetTemplatesUseCase>();
        services.AddTransient<SaveTweetTemplateUseCase>();
        services.AddTransient<RenameTagMasterUseCase>();
        services.AddTransient<OpenPhotoInExplorerUseCase>();

        // 7. Presentation ViewModels
        services.AddSingleton<ShellViewModel>();
        services.AddTransient<GalleryPageViewModel>();
        services.AddTransient<GalleryToolbarViewModel>();
        services.AddTransient<GalleryQueryPanelViewModel>();
        services.AddTransient<GallerySelectionViewModel>();
        services.AddTransient<GalleryViewportViewModel>();
        services.AddTransient<PhotoDetailPaneViewModel>();
        services.AddTransient<PhotoMetadataPanelViewModel>();
        services.AddTransient<PhotoTagEditorViewModel>();
        services.AddTransient<BulkActionBarViewModel>();
        services.AddTransient<TagMasterPageViewModel>();
        services.AddTransient<TweetTemplatePageViewModel>();
        services.AddTransient<SettingsPageViewModel>();
        services.AddTransient<FirstRunPageViewModel>();
        services.AddTransient<DuplicatePageViewModel>();
    }

    /// <summary>
    /// Executes the sequenced initialization sequence.
    /// </summary>
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        var logger = serviceProvider.GetRequiredService<ILoggingFacade>();

        try
        {
            logger.Info("Bootstrap", "Start", "Starting application initialization.");

            // 0. Initialize Dapper TypeHandlers
            DapperTypeHandlerSetup.Initialize();

            // 1. Load Settings
            var settingsBootstrap = serviceProvider.GetRequiredService<SettingsBootstrapService>();
            await settingsBootstrap.InitializeAsync();

            // 2. Initialize Database and Migration
            var dbBootstrap = serviceProvider.GetRequiredService<DatabaseBootstrapService>();
            await dbBootstrap.InitializeAsync();

            // 3. Initialize Cache
            var cacheBootstrap = serviceProvider.GetRequiredService<CacheBootstrapService>();
            await cacheBootstrap.InitializeAsync();

            logger.Info("Bootstrap", "Complete", "Application initialization completed successfully.");
        }
        catch (Exception ex)
        {
            logger.Error("Bootstrap", "Fatal", "Application failed to start during bootstrap.", ex);
            throw;
        }
    }
}
