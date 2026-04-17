using Alpheratz.Contracts.Services;
using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Bootstrap;

/// <summary>
/// Handles the initial loading and validation of application settings during startup.
/// </summary>
public class SettingsBootstrapService
{
    private readonly ISettingsStore _settingsStore;
    private readonly ILoggingFacade _logger;

    public SettingsBootstrapService(ISettingsStore settingsStore, ILoggingFacade logger)
    {
        _settingsStore = settingsStore;
        _logger = logger;
    }

    /// <summary>
    /// Loads the settings at application startup.
    /// </summary>
    public async Task InitializeAsync()
    {
        _logger.Info("Bootstrap", "Settings", "Loading application settings.");
        var settings = await _settingsStore.LoadSettingsAsync();
        
        // Potential migration or validation of settings could happen here.
        if (!settings.IsInitialized)
        {
            _logger.Info("Bootstrap", "Settings", "Settings not initialized. First run mode candidate.");
        }
    }
}
