using Alpheratz.Contracts.Services;
using Microsoft.Win32;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Service for registering the application to start automatically with Windows.
/// </summary>
public class StartupRegistrationService : IStartupRegistrationService
{
    private const string AppName = "Alpheratz";
    private const string RunKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Run";

    /// <summary>
    /// Registers the application for startup.
    /// </summary>
    public Task RegisterAsync() => SetStartupAsync(true);

    /// <summary>
    /// Unregisters the application from startup.
    /// </summary>
    public Task UnregisterAsync() => SetStartupAsync(false);

    /// <summary>
    /// Checks if the application is currently registered for startup.
    /// </summary>
    public async Task<bool> IsRegisteredAsync()
    {
        using var key = Registry.CurrentUser.OpenSubKey(RunKeyPath, false);
        if (key == null) return false;
        
        var value = key.GetValue(AppName) as string;
        if (string.IsNullOrEmpty(value)) return false;

        var currentPath = Environment.ProcessPath;
        return string.Equals(value, $"\"{currentPath}\" --background", StringComparison.OrdinalIgnoreCase);
    }

    private Task SetStartupAsync(bool enable)
    {
        using var key = Registry.CurrentUser.OpenSubKey(RunKeyPath, true);
        if (key == null) return Task.CompletedTask;

        if (enable)
        {
            var exePath = Environment.ProcessPath;
            if (!string.IsNullOrEmpty(exePath))
            {
                key.SetValue(AppName, $"\"{exePath}\" --background");
            }
        }
        else
        {
            key.DeleteValue(AppName, false);
        }
        return Task.CompletedTask;
    }
}
