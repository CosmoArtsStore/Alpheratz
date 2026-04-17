using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Aggregates and debounces file system change events to trigger scans efficiently.
/// Prevents redundant scanning when multiple files are added/modified in quick succession.
/// Follows Design Doc Section 8.5 / 1521.
/// </summary>
public class FolderChangeAggregationService
{
    private readonly ConcurrentDictionary<int, CancellationTokenSource> _pendingScans = new();
    private readonly TimeSpan _debounceDelay = TimeSpan.FromSeconds(3);

    /// <summary>
    /// Notifies that a change occurred in the specified slot.
    /// Triggers the scan action after a debounce delay.
    /// </summary>
    public void NotifyChange(int slot, Func<int, Task> onScanTrigger)
    {
        // Cancel previous timer for this slot if it exists (Debounce logic)
        if (_pendingScans.TryRemove(slot, out var existingCts))
        {
            existingCts.Cancel();
            existingCts.Dispose();
        }

        var cts = new CancellationTokenSource();
        _pendingScans[slot] = cts;

        _ = Task.Run(async () =>
        {
            try
            {
                // Wait for quiescence
                await Task.Delay(_debounceDelay, cts.Token);
                
                if (!cts.IsCancellationRequested)
                {
                    await onScanTrigger(slot);
                }
            }
            catch (TaskCanceledException) 
            {
                // Successfully debounced by a newer event
            }
            finally
            {
                // Cleanup
                _pendingScans.TryRemove(slot, out _);
                cts.Dispose();
            }
        }, CancellationToken.None);
    }

    /// <summary>
    /// Cancels all pending scan requests.
    /// </summary>
    public void CancelAll()
    {
        foreach (var slot in _pendingScans.Keys)
        {
            if (_pendingScans.TryRemove(slot, out var cts))
            {
                cts.Cancel();
                cts.Dispose();
            }
        }
    }
}
