using Alpheratz.Contracts.Interfaces;
using Alpheratz.Contracts.Infrastructure;
using Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Resolves world names by looking up historical logs in the database.
/// Used to complete missing world names for older photos.
/// </summary>
public class StellaRecordWorldResolver
{
    private readonly ISqliteConnectionFactory _connectionFactory;

    public StellaRecordWorldResolver(ISqliteConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    /// <summary>
    /// Finds the world name that was active at the given timestamp.
    /// </summary>
    /// <param name="timestamp">The ISO timestamp of the photo.</param>
    /// <returns>The world name if found, otherwise null.</returns>
    public async Task<string?> ResolveWorldAsync(string timestamp)
    {
        using var connection = _connectionFactory.CreateConnection();
        // Look for the most recent world visit that occurred before or at the photo timestamp
        return await connection.QuerySingleOrDefaultAsync<string>(@"
            SELECT world_name 
            FROM world_visits 
            WHERE timestamp <= @Timestamp 
            ORDER BY timestamp DESC 
            LIMIT 1", new { Timestamp = timestamp });
    }
}
