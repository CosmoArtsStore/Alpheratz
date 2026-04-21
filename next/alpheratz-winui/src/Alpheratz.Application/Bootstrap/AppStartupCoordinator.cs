using Alpheratz.Contracts.Bootstrap;
using Alpheratz.Contracts.Data;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Contracts.Settings;
using System.Threading.Tasks;

namespace Alpheratz.Application.Bootstrap;

public sealed class AppStartupCoordinator
{
    private readonly ISettingsStore _settingsStore;
    private readonly ISqliteDatabaseInitializer _sqliteDatabaseInitializer;
    private readonly ILoggingFacade _logger;

    public AppStartupCoordinator(
        ISettingsStore settingsStore,
        ISqliteDatabaseInitializer sqliteDatabaseInitializer,
        ILoggingFacade logger)
    {
        _settingsStore = settingsStore;
        _sqliteDatabaseInitializer = sqliteDatabaseInitializer;
        _logger = logger;
    }

    public async Task<AppBootstrapContext> InitializeAsync()
    {
        var settings = await _settingsStore.LoadSettingsAsync();
        var databasePath = _sqliteDatabaseInitializer.InitializeDatabase();

        _logger.Info("Bootstrap", "Initialize", $"Theme={settings.Theme}, Database={databasePath}");

        // Map Domain Theme to AppBootstrapContext requirement if necessary
        // Note: AppSettings.Theme is Domain.Settings.ThemeMode
        return new AppBootstrapContext(settings.Theme, databasePath);
    }
}
