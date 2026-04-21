using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Contracts.Settings;
using Alpheratz.Domain.Entities;

namespace Alpheratz.Infrastructure.Database;

public class JsonSettingsStore : ISettingsStore
{
    private readonly IPathLayoutService _pathService;
    private static readonly JsonSerializerOptions _options = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public JsonSettingsStore(IPathLayoutService pathService)
    {
        _pathService = pathService;
    }

    private string GetSettingFilePath()
    {
        return _pathService.SettingsPath;
    }

    public async Task<AppSettings> LoadSettingsAsync()
    {
        var path = GetSettingFilePath();
        if (!File.Exists(path))
        {
            // Migrating legacy if needed
            var legacySettings = TryLoadLegacySettings();
            if (legacySettings != null)
            {
                await SaveSettingsAsync(legacySettings);
                return legacySettings;
            }
            return AppSettings.CreateDefault();
        }

        try
        {
            var json = await File.ReadAllTextAsync(path);
            var settings = JsonSerializer.Deserialize<AppSettings>(json, _options);
            return settings ?? AppSettings.CreateDefault();
        }
        catch
        {
            return AppSettings.CreateDefault();
        }
    }

    public async Task SaveSettingsAsync(AppSettings settings)
    {
        var path = GetSettingFilePath();
        var json = JsonSerializer.Serialize(settings, _options);
        await File.WriteAllTextAsync(path, json);
    }

    private AppSettings? TryLoadLegacySettings()
    {
        // Ported logic from config.rs: get_legacy_setting_paths
        // Alpheratz Tauri legacy paths usually reside in %APPDATA%
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var possibleLegacyPaths = new[]
        {
            Path.Combine(appData, "com.kaimutech.alpheratz", "settings.json"),
            Path.Combine(appData, "alpharatz-old", "settings.json"),
            Path.Combine(appData, "Alpheratz", "settings.json")
        };

        foreach (var path in possibleLegacyPaths)
        {
            if (File.Exists(path))
            {
                try
                {
                    var json = File.ReadAllText(path);
                    var settings = JsonSerializer.Deserialize<AppSettings>(json, _options);
                    if (settings != null)
                    {
                        return settings;
                    }
                }
                catch
                {
                    // Ignore errors on legacy read and try next
                }
            }
        }
        
        return null;
    }
}
