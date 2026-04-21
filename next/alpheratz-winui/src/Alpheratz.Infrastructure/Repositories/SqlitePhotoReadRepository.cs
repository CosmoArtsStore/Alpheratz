using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using Alpheratz.Domain.Queries;
using Dapper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Repositories;

/// <summary>
/// SQLite implementation for high-performance read-only photo data retrieval.
/// Follows Design Doc Section 8.5 / 1269.
/// </summary>
public class SqlitePhotoReadRepository : IPhotoReadRepository
{
    private readonly ISqliteConnectionFactory _connectionFactory;

    public SqlitePhotoReadRepository(ISqliteConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    /// <inheritdoc/>
    public async Task<PhotoDetail?> GetPhotoDetailAsync(PhotoIdentity identity)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        // Match schema: identity, filename, world_id, world_name, timestamp, memo, phash, phash_version, orientation, width, height, source_slot, is_favorite, is_missing
        // Map phash -> PdqHash, phash_version -> PdqVersion
        const string sql = @"
            SELECT identity, filename, world_id, world_name, timestamp, memo, 
                   phash AS PdqHash, phash_version AS PdqVersion, 
                   orientation, width, height, source_slot, is_favorite, is_missing
            FROM photos WHERE identity = @Id";

        var photo = await connection.QuerySingleOrDefaultAsync<Photo>(sql, new { Id = identity.Value });
        if (photo == null) return null;

        var sqlTags = @"
            SELECT tm.name 
            FROM tag_master tm
            JOIN photo_tags pt ON tm.id = pt.tag_id
            WHERE pt.photo_identity = @Id";
            
        var tagNames = await connection.QueryAsync<string>(sqlTags, new { Id = identity.Value });
        var tags = tagNames.Select(n => new TagName(n)).ToList();

        return new PhotoDetail(photo, tags);
    }

    /// <inheritdoc/>
    public async Task<Photo?> FindByIdentityAsync(PhotoIdentity identity)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            SELECT identity, filename, world_id, world_name, timestamp, memo, 
                   phash AS PdqHash, phash_version AS PdqVersion, 
                   orientation, width, height, source_slot, is_favorite, is_missing
            FROM photos WHERE identity = @Id";

        return await connection.QuerySingleOrDefaultAsync<Photo>(sql, new { Id = identity.Value });
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Photo>> GetPhotosPageAsync(GalleryQuery query, int pageIndex, int pageSize)
    {
        return await GetPhotosChunkAsync(query, pageIndex * pageSize, pageSize);
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Photo>> GetPhotosChunkAsync(GalleryQuery query, int offset, int count)
    {
        using var connection = _connectionFactory.CreateConnection();
        var (whereClause, parameters) = BuildFilterQuery(query);
        var orderBy = BuildSortOrder(query.SortOrder);

        var sql = $@"
            SELECT identity, filename, world_id, world_name, timestamp, memo, 
                   phash AS PdqHash, phash_version AS PdqVersion, 
                   orientation, width, height, source_slot, is_favorite, is_missing
            FROM photos 
            {whereClause} 
            ORDER BY {orderBy} 
            LIMIT @Count OFFSET @Offset";

        parameters.Add("Count", count);
        parameters.Add("Offset", offset);

        return await connection.QueryAsync<Photo>(sql, parameters);
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Photo>> GetWorldGroupedPhotosAsync(GalleryQuery query)
    {
        using var connection = _connectionFactory.CreateConnection();
        var (whereClause, parameters) = BuildFilterQuery(query);

        var sql = $@"
            SELECT identity, filename, world_id, world_name, timestamp, memo, 
                   phash AS PdqHash, phash_version AS PdqVersion, 
                   orientation, width, height, source_slot, is_favorite, is_missing
            FROM photos 
            {whereClause} 
            GROUP BY world_name 
            ORDER BY timestamp DESC";

        return await connection.QueryAsync<Photo>(sql, parameters);
    }

    /// <inheritdoc/>
    public async Task<int> GetTotalCountAsync(GalleryQuery query)
    {
        using var connection = _connectionFactory.CreateConnection();
        var (whereClause, parameters) = BuildFilterQuery(query);

        var sql = $"SELECT COUNT(*) FROM photos {whereClause}";
        return await connection.ExecuteScalarAsync<int>(sql, parameters);
    }

    /// <inheritdoc/>
    public async Task<int> GetPhotoCountAsync(SourceSlot slot)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM photos WHERE source_slot = @Slot AND is_missing = 0",
            new { Slot = slot.Value });
    }

