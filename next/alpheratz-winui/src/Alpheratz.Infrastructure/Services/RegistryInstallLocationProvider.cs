using Microsoft.Win32;
using System;
using System.IO;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Provides installation paths and system environment details by querying the Windows Registry.
/// Adheres to the STELLAProject standardized registry hierarchy.
/// </summary>
public class RegistryInstallLocationProvider
{
    private const string RegistryBaseKey = @"Software\CosmoArtsStore\STELLAProject";

    public string? GetInstallLocation(string componentName)
    {
        using var key = Registry.CurrentUser.OpenSubKey($@"{RegistryBaseKey}\{componentName}");
        if (key == null) return null;

        var path = key.GetValue("InstallLocation") as string;
        if (string.IsNullOrEmpty(path) || !Directory.Exists(path)) return null;

        return path;
    }

    public string? GetAlpheratzInstallDir() => GetInstallLocation("Alpheratz");
    public string? GetPolarisInstallDir() => GetInstallLocation("Polaris");

    public string GetVrcLogsDirectory()
    {
        // Default relative path for VRChat logs in the LocalLow folder
        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "..", "LocalLow", "VRChat", "VRChat");
    }
}
