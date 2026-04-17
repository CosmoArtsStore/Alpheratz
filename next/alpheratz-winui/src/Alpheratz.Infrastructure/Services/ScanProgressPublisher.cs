using Alpheratz.Domain.Models;
using System;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Publishes scan progress updates to the UI layer, with throttling to prevent excessive UI thread pressure.
/// Follows Design Doc Section 8.5 / 1641.
/// </summary>
public class ScanProgressPublisher : IProgress<ScanProgressSnapshot>
{
    private readonly Action<ScanProgressSnapshot> _onProgress;
    private DateTime _lastPublishTime = DateTime.MinValue;
    private readonly TimeSpan _throttleInterval = TimeSpan.FromMilliseconds(100);

    public ScanProgressPublisher(Action<ScanProgressSnapshot> onProgress)
    {
        _onProgress = onProgress;
    }

    /// <inheritdoc/>
    public void Report(ScanProgressSnapshot value)
    {
        var now = DateTime.UtcNow;
        // Always publish 0%, 100%, or if throttle interval has passed
        if (value.ProcessedCount == 0 || 
            value.ProcessedCount == value.TotalCount || 
            now - _lastPublishTime >= _throttleInterval)
        {
            _onProgress?.Invoke(value);
            _lastPublishTime = now;
        }
    }
}
