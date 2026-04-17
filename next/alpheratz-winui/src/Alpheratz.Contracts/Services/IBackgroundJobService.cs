using System;
using System.Threading;
using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

/// <summary>
/// Service for enqueuing and executing long-running background tasks.
/// Ensured exclusive execution for database-heavy or UI-blocking operations.
/// </summary>
public interface IBackgroundJobService
{
    bool IsBusy { get; }
    string? CurrentJobDescription { get; }
    event EventHandler<bool>? IsBusyChanged;

    Task EnqueueJobAsync(Func<CancellationToken, Task> work, string description);
}
