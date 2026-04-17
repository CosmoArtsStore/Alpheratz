using System.Text.Json;
using Alpheratz.Contracts.Settings;
using Alpheratz.Domain.Settings;

namespace Alpheratz.Infrastructure.Settings;

public sealed class JsonSettingsStore : ISettingsStore
{
    private readonly string _settingsFilePath;

    public JsonSettingsStore()
    {
        var settingsDirectoryPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Alpheratz",
            "Settings");
        Directory.CreateDirectory(settingsDirectoryPath);
        _settingsFilePath = Path.Combine(settingsDirectoryPath, "appsettings.json");
    }

    public AppSettings Load()
    {
        if (!File.Exists(_settingsFilePath))
        {
            var defaultSettings = new AppSettings(ThemeMode.Dark);
            var defaultJson = JsonSerializer.Serialize(defaultSettings);
            File.WriteAllText(_settingsFilePath, defaultJson);
            return defaultSettings;
        }

        var json = File.ReadAllText(_settingsFilePath);
        return JsonSerializer.Deserialize<AppSettings>(json) ?? new AppSettings(ThemeMode.Dark);
    }
}
