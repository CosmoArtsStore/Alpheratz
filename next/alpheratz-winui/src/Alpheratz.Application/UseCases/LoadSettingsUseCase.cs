using Alpheratz.Contracts.Interfaces;
using Alpheratz.Domain.Aggregates;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Use case for retrieving the current application settings.
/// </summary>
public class LoadSettingsUseCase
{
    private readonly ISettingsStore _settingsStore;

    public LoadSettingsUseCase(ISettingsStore settingsStore)
    {
        _settingsStore = settingsStore;
    }

    /// <summary>
    /// Executes the use case to load settings.
    /// </summary>
    /// <returns>The loaded AppSettings object.</returns>
    public async Task<AppSettings> ExecuteAsync()
    {
        return await _settingsStore.LoadSettingsAsync();
    }
}
