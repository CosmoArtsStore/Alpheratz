using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using Dapper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Repositories;

/// <summary>
/// SQLite implementation for modifying photo record data.
/// Follows Design Doc Section 8.5 / 1289.
/// </summary>
public class SqlitePhotoMutationRepository : IPhotoMutationRepository
{
    private readonly ISqliteConnectionFactory _connectionFactory;

    public SqlitePhotoMutationRepository(ISqliteConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    /// <inheritdoc/>
    public async Task BulkUpsertPhotosAsync(IEnumerable<Photo> photos)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            const string sql = @"
                INSERT OR REPLACE INTO photos (
                    identity, filename, world_id, world_name, timestamp, memo, 
                    phash, phash_version, orientation, width, height, source_slot, 
                    is_favorite, is_missing
                ) VALUES (
                    @Identity, @Filename, @WorldId, @WorldName, @Timestamp, @Memo, 
                    @PdqHash, @PdqVersion, @Orientation, @Width, @Height, @SourceSlot, 
                    @IsFavorite, @IsMissing
                )";

            var parameters = photos.Select(p => new
            {
                Identity = p.Identity.Value,
                Filename = p.Filename,
                WorldId = p.World?.WorldId,
                WorldName = p.World?.WorldName,
                Timestamp = p.Timestamp.Value,
                Memo = p.Memo ?? string.Empty,
                PdqHash = p.PdqHash,
                PdqVersion = p.PdqVersion,
                Orientation = p.Orientation ?? "Normal",
                Width = p.Width,
                Height = p.Height,
                SourceSlot = (int)p.SourceSlot.Value,
                IsFavorite = p.IsFavorite ? 1 : 0,
                IsMissing = p.IsMissing ? 1 : 0
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
    public async Task UpdateMemoAsync(PhotoIdentity identity, string memo)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync("UPDATE photos SET memo = @Memo WHERE identity = @Id", 
            new { Memo = memo, Id = identity.Value });
    }

    /// <inheritdoc/>
    public async Task UpdateFavoriteAsync(PhotoIdentity identity, bool favorite)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync("UPDATE photos SET is_favorite = @Fav WHERE identity = @Id", 
            new { Fav = favorite ? 1 : 0, Id = identity.Value });
    }

    /// <inheritdoc/>
    public async Task BulkUpdateFavoriteAsync(IEnumerable<PhotoIdentity> identities, bool favorite)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
            const string sql = "UPDATE photos SET is_favorite = @Fav WHERE identity = @Id";
            var parameters = identities.Select(id => new { Fav = favorite ? 1 : 0, Id = id.Value });
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
    public async Task UpdateWorldMatchAsync(PhotoIdentity identity, WorldIdentity worldIdentity, MatchSource matchSource)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(@"
            UPDATE photos 
            SET world_id = @WorldId, world_name = @WorldName 
            WHERE identity = @Id", 
            new { WorldId = worldIdentity.WorldId, WorldName = worldIdentity.WorldName, Id = identity.Value });
    }

    /// <inheritdoc/>
    public async Task UpdateIsMissingAsync(PhotoIdentity identity, bool isMissing)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync("UPDATE photos SET is_missing = @Missing WHERE identity = @Id", 
            new { Missing = isMissing ? 1 : 0, Id = identity.Value });
    }

    /// <inheritdoc/>
    public async Task ResetSlotAsync(SourceSlot slot)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync("DELETE FROM photos WHERE source_slot = @Slot", new { Slot = (int)slot.Value });
    }

    /// <inheritdoc/>
    public async Task DeletePhotoAsync(PhotoIdentity identity)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
            // Remove tags first to preserve referential integrity
            await connection.ExecuteAsync(
                "DELETE FROM photo_tags WHERE photo_identity = @Id",
                new { Id = identity.Value }, transaction);

            await connection.ExecuteAsync(
                "DELETE FROM photos WHERE identity = @Id",
                new { Id = identity.Value }, transaction);

            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }
}
