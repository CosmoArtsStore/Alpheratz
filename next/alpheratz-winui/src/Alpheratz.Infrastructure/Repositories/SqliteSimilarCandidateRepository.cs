using Alpheratz.Contracts.Repositories;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using Alpheratz.Contracts.Infrastructure;
using Dapper;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Repositories;

/// <summary>
/// SQLite implementation for managing visual similarity candidates.
/// Optimized for quick world name inference.
/// </summary>
public class SqliteSimilarCandidateRepository : ISimilarCandidateRepository
{
    private readonly ISqliteConnectionFactory _connectionFactory;

    public SqliteSimilarCandidateRepository(ISqliteConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<SimilarWorldCandidate>> GetCandidatesForPhotoAsync(PhotoIdentity photo)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        // Match schema: photo_identity, candidate_identity, distance, world_id, world_name
        const string sql = @"
            SELECT candidate_identity, distance, world_id, world_name
            FROM similar_world_candidates 
            WHERE photo_identity = @Id 
            ORDER BY distance ASC";

        var rows = await connection.QueryAsync(sql, new { Id = photo.Value });
        
        return rows.Select(r => new SimilarWorldCandidate(
            new PhotoIdentity((string)r.candidate_identity),
            (int)(long)r.distance,
            string.IsNullOrEmpty((string)r.world_id) ? WorldIdentity.Unknown() : WorldIdentity.Known((string)r.world_id, (string)r.world_name)
        ));
    }

    /// <inheritdoc/>
    public async Task SaveCandidatesForPhotoAsync(PhotoIdentity photo, IEnumerable<SimilarWorldCandidate> candidates)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
            await connection.ExecuteAsync(
                "DELETE FROM similar_world_candidates WHERE photo_identity = @Id", 
                new { Id = photo.Value }, transaction);

            const string sql = @"
                INSERT INTO similar_world_candidates (
                    photo_identity, candidate_identity, distance, world_id, world_name
                ) VALUES (
                    @Id, @CandidateId, @Distance, @WorldId, @WorldName
                )";

            var parameters = candidates.Select(c => new
            {
                Id = photo.Value,
                CandidateId = c.CandidateIdentity.Value,
                Distance = c.Distance,
                WorldId = c.World.WorldId,
                WorldName = c.World.WorldName
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
    public async Task InvalidateCandidatesForPhotoAsync(PhotoIdentity photo)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            "DELETE FROM similar_world_candidates WHERE photo_identity = @Id", 
            new { Id = photo.Value });
    }
}
