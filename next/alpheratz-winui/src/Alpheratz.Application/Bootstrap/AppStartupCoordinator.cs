using Alpheratz.Contracts.Bootstrap;
using Alpheratz.Contracts.Data;
using Alpheratz.Contracts.Diagnostics;
using Alpheratz.Contracts.Settings;

namespace Alpheratz.Application.Bootstrap;

public sealed class AppStartupCoordinator
{
    private readonly ISettingsStore _settingsStore;
    private readonly ISqliteDatabaseInitializer _sqliteDatabaseInitializer;
    private readonly IAppLogger _appLogger;

    public AppStartupCoordinator(
        ISettingsStore settingsStore,
        ISqliteDatabaseInitializer sqliteDatabaseInitializer,
        IAppLogger appLogger)
    {
        _settingsStore = settingsStore;
        _sqliteDatabaseInitializer = sqliteDatabaseInitializer;
        _appLogger = appLogger;
    }

    public AppBootstrapContext Initialize()
    {
        var settings = _settingsStore.Load();
        var databasePath = _sqliteDatabaseInitializer.InitializeDatabase();

        _appLogger.LogInformation("initialize_startup", $"Theme={settings.ThemeMode}, Database={databasePath}");

        return new AppBootstrapContext(settings.ThemeMode, databasePath);
    }
}
