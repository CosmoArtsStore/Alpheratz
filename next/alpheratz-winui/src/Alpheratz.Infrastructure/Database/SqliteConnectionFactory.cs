using System.Data;
using Microsoft.Data.Sqlite;
using Alpheratz.Contracts.Repositories;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;

namespace Alpheratz.Infrastructure.Database;

public class SqliteConnectionFactory
{
    private readonly string _connectionString;

    public SqliteConnectionFactory(string dbPath)
    {
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Shared
        }.ToString();
    }

    public IDbConnection CreateConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();
        
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;";
        cmd.ExecuteNonQuery();

        return connection;
    }
}
