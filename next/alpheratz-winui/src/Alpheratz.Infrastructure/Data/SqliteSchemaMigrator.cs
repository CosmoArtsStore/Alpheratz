using Alpheratz.Contracts.Infrastructure;
using Dapper;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Data;

/// <summary>
/// Responsible for establishing and updating the SQLite database schema.
/// </summary>
public class SqliteSchemaMigrator
{
    private readonly ISqliteConnectionFactory _connectionFactory;
    private readonly ILoggingFacade _logger;

    public SqliteSchemaMigrator(ISqliteConnectionFactory connectionFactory, ILoggingFacade logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    /// <summary>
    /// Executes the schema migration.
    /// </summary>
    public async Task MigrateAsync()
    {
        _logger.Info("Database", "Migrate", "Starting database schema migration.");
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();

        using var transaction = connection.BeginTransaction();
        try
        {
            // Initial Table: Photos
            await connection.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS photos (
                    path TEXT PRIMARY KEY,
                    source_slot TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    is_missing INTEGER NOT NULL DEFAULT 0,
                    world_name TEXT,
                    timestamp TEXT NOT NULL,
                    is_favorite INTEGER NOT NULL DEFAULT 0,
                    memo TEXT NOT NULL DEFAULT '',
                    pdq_hash TEXT,
                    pdq_version INTEGER NOT NULL DEFAULT 0,
                    width INTEGER NOT NULL DEFAULT 0,
                    height INTEGER NOT NULL DEFAULT 0,
                    orientation TEXT NOT NULL DEFAULT 'Unknown'
                );", transaction: transaction);

            // Table: Tag Master
            await connection.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS tag_master (
                    name TEXT PRIMARY KEY
                );", transaction: transaction);

            // Table: Photo Tags
            await connection.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS photo_tags (
                    photo_path TEXT NOT NULL,
                    tag_name TEXT NOT NULL,
                    PRIMARY KEY (photo_path, tag_name),
                    FOREIGN KEY (photo_path) REFERENCES photos(path) ON DELETE CASCADE,
                    FOREIGN KEY (tag_name) REFERENCES tag_master(name) ON DELETE CASCADE
                );", transaction: transaction);

            // Table: World Visits (Historical Logs)
            await connection.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS world_visits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    world_name TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                );", transaction: transaction);

            // Table: Similar World Candidates
            await connection.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS similar_worlds (
                    target_photo_path TEXT NOT NULL,
                    world_name TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    source_photo_path TEXT NOT NULL,
                    PRIMARY KEY (target_photo_path, world_name),
                    FOREIGN KEY (target_photo_path) REFERENCES photos(path) ON DELETE CASCADE
                );", transaction: transaction);

            // Table: Tweet Templates
            await connection.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS tweet_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    content TEXT NOT NULL
                );", transaction: transaction);

            // Indices for performance
            await connection.ExecuteAsync("CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON photos(timestamp);", transaction: transaction);
            await connection.ExecuteAsync("CREATE INDEX IF NOT EXISTS idx_photos_source_slot ON photos(source_slot);", transaction: transaction);
            await connection.ExecuteAsync("CREATE INDEX IF NOT EXISTS idx_photo_tags_tag ON photo_tags(tag_name);", transaction: transaction);

            transaction.Commit();
            _logger.Info("Database", "Migrate", "Database schema migration completed successfully.");
        }
        catch (System.Exception ex)
        {
            transaction.Rollback();
            _logger.Error("Database", "Migrate", "Failed to migrate database schema.", ex);
            throw;
        }
    }
}
