using Alpheratz.Contracts.Infrastructure;
using Dapper;
using System;
using System.Data;

namespace Alpheratz.Infrastructure.Database;

/// <summary>
/// Handles creation and versioning of the application's SQLite database schema.
/// Follows Design Doc Section 8.4 / 1058.
/// </summary>
public class SqliteSchemaMigrator
{
    private readonly SqliteConnectionFactory _connectionFactory;
    private readonly ILoggingFacade _logger;

    public SqliteSchemaMigrator(SqliteConnectionFactory connectionFactory, ILoggingFacade logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    /// <summary>
    /// Executes the full schema creation script.
    /// Uses 'IF NOT EXISTS' for idempotency during startup.
    /// </summary>
    public void Migrate()
    {
        _logger.Info("DB", "Migrate", "Starting SQLite schema migration.");

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            connection.Open();

            connection.Execute(GetSchemaScript());

            _logger.Info("DB", "Migrate", "SQLite schema migration completed successfully.");
        }
        catch (Exception ex)
        {
            _logger.Error("DB", "Migrate", "CRITICAL: SQLite schema migration failed.", ex);
            throw; // This is a fatal startup error
        }
    }

    /// <summary>
    /// Executes the full schema creation script asynchronously.
    /// </summary>
    public async Task MigrateAsync()
    {
        _logger.Info("DB", "MigrateAsync", "Starting SQLite schema migration (Async).");

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            if (connection.State != ConnectionState.Open)
            {
                await ((System.Data.Common.DbConnection)connection).OpenAsync();
            }

            await connection.ExecuteAsync(GetSchemaScript());

            _logger.Info("DB", "MigrateAsync", "SQLite schema migration completed successfully.");
        }
        catch (Exception ex)
        {
            _logger.Error("DB", "MigrateAsync", "CRITICAL: SQLite schema migration failed.", ex);
            throw; // This is a fatal startup error
        }
    }

    private string GetSchemaScript()
    {
        return @"
                -- Main Photo Library Table
                CREATE TABLE IF NOT EXISTS photos (
                    identity        TEXT PRIMARY KEY,
                    filename        TEXT NOT NULL,
                    world_id        TEXT,
                    world_name      TEXT,
                    timestamp       TEXT NOT NULL,
                    memo            TEXT DEFAULT '',
                    phash           TEXT,
                    phash_version   INTEGER DEFAULT 1,
                    orientation     TEXT,
                    width           INTEGER,
                    height          INTEGER,
                    source_slot     INTEGER DEFAULT 1,
                    is_favorite     INTEGER DEFAULT 0,
                    is_missing      INTEGER DEFAULT 0
                );

                -- Master Tag Dictionary
                CREATE TABLE IF NOT EXISTS tag_master (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    name            TEXT NOT NULL UNIQUE
                );

                -- Photo to Tag Association (Join Table)
                CREATE TABLE IF NOT EXISTS photo_tags (
                    photo_identity  TEXT NOT NULL,
                    tag_id          INTEGER NOT NULL,
                    PRIMARY KEY (photo_identity, tag_id),
                    FOREIGN KEY (photo_identity) REFERENCES photos(identity) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tag_master(id) ON DELETE CASCADE
                );

                -- World Visit Archive (Archived via VRChat Log / Polaris Log)
                CREATE TABLE IF NOT EXISTS world_visits (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    world_id        TEXT,
                    world_name      TEXT NOT NULL,
                    join_time       TEXT NOT NULL,
                    instance_id     TEXT,
                    source_log_name TEXT
                );

                -- SNS Sharing Templates
                CREATE TABLE IF NOT EXISTS tweet_templates (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    content         TEXT NOT NULL,
                    is_active       INTEGER DEFAULT 0
                );

                -- Perceptual similarity candidate cache
                CREATE TABLE IF NOT EXISTS similar_world_candidates (
                    photo_identity      TEXT NOT NULL,
                    candidate_identity  TEXT NOT NULL,
                    distance            INTEGER NOT NULL,
                    world_id            TEXT,
                    world_name          TEXT,
                    PRIMARY KEY (photo_identity, candidate_identity),
                    FOREIGN KEY (photo_identity) REFERENCES photos(identity) ON DELETE CASCADE
                );

                -- Indices for high-performance gallery filtering
                CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON photos(timestamp);
                CREATE INDEX IF NOT EXISTS idx_photos_world_name ON photos(world_name);
                CREATE INDEX IF NOT EXISTS idx_photos_is_favorite ON photos(is_favorite);
                CREATE INDEX IF NOT EXISTS idx_photos_phash ON photos(phash);
                CREATE INDEX IF NOT EXISTS idx_world_visits_join_time ON world_visits(join_time);
            ";
    }
}
