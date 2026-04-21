using Alpheratz.Application.Bootstrap;
using Alpheratz.Contracts.Bootstrap;
using Alpheratz.Contracts.Data;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Contracts.Settings;
using Alpheratz.Domain.Entities;
using System;
using System.Threading.Tasks;
using Xunit;

namespace Alpheratz.Application.Tests;

public sealed class AppBootstrapperTests
{
    [Fact]
    public async Task InitializeAsync_UsesStartupCoordinatorResult()
    {
        var startupCoordinator = new AppStartupCoordinator(
            new FakeSettingsStore(),
            new FakeSqliteDatabaseInitializer(),
            new FakeLoggingFacade());

        var context = await startupCoordinator.InitializeAsync();

        Assert.Equal(Alpheratz.Domain.Settings.ThemeMode.Light, context.InitialThemeMode);
        Assert.Equal("C:\\data\\alpheratz.db", context.DatabasePath);
    }

    private sealed class FakeSettingsStore : ISettingsStore
    {
        public Task<AppSettings> LoadSettingsAsync()
        {
            return Task.FromResult(new AppSettings { Theme = Alpheratz.Domain.Settings.ThemeMode.Light });
        }

        public Task SaveSettingsAsync(AppSettings settings)
        {
            return Task.CompletedTask;
        }
    }

    private sealed class FakeSqliteDatabaseInitializer : ISqliteDatabaseInitializer
    {
        public string InitializeDatabase()
        {
            return "C:\\data\\alpheratz.db";
        }
    }

    private sealed class FakeLoggingFacade : ILoggingFacade
    {
        public void Info(string category, string operation, string message) { }
        public void Warn(string category, string operation, string message) { }
        public void Error(string category, string operation, string message, Exception? ex = null) { }
        public void Debug(string category, string operation, string message) { }
    }
}
