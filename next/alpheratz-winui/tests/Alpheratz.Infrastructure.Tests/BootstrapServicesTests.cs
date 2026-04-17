using Alpheratz.Infrastructure.Bootstrap;
using Alpheratz.Infrastructure.Data;
using Alpheratz.Infrastructure.Settings;

namespace Alpheratz.Infrastructure.Tests;

public sealed class BootstrapServicesTests
{
    [Fact]
    public void Initialize_CanBeCalledForAllBootstrapServices()
    {
        var settingsBootstrapService = new SettingsBootstrapService();
        var databaseBootstrapService = new DatabaseBootstrapService();
        var cacheBootstrapService = new CacheBootstrapService();

        settingsBootstrapService.Initialize();
        databaseBootstrapService.Initialize();
        cacheBootstrapService.Initialize();
    }

    [Fact]
    public void SettingsStore_Load_ReturnsThemeMode()
    {
        var settingsStore = new JsonSettingsStore();

        var settings = settingsStore.Load();

        Assert.True(Enum.IsDefined(settings.ThemeMode));
    }

    [Fact]
    public void SqliteDatabaseInitializer_CreateDatabaseFile()
    {
        var databaseInitializer = new SqliteDatabaseInitializer();

        var databasePath = databaseInitializer.InitializeDatabase();

        Assert.True(File.Exists(databasePath));
    }
}
