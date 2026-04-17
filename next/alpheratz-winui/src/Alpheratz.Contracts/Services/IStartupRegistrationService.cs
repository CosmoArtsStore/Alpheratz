using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

/// <summary>
/// Service for managing application registration for OS startup.
/// </summary>
public interface IStartupRegistrationService
{
    Task<bool> IsRegisteredAsync();
    Task RegisterAsync();
    Task UnregisterAsync();
}
