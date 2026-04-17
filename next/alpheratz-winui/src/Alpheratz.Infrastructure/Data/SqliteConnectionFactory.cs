using Alpheratz.Contracts.Infrastructure;
using Microsoft.Data.Sqlite;
using System.Data;

namespace Alpheratz.Infrastructure.Data;

/// <summary>
/// Factory for creating SQLite database connections with standard configurations.
/// </summary>
public class SqliteConnectionFactory : ISqliteConnectionFactory
{
    private readonly string _connectionString;

    public SqliteConnectionFactory(IPathLayoutService pathLayout)
    {
        var builder = new SqliteConnectionStringBuilder
        {
            DataSource = pathLayout.DatabasePath,
            Cache = SqliteCacheMode.Shared,
            Mode = SqliteOpenMode.ReadWriteCreate
        };
        _connectionString = builder.ToString();
    }

    /// <inheritdoc/>
    public IDbConnection CreateConnection()
    {
        return new SqliteConnection(_connectionString);
    }
}
