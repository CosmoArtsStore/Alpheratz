using Alpheratz.Contracts.Services;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Simple FIFO background job processor to ensure exclusive execution of long-running tasks.
/// Follows Design Doc Section 8.5 / 1601.
/// </summary>
public class BackgroundJobService : IBackgroundJobService
{
    private readonly SemaphoreSlim _lock = new(1, 1);
    private string? _currentJobDescription;
    private bool _isBusy;

    public bool IsBusy
    {
        get => _isBusy;
        private set
        {
            if (_isBusy != value)
            {
                _isBusy = value;
                IsBusyChanged?.Invoke(this, _isBusy);
            }
        }
    }

    public string? CurrentJobDescription => _currentJobDescription;

    public event EventHandler<bool>? IsBusyChanged;

    public async Task EnqueueJobAsync(Func<CancellationToken, Task> work, string description)
    {
        await _lock.WaitAsync();
        try
        {
            _currentJobDescription = description;
            IsBusy = true;
            await work(CancellationToken.None);
        }
        finally
        {
            _currentJobDescription = null;
            IsBusy = false;
            _lock.Release();
        }
    }
}
