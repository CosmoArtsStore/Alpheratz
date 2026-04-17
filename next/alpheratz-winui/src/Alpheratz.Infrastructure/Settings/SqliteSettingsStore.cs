using Alpheratz.Contracts.Settings;

namespace Alpheratz.Infrastructure.Settings;

public class SqliteSettingsStore : ISettingsStore
{
    // アプリ設定の読込・保存
    public AppSettings Load()
    {
        return new AppSettings(Alpheratz.Domain.Settings.ThemeMode.Dark);
    }
}