    /// <inheritdoc/>
    public async Task<int> GetWorldVisitCountAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM world_visits");
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<string>> GetUniqueWorldNamesAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<string>(@"
            SELECT DISTINCT world_name 
            FROM photos 
            WHERE world_name IS NOT NULL AND world_name <> '' 
            ORDER BY world_name ASC");
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<DuplicateGroup>> GetDuplicateGroupsAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        
        const string groupSql = @"
            SELECT phash FROM photos 
            WHERE phash IS NOT NULL AND is_missing = 0
            GROUP BY phash HAVING COUNT(*) > 1";
            
        var hashes = await connection.QueryAsync<string>(groupSql);
        
        var results = new List<DuplicateGroup>();
        foreach (var hash in hashes)
        {
            const string photoSql = @"
                SELECT identity, filename, world_id, world_name, timestamp, memo, 
                       phash AS PdqHash, phash_version AS PdqVersion, 
                       orientation, width, height, source_slot, is_favorite, is_missing
                FROM photos WHERE phash = @Hash AND is_missing = 0";
            var photos = await connection.QueryAsync<Photo>(photoSql, new { Hash = hash });
            
            results.Add(new DuplicateGroup(hash, photos.ToList()));
        }
        
        return results;
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<SimilarWorldCandidate>> GetSimilarWorldCandidatesAsync(PhotoIdentity identity)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        var targetHash = await connection.ExecuteScalarAsync<string>(
            "SELECT phash FROM photos WHERE identity = @Id", new { Id = identity.Value });
            
        if (string.IsNullOrEmpty(targetHash)) return Enumerable.Empty<SimilarWorldCandidate>();

        // Find other photos with exact same hash but from known worlds, group by world to suggest candidates.
        const string sql = @"
            SELECT identity, world_id, world_name
            FROM photos 
            WHERE phash = @Hash AND world_name IS NOT NULL AND world_name <> '' AND identity <> @Id
            GROUP BY world_name";

        var rows = await connection.QueryAsync(sql, new { Hash = targetHash, Id = identity.Value });
        
        return rows.Select(r => new SimilarWorldCandidate(
            new PhotoIdentity((string)r.identity),
            0, // Exact hash match
            string.IsNullOrEmpty((string)r.world_id) ? WorldIdentity.Unknown() : WorldIdentity.Known((string)r.world_id, (string)r.world_name)
        ));
    }

    private (string WhereClause, DynamicParameters Parameters) BuildFilterQuery(GalleryQuery query)
    {
        var sb = new StringBuilder(" WHERE is_missing = 0 ");
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.SearchText))
        {
            sb.Append(" AND (filename LIKE @Search OR world_name LIKE @Search OR memo LIKE @Search) ");
            parameters.Add("Search", $"%{query.SearchText}%");
        }

        if (!string.IsNullOrWhiteSpace(query.WorldName))
        {
            sb.Append(" AND world_name = @WorldName ");
            parameters.Add("WorldName", query.WorldName);
        }

        if (query.IsFavorite.HasValue)
        {
            sb.Append(" AND is_favorite = @IsFavorite ");
            parameters.Add("IsFavorite", query.IsFavorite.Value ? 1 : 0);
        }

        if (!string.IsNullOrEmpty(query.SourceSlot))
        {
            if (int.TryParse(query.SourceSlot, out var slotInt))
            {
                sb.Append(" AND source_slot = @Slot ");
                parameters.Add("Slot", slotInt);
            }
        }

        if (query.Tags != null && query.Tags.Any())
        {
            foreach (var tag in query.Tags)
            {
                var tagParam = "Tag_" + parameters.ParameterNames.Count();
                sb.Append($@" AND identity IN (
                    SELECT pt.photo_identity 
                    FROM photo_tags pt 
                    JOIN tag_master tm ON pt.tag_id = tm.id 
                    WHERE tm.name = @{tagParam}) ");
                parameters.Add(tagParam, tag);
            }
        }

        if (query.DateRange.HasValue)
        {
            if (query.DateRange.Value.Start.HasValue)
            {
                sb.Append(" AND timestamp >= @Start ");
                parameters.Add("Start", query.DateRange.Value.Start.Value.ToString("yyyy-MM-dd HH:mm:ss"));
            }
            if (query.DateRange.Value.End.HasValue)
            {
                sb.Append(" AND timestamp <= @End ");
                parameters.Add("End", query.DateRange.Value.End.Value.ToString("yyyy-MM-dd HH:mm:ss"));
            }
        }

        return (sb.ToString(), parameters);
    }

    private string BuildSortOrder(GallerySortOrder order)
    {
        return order switch
        {
            GallerySortOrder.NewestFirst => "timestamp DESC",
            GallerySortOrder.OldestFirst => "timestamp ASC",
            GallerySortOrder.PathAscending => "identity ASC",
            GallerySortOrder.PathDescending => "identity DESC",
            _ => "timestamp DESC"
        };
    }
}
