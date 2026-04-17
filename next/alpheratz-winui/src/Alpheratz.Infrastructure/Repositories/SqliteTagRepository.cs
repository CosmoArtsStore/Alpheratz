using Alpheratz.Contracts.Repositories;
using Alpheratz.Domain.ValueObjects;
using Alpheratz.Contracts.Infrastructure;
using Dapper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Repositories;

/// <summary>
/// SQLite implementation for managing the master tag list and its associations with photos.
/// Follows Design Doc Section 8.5 / 1302.
/// </summary>
public class SqliteTagRepository : ITagRepository
{
    private readonly ISqliteConnectionFactory _connectionFactory;

    public SqliteTagRepository(ISqliteConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<TagName>> GetTagMasterAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var results = await connection.QueryAsync<string>("SELECT name FROM tag_master ORDER BY name ASC");
        return results.Select(r => new TagName(r));
    }

    /// <inheritdoc/>
    public async Task CreateTagMasterAsync(TagName tag)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync("INSERT OR IGNORE INTO tag_master (name) VALUES (@Name)", new { Name = tag.Value });
    }

    /// <inheritdoc/>
    public async Task DeleteTagMasterAsync(TagName tag)
    {
        using var connection = _connectionFactory.CreateConnection();
        // Constraints in DB handle cascading deletion of photo_tags
        await connection.ExecuteAsync("DELETE FROM tag_master WHERE name = @Name", new { Name = tag.Value });
    }

    /// <inheritdoc/>
    public async Task RenameTagMasterAsync(TagName oldName, TagName newName)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            "UPDATE tag_master SET name = @NewName WHERE name = @OldName",
            new { NewName = newName.Value, OldName = oldName.Value });
    }
    
    /// <inheritdoc/>
    public async Task AddPhotoTagAsync(PhotoIdentity photo, TagName tag)
    {
        await BulkAddPhotoTagsAsync(new[] { photo }, new[] { tag });
    }

    /// <inheritdoc/>
    public async Task RemovePhotoTagAsync(PhotoIdentity photo, TagName tag)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            DELETE FROM photo_tags 
            WHERE photo_identity = @Id 
            AND tag_id = (SELECT id FROM tag_master WHERE name = @Name)";
            
        await connection.ExecuteAsync(sql, new { Id = photo.Value, Name = tag.Value });
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<TagName>> GetTagsForPhotoAsync(PhotoIdentity photo)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            SELECT tm.name 
            FROM tag_master tm
            JOIN photo_tags pt ON tm.id = pt.tag_id
            WHERE pt.photo_identity = @Id";
        var results = await connection.QueryAsync<string>(sql, new { Id = photo.Value });
        return results.Select(r => new TagName(r));
    }

    /// <inheritdoc/>
    public async Task BulkAddPhotoTagsAsync(IEnumerable<PhotoIdentity> photos, IEnumerable<TagName> tags)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
            foreach (var tag in tags)
            {
                // Ensure master record exists
                await connection.ExecuteAsync(
                    "INSERT OR IGNORE INTO tag_master (name) VALUES (@Name)", 
                    new { Name = tag.Value }, transaction);

                // Fetch internal ID
                var tagId = await connection.ExecuteScalarAsync<int>(
                    "SELECT id FROM tag_master WHERE name = @Name", 
                    new { Name = tag.Value }, transaction);

                foreach (var photo in photos)
                {
                    await connection.ExecuteAsync(
                        "INSERT OR IGNORE INTO photo_tags (photo_identity, tag_id) VALUES (@Id, @TagId)",
                        new { Id = photo.Value, TagId = tagId }, transaction);
                }
            }

            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }
}
