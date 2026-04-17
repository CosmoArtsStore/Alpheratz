using System.Data;

namespace Alpheratz.Contracts.Infrastructure;

/// <summary>
/// Factory interface for creating SQLite database connections.
/// </summary>
public interface ISqliteConnectionFactory
{
    /// <summary>
    /// Creates and returns a new database connection.
    /// The caller is responsible for disposing the connection.
    /// </summary>
    IDbConnection CreateConnection();
}
