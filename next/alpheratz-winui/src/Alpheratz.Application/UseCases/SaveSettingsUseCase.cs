using Alpheratz.Contracts.Settings;
using Alpheratz.Domain.Entities;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Use case for persisting the application settings.
/// </summary>
public class SaveSettingsUseCase
{
    private readonly ISettingsStore _settingsStore;

    public SaveSettingsUseCase(ISettingsStore settingsStore)
    {
        _settingsStore = settingsStore;
    }

    /// <summary>
    /// Executes the use case to save settings.
    /// </summary>
    /// <param name="settings">The settings to save.</param>
    /// <returns>A task representing the operation.</returns>
    public async Task ExecuteAsync(AppSettings settings)
    {
        await _settingsStore.SaveSettingsAsync(settings);
    }
}
