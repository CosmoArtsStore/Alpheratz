using Alpheratz.Contracts.Infrastructure;
using System;
using System.IO;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Manages the physical layout of the application's data directory.
/// Resolves and ensures existence of logs, cache, settings, and backup subdirectories.
/// </summary>
public class PathLayoutService : IPathLayoutService
{
    private readonly RegistryInstallLocationProvider _registryProvider;

    public PathLayoutService(RegistryInstallLocationProvider registryProvider)
    {
        _registryProvider = registryProvider;
    }

    public string DatabasePath => Path.Combine(GetDbCacheDir() ?? throw new InvalidOperationException("DB cache dir missing"), "alpheratz.db");
    public string SettingsPath => Path.Combine(GetSettingDir() ?? throw new InvalidOperationException("Setting dir missing"), "settings.json");
    public string LogDirectory => GetLogDir() ?? throw new InvalidOperationException("Log dir missing");
    public string ThumbnailCacheDirectory => GetCacheDir() ?? throw new InvalidOperationException("Cache dir missing");
    public string AppDataRoot => GetBaseDataDir() ?? throw new InvalidOperationException("Base data dir missing");

    private string? GetBaseDataDir()
    {
        var installDir = _registryProvider.GetAlpheratzInstallDir();
        if (installDir == null) return null;
        
        var dataDir = Path.Combine(installDir, "data");
        if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
        return dataDir;
    }

    public string? GetLogDir() => GetOrCreateSubDir("log");
    public string? GetCacheDir() => GetOrCreateSubDir("cache");
    public string? GetSettingDir() => GetOrCreateSubDir("setting");
    public string? GetBackupDir() => GetOrCreateSubDir("backup");

    public string? GetDbCacheDir()
    {
        var cacheDir = GetCacheDir();
        if (cacheDir == null) return null;
        var dbCacheDir = Path.Combine(cacheDir, "shared-cache", "dbCache");
        if (!Directory.Exists(dbCacheDir)) Directory.CreateDirectory(dbCacheDir);
        return dbCacheDir;
    }

    public string? GetImgCacheDir(int sourceSlot)
    {
        var cacheDir = GetCacheDir();
        if (cacheDir == null) return null;
        var slotName = sourceSlot == 2 ? "2nd-cache" : "1st-cache";
        var imgCacheDir = Path.Combine(cacheDir, slotName, "imgCache");
        if (!Directory.Exists(imgCacheDir)) Directory.CreateDirectory(imgCacheDir);
        return imgCacheDir;
    }

    private string? GetOrCreateSubDir(string subDirName)
    {
        var baseDir = GetBaseDataDir();
        if (baseDir == null) return null;
        var subDir = Path.Combine(baseDir, subDirName);
        if (!Directory.Exists(subDir)) Directory.CreateDirectory(subDir);
        return subDir;
    }
}
