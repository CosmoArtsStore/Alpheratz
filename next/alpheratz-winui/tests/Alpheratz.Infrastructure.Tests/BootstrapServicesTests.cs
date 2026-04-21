using Alpheratz.Infrastructure.Bootstrap;
using Alpheratz.Infrastructure.Data;
using Alpheratz.Infrastructure.Database;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Contracts.Settings;
using Moq;
using System.Threading.Tasks;
using System;
using System.IO;
using Xunit;

namespace Alpheratz.Infrastructure.Tests;

public sealed class BootstrapServicesTests
{
    [Fact]
    public async Task InitializeAsync_CanBeCalledForAllBootstrapServices()
    {
        var mockSettingsStore = new Mock<ISettingsStore>();
        var mockLogger = new Mock<ILoggingFacade>();
        var mockPathLayout = new Mock<IPathLayoutService>();
        
        // SettingsBootstrapService requires ISettingsStore and ILoggingFacade
        var settingsBootstrapService = new SettingsBootstrapService(mockSettingsStore.Object, mockLogger.Object);
        
        // CacheBootstrapService requires IPathLayoutService and ILoggingFacade
        var cacheBootstrapService = new CacheBootstrapService(mockPathLayout.Object, mockLogger.Object);

        await settingsBootstrapService.InitializeAsync();
        await cacheBootstrapService.InitializeAsync();
    }

    [Fact]
    public async Task JsonSettingsStore_Load_ReturnsDefaultSettings()
    {
        var mockPathLayout = new Mock<IPathLayoutService>();
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
        mockPathLayout.Setup(p => p.SettingsPath).Returns(Path.Combine(tempDir, "settings.json"));

        var settingsStore = new JsonSettingsStore(mockPathLayout.Object);

        var settings = await settingsStore.LoadSettingsAsync();

        Assert.NotNull(settings);
        
        // Cleanup
        if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
    }

    [Fact]
    public void SqliteDatabaseInitializer_CreateDatabaseFile()
    {
        var databaseInitializer = new SqliteDatabaseInitializer();

        var databasePath = databaseInitializer.InitializeDatabase();

        Assert.True(File.Exists(databasePath));
    }
}
