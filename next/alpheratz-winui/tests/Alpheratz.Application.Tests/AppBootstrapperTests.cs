using Alpheratz.Application.Bootstrap;
using Alpheratz.Contracts.Data;
using Alpheratz.Contracts.Diagnostics;
using Alpheratz.Contracts.Settings;
using Alpheratz.Domain.Settings;

namespace Alpheratz.Application.Tests;

public sealed class AppBootstrapperTests
{
    [Fact]
    public void Build_UsesStartupCoordinatorResult()
    {
        var startupCoordinator = new AppStartupCoordinator(
            new FakeSettingsStore(),
            new FakeSqliteDatabaseInitializer(),
            new FakeAppLogger());

        var context = AppBootstrapper.Build(startupCoordinator);

        Assert.Equal(ThemeMode.Light, context.InitialThemeMode);
        Assert.Equal("C:\\data\\alpheratz.db", context.DatabasePath);
    }

    private sealed class FakeSettingsStore : ISettingsStore
    {
        public AppSettings Load()
        {
            return new(ThemeMode.Light);
        }
    }

    private sealed class FakeSqliteDatabaseInitializer : ISqliteDatabaseInitializer
    {
        public string InitializeDatabase()
        {
            return "C:\\data\\alpheratz.db";
        }
    }

    private sealed class FakeAppLogger : IAppLogger
    {
        public void LogInformation(string operation, string message)
        {
        }
    }
}
