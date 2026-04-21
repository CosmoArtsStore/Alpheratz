using Alpheratz.Contracts.Repositories;
using Alpheratz.Domain.Entities;
using Alpheratz.Contracts.Infrastructure;
using Dapper;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Repositories;

/// <summary>
/// SQLite implementation for archiving and querying VRChat world join events.
/// Follows Design Doc Section 8.5 / 1292.
/// </summary>
public class SqliteWorldVisitRepository : IWorldVisitRepository
{
    private readonly ISqliteConnectionFactory _connectionFactory;

    public SqliteWorldVisitRepository(ISqliteConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<WorldVisit>> GetLatestVisitsAsync(int count)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<WorldVisit>(
            "SELECT world_id AS WorldId, world_name AS WorldName, join_time AS Timestamp, instance_id AS InstanceId, source_log_name AS SourceLogName FROM world_visits ORDER BY join_time DESC LIMIT @Count",
            new { Count = count });
    }

    /// <inheritdoc/>
    public async Task BatchUpsertVisitsAsync(IEnumerable<WorldVisit> visits)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
            const string sql = @"
                INSERT INTO world_visits (world_id, world_name, join_time, instance_id, source_log_name)
                SELECT @WorldId, @WorldName, @JoinTime, @InstanceId, @SourceLogName
                WHERE NOT EXISTS (
                    SELECT 1 FROM world_visits 
                    WHERE join_time = @JoinTime AND world_id = @WorldId
                )";

            var parameters = visits.Select(v => new
            {
                WorldId = v.WorldId,
                WorldName = v.WorldName,
                JoinTime = v.Timestamp.ToString("yyyy-MM-dd HH:mm:ss"),
                InstanceId = v.InstanceId,
                SourceLogName = v.SourceLogName
            });

            await connection.ExecuteAsync(sql, parameters, transaction);
            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<WorldVisit?> FindVisitAtTimeAsync(DateTime timestamp)
    {
        using var connection = _connectionFactory.CreateConnection();
        var timeStr = timestamp.ToString("yyyy-MM-dd HH:mm:ss");
        
        return await connection.QueryFirstOrDefaultAsync<WorldVisit>(
            "SELECT world_id AS WorldId, world_name AS WorldName, join_time AS Timestamp, instance_id AS InstanceId, source_log_name AS SourceLogName FROM world_visits WHERE join_time <= @Time ORDER BY join_time DESC LIMIT 1",
            new { Time = timeStr });
    }
}
