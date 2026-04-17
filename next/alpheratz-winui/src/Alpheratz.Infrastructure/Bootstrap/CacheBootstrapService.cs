using Alpheratz.Contracts.Infrastructure;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Bootstrap;

/// <summary>
/// Prepares and maintains the application cache (thumbnails, etc.) on startup.
/// </summary>
public class CacheBootstrapService
{
    private readonly IPathLayoutService _pathLayout;
    private readonly ILoggingFacade _logger;

    public CacheBootstrapService(IPathLayoutService pathLayout, ILoggingFacade logger)
    {
        _pathLayout = pathLayout;
        _logger = logger;
    }

    /// <summary>
    /// Performs cache maintenance on startup.
    /// </summary>
    public Task InitializeAsync()
    {
        _logger.Info("Bootstrap", "Cache", "Initializing cache directories.");
        
        // Ensure cache directory exists
        Directory.CreateDirectory(_pathLayout.ThumbnailCacheDirectory);

        // Optional: Clean up old or temporary cache files
        // CleanUpOrphanedThumbnails();

        return Task.CompletedTask;
    }
}
