using Alpheratz.Contracts.Settings;
using Alpheratz.Domain.Entities;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Settings;

public class SqliteSettingsStore : ISettingsStore
{
    // アプリ設定の読込・保存
    public Task<AppSettings> LoadSettingsAsync()
    {
        // TODO: Implement SQLite backend for settings if required.
        // For now, return default to satisfy interface.
        return Task.FromResult(AppSettings.CreateDefault());
    }

    public Task SaveSettingsAsync(AppSettings settings)
    {
        // TODO: Implement SQLite backend for settings if required.
        return Task.CompletedTask;
    }
}
