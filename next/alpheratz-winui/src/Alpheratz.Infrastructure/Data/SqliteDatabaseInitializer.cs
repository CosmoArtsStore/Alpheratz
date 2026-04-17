using Alpheratz.Contracts.Data;
using Microsoft.Data.Sqlite;

namespace Alpheratz.Infrastructure.Data;

public sealed class SqliteDatabaseInitializer : ISqliteDatabaseInitializer
{
    public string InitializeDatabase()
    {
        var databaseDirectoryPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Alpheratz",
            "Database");
        Directory.CreateDirectory(databaseDirectoryPath);

        var databasePath = Path.Combine(databaseDirectoryPath, "alpheratz.db");
        using var connection = new SqliteConnection($"Data Source={databasePath}");
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText =
            """
            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """;
        command.ExecuteNonQuery();

        return databasePath;
    }
}
