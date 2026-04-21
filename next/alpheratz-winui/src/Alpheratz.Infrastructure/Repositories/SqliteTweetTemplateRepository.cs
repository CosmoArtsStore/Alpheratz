using Alpheratz.Contracts.Repositories;
using Alpheratz.Domain.Entities;
using Alpheratz.Contracts.Infrastructure;
using Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Infrastructure.Repositories;

/// <summary>
/// SQLite implementation for managing SNS sharing text templates.
/// </summary>
public class SqliteTweetTemplateRepository : ITweetTemplateRepository
{
    private readonly ISqliteConnectionFactory _connectionFactory;

    public SqliteTweetTemplateRepository(ISqliteConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<TweetTemplate>> GetAllTemplatesAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<TweetTemplate>(
            "SELECT id, content AS TemplateText, is_active AS IsActive FROM tweet_templates ORDER BY id ASC");
    }

    /// <inheritdoc/>
    public async Task<int> UpsertTemplateAsync(TweetTemplate template)
    {
        using var connection = _connectionFactory.CreateConnection();
        if (template.Id == 0)
        {
            return await connection.ExecuteScalarAsync<int>(
                "INSERT INTO tweet_templates (content, is_active) VALUES (@Content, @IsActive); SELECT last_insert_rowid();",
                new { Content = template.TemplateText, IsActive = template.IsActive ? 1 : 0 });
        }
        else
        {
            await connection.ExecuteAsync(
                "UPDATE tweet_templates SET content = @Content, is_active = @IsActive WHERE id = @Id",
                new { Content = template.TemplateText, IsActive = template.IsActive ? 1 : 0, Id = template.Id });
            return template.Id;
        }
    }

    /// <inheritdoc/>
    public async Task DeleteTemplateAsync(int templateId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync("DELETE FROM tweet_templates WHERE id = @Id", new { Id = templateId });
    }

    /// <inheritdoc/>
    public async Task SetActiveTemplateAsync(int templateId)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
            await connection.ExecuteAsync("UPDATE tweet_templates SET is_active = 0", null, transaction);
            await connection.ExecuteAsync("UPDATE tweet_templates SET is_active = 1 WHERE id = @Id", new { Id = templateId }, transaction);
            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<TweetTemplate?> GetActiveTemplateAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<TweetTemplate>(
            "SELECT id, content AS TemplateText, is_active AS IsActive FROM tweet_templates WHERE is_active = 1 LIMIT 1");
    }
}
