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
    public async Task<IEnumerable<TweetTemplate>> GetTemplatesAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<TweetTemplate>(
            "SELECT id, content, is_active FROM tweet_templates ORDER BY id ASC");
    }

    /// <inheritdoc/>
    public async Task SaveTemplateAsync(TweetTemplate template)
    {
        using var connection = _connectionFactory.CreateConnection();
        if (template.Id == 0)
        {
            await connection.ExecuteAsync(
                "INSERT INTO tweet_templates (content, is_active) VALUES (@Content, @IsActive)",
                new { Content = template.Content, IsActive = template.IsActive ? 1 : 0 });
        }
        else
        {
            await connection.ExecuteAsync(
                "UPDATE tweet_templates SET content = @Content, is_active = @IsActive WHERE id = @Id",
                new { Content = template.Content, IsActive = template.IsActive ? 1 : 0, Id = template.Id });
        }
    }

    /// <inheritdoc/>
    public async Task DeleteTemplateAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync("DELETE FROM tweet_templates WHERE id = @Id", new { Id = id });
    }

    /// <inheritdoc/>
    public async Task SetActiveTemplateAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
            await connection.ExecuteAsync("UPDATE tweet_templates SET is_active = 0", null, transaction);
            await connection.ExecuteAsync("UPDATE tweet_templates SET is_active = 1 WHERE id = @Id", new { Id = id }, transaction);
            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }
}
