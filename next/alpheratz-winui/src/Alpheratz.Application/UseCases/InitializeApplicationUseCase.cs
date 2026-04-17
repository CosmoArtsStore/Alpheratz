using Alpheratz.Contracts.Infrastructure;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Orchestrates the domain-level validation during application startup.
/// Follows Design Doc Section 8.3 / 856.
/// </summary>
public class InitializeApplicationUseCase
{
    private readonly LoadSettingsUseCase _loadSettings;
    private readonly ILoggingFacade _logger;

    public InitializeApplicationUseCase(
        LoadSettingsUseCase loadSettings,
        ILoggingFacade logger)
    {
        _loadSettings = loadSettings;
        _logger = logger;
    }

    /// <summary>
    /// Checks the current configuration and returns whether the application is in "First Run" mode.
    /// </summary>
    /// <returns>True if the user needs to complete the setup wizard.</returns>
    public async Task<bool> ExecuteAsync()
    {
        _logger.Info("InitUseCase", "Execute", "Checking application readiness.");
        
        try
        {
            // Load settings via specialized use case
            var settings = await _loadSettings.ExecuteAsync();
            
            // First run is defined as having no primary photos directory configured
            bool isFirstRun = string.IsNullOrWhiteSpace(settings.PhotoFolderPath);
            
            _logger.Info("InitUseCase", "Execute", isFirstRun 
                ? "First run state detected (no photo path)." 
                : "Application ready for main gallery.");
                
            return isFirstRun;
        }
        catch (System.Exception ex)
        {
            _logger.Error("InitUseCase", "Execute", "Failed to determine application state.", ex);
            // We assume safe default of first-run or bubbling up the fatal error
            throw;
        }
    }
}
