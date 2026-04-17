using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Infrastructure.Database;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Bootstrap;

/// <summary>
/// Handles the initialization and migration of the application database.
/// </summary>
public class DatabaseBootstrapService
{
    private readonly SqliteSchemaMigrator _migrator;
    private readonly ILoggingFacade _logger;

    public DatabaseBootstrapService(SqliteSchemaMigrator migrator, ILoggingFacade logger)
    {
        _migrator = migrator;
        _logger = logger;
    }

    /// <summary>
    /// Initializes the database on startup.
    /// </summary>
    public async Task InitializeAsync()
    {
        _logger.Info("Bootstrap", "Database", "Initializing database.");
        await _migrator.MigrateAsync();
    }
}
